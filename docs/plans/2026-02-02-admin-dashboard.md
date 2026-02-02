# Admin Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a statistics dashboard showing generation metrics, popular components, queue status, and generation history chart.

**Architecture:** Repository pattern for stats queries, SWR hook for data fetching with auto-refresh, card-based UI components with a simple bar chart for generation history.

**Tech Stack:** Next.js App Router, better-sqlite3, Zustand, SWR, Tailwind + shadcn/ui

---

## Task 1: Stats Repository

**Files:**
- Create: `lib/repositories/stats.ts`

**Step 1: Create stats repository with type definitions**

```typescript
// lib/repositories/stats.ts
import { get_db } from "../db";

export type GenerationStats = {
  total: number;
  today: number;
  this_week: number;
  this_month: number;
  success_rate: number;
};

export type PopularComponent = {
  id: string;
  name: string;
  category_id: string;
  usage_count: number;
};

export type DailyGenerations = {
  date: string;
  count: number;
  success: number;
  failed: number;
};

export type QueueStats = {
  queued: number;
  processing: number;
  avg_wait_time: number | null;
};

export const get_generation_stats = (): GenerationStats => {
  const db = get_db();

  const total = (
    db.prepare("SELECT COUNT(*) as count FROM generations").get() as { count: number }
  ).count;

  const today = (
    db
      .prepare("SELECT COUNT(*) as count FROM generations WHERE date(created_at) = date('now')")
      .get() as { count: number }
  ).count;

  const this_week = (
    db
      .prepare("SELECT COUNT(*) as count FROM generations WHERE created_at >= date('now', '-7 days')")
      .get() as { count: number }
  ).count;

  const this_month = (
    db
      .prepare("SELECT COUNT(*) as count FROM generations WHERE created_at >= date('now', '-30 days')")
      .get() as { count: number }
  ).count;

  const success_count = (
    db
      .prepare("SELECT COUNT(*) as count FROM generations WHERE status = 'completed'")
      .get() as { count: number }
  ).count;

  const failed_count = (
    db.prepare("SELECT COUNT(*) as count FROM generations WHERE status = 'failed'").get() as {
      count: number;
    }
  ).count;

  const total_attempts = success_count + failed_count;
  const success_rate = total_attempts > 0 ? (success_count / total_attempts) * 100 : 100;

  return {
    total,
    today,
    this_week,
    this_month,
    success_rate: Math.round(success_rate * 10) / 10,
  };
};

export const get_popular_components = (limit = 10): PopularComponent[] => {
  const db = get_db();

  const rows = db
    .prepare(
      `
    SELECT
      c.id,
      c.name,
      c.category_id,
      COUNT(us.id) as usage_count
    FROM components c
    LEFT JOIN usage_stats us ON us.component_id = c.id
    GROUP BY c.id
    ORDER BY usage_count DESC
    LIMIT ?
  `
    )
    .all(limit) as PopularComponent[];

  return rows;
};

export const get_daily_generations = (days = 30): DailyGenerations[] => {
  const db = get_db();

  const rows = db
    .prepare(
      `
    WITH RECURSIVE dates(date) AS (
      SELECT date('now', '-' || ? || ' days')
      UNION ALL
      SELECT date(date, '+1 day')
      FROM dates
      WHERE date < date('now')
    )
    SELECT
      dates.date,
      COALESCE(SUM(CASE WHEN g.id IS NOT NULL THEN 1 ELSE 0 END), 0) as count,
      COALESCE(SUM(CASE WHEN g.status = 'completed' THEN 1 ELSE 0 END), 0) as success,
      COALESCE(SUM(CASE WHEN g.status = 'failed' THEN 1 ELSE 0 END), 0) as failed
    FROM dates
    LEFT JOIN generations g ON date(g.created_at) = dates.date
    GROUP BY dates.date
    ORDER BY dates.date ASC
  `
    )
    .all(days - 1) as DailyGenerations[];

  return rows;
};

export const get_queue_stats = (): QueueStats => {
  const db = get_db();

  const queued = (
    db.prepare("SELECT COUNT(*) as count FROM generation_queue WHERE status = 'queued'").get() as {
      count: number;
    }
  ).count;

  const processing = (
    db
      .prepare("SELECT COUNT(*) as count FROM generation_queue WHERE status = 'processing'")
      .get() as { count: number }
  ).count;

  const avg_wait = db
    .prepare(
      `
    SELECT AVG(
      (julianday(started_at) - julianday(created_at)) * 86400
    ) as avg_seconds
    FROM generation_queue
    WHERE status IN ('completed', 'failed')
    AND started_at IS NOT NULL
    AND created_at >= datetime('now', '-1 hour')
  `
    )
    .get() as { avg_seconds: number | null };

  return {
    queued,
    processing,
    avg_wait_time: avg_wait.avg_seconds ? Math.round(avg_wait.avg_seconds) : null,
  };
};

export const track_component_usage = (component_id: string): void => {
  const db = get_db();
  db.prepare(
    "INSERT INTO usage_stats (event_type, component_id, created_at) VALUES ('component_use', ?, datetime('now'))"
  ).run(component_id);
};
```

**Step 2: Verify repository compiles**

Run: `bunx tsc --noEmit lib/repositories/stats.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add lib/repositories/stats.ts
git commit -m "feat(admin): add stats repository with generation and queue queries"
```

---

## Task 2: Stats API Endpoint

**Files:**
- Create: `app/api/stats/route.ts`

**Step 1: Create API route**

```typescript
// app/api/stats/route.ts
import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import {
  get_generation_stats,
  get_popular_components,
  get_daily_generations,
  get_queue_stats,
} from "@/lib/repositories/stats";

export const GET = async () => {
  return with_auth(async () => {
    const stats = {
      generations: get_generation_stats(),
      popular_components: get_popular_components(10),
      daily_generations: get_daily_generations(30),
      queue: get_queue_stats(),
    };

    return NextResponse.json(stats);
  });
};
```

**Step 2: Test endpoint manually**

Run: `curl -b "auth_token=<your-token>" http://localhost:3000/api/stats | jq`
Expected: JSON with generations, popular_components, daily_generations, queue

**Step 3: Commit**

```bash
git add app/api/stats/route.ts
git commit -m "feat(admin): add /api/stats endpoint"
```

---

## Task 3: Stats Hook

**Files:**
- Create: `lib/hooks/use-stats.ts`

**Step 1: Create SWR hook**

```typescript
// lib/hooks/use-stats.ts
"use client";

import useSWR from "swr";

import type {
  GenerationStats,
  PopularComponent,
  DailyGenerations,
  QueueStats,
} from "@/lib/repositories/stats";

type StatsData = {
  generations: GenerationStats;
  popular_components: PopularComponent[];
  daily_generations: DailyGenerations[];
  queue: QueueStats;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const use_stats = () => {
  const { data, error, isLoading, mutate } = useSWR<StatsData>("/api/stats", fetcher, {
    refreshInterval: 30000,
  });

  return {
    stats: data,
    is_loading: isLoading,
    is_error: !!error,
    mutate,
  };
};
```

**Step 2: Commit**

```bash
git add lib/hooks/use-stats.ts
git commit -m "feat(admin): add use_stats SWR hook with 30s auto-refresh"
```

---

## Task 4: Stats Overview Component

**Files:**
- Create: `components/admin/stats-overview.tsx`

**Step 1: Create stats cards component**

```typescript
// components/admin/stats-overview.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, Calendar, Clock, CheckCircle } from "lucide-react";

import type { GenerationStats, QueueStats } from "@/lib/repositories/stats";

type StatsOverviewProps = {
  stats: GenerationStats;
  queue: QueueStats;
};

export const StatsOverview = ({ stats, queue }: StatsOverviewProps) => {
  const cards = [
    {
      title: "Total Generations",
      value: stats.total.toLocaleString(),
      icon: Image,
      description: `${stats.today} today`,
    },
    {
      title: "This Week",
      value: stats.this_week.toLocaleString(),
      icon: Calendar,
      description: "Last 7 days",
    },
    {
      title: "Success Rate",
      value: `${stats.success_rate}%`,
      icon: CheckCircle,
      description: "Completed generations",
    },
    {
      title: "Queue",
      value: `${queue.processing}/${queue.queued + queue.processing}`,
      icon: Clock,
      description: queue.avg_wait_time ? `~${queue.avg_wait_time}s avg wait` : "No wait time data",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/admin/stats-overview.tsx
git commit -m "feat(admin): add stats overview cards component"
```

---

## Task 5: Generation Chart Component

**Files:**
- Create: `components/admin/generation-chart.tsx`

**Step 1: Create bar chart component**

```typescript
// components/admin/generation-chart.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { DailyGenerations } from "@/lib/repositories/stats";

type GenerationChartProps = {
  data: DailyGenerations[];
};

export const GenerationChart = ({ data }: GenerationChartProps) => {
  const max_count = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generation History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end gap-1">
          {data.map((day) => {
            const height = (day.count / max_count) * 100;
            const success_height = day.count > 0 ? (day.success / day.count) * height : 0;
            const failed_height = height - success_height;

            return (
              <div key={day.date} className="flex-1 flex flex-col justify-end group relative">
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap">
                    <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                    <div>{day.count} total</div>
                    <div className="text-green-500">{day.success} success</div>
                    <div className="text-red-500">{day.failed} failed</div>
                  </div>
                </div>

                <div className="w-full flex flex-col">
                  {day.failed > 0 && (
                    <div
                      className="bg-red-500/50 rounded-t"
                      style={{ height: `${failed_height}%` }}
                    />
                  )}
                  {day.success > 0 && (
                    <div
                      className={`bg-primary ${day.failed === 0 ? "rounded-t" : ""}`}
                      style={{ height: `${success_height}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{data[0] ? new Date(data[0].date).toLocaleDateString() : ""}</span>
          <span>Today</span>
        </div>
      </CardContent>
    </Card>
  );
};
```

**Step 2: Commit**

```bash
git add components/admin/generation-chart.tsx
git commit -m "feat(admin): add generation history bar chart component"
```

---

## Task 6: Popular Components Component

**Files:**
- Create: `components/admin/popular-components.tsx`

**Step 1: Create popular components list**

```typescript
// components/admin/popular-components.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type { PopularComponent } from "@/lib/repositories/stats";

type PopularComponentsProps = {
  components: PopularComponent[];
};

const CATEGORY_LABELS: Record<string, string> = {
  characters: "Character",
  physical_traits: "Traits",
  jewelry: "Jewelry",
  wardrobe: "Wardrobe",
  wardrobe_tops: "Top",
  wardrobe_bottoms: "Bottom",
  wardrobe_footwear: "Footwear",
  poses: "Pose",
  scenes: "Scene",
  backgrounds: "Background",
  camera: "Camera",
  ban_lists: "Ban List",
};

export const PopularComponents = ({ components }: PopularComponentsProps) => {
  if (components.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Popular Components</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No usage data yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Components</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {components.map((component, index) => (
            <div key={component.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-6">#{index + 1}</span>
                <div>
                  <p className="font-medium">{component.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_LABELS[component.category_id] || component.category_id}
                  </Badge>
                </div>
              </div>
              <span className="text-muted-foreground">{component.usage_count} uses</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

**Step 2: Commit**

```bash
git add components/admin/popular-components.tsx
git commit -m "feat(admin): add popular components list"
```

---

## Task 7: Admin Dashboard Page

**Files:**
- Create: `app/(protected)/admin/page.tsx`

**Step 1: Create admin page**

```typescript
// app/(protected)/admin/page.tsx
"use client";

import { use_stats } from "@/lib/hooks/use-stats";
import { StatsOverview } from "@/components/admin/stats-overview";
import { PopularComponents } from "@/components/admin/popular-components";
import { GenerationChart } from "@/components/admin/generation-chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminPage() {
  const { stats, is_loading } = use_stats();

  if (is_loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/builder">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <div className="grid gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/builder">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <div className="grid gap-6">
        <StatsOverview stats={stats.generations} queue={stats.queue} />
        <GenerationChart data={stats.daily_generations} />
        <PopularComponents components={stats.popular_components} />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(protected\)/admin/page.tsx
git commit -m "feat(admin): add admin dashboard page"
```

---

## Task 8: Add Navigation Link

**Files:**
- Modify: `components/builder/builder-toolbar.tsx:10` (imports)
- Modify: `components/builder/builder-toolbar.tsx:133-138` (add admin link)

**Step 1: Add admin link to toolbar**

After the Library link (line 133-138), add:

```typescript
<Link href="/admin">
  <Button variant="ghost">
    <BarChart3 className="size-4 mr-2" />
    Dashboard
  </Button>
</Link>
```

And add `BarChart3` to the lucide-react import on line 10.

**Step 2: Test navigation**

Run: Start dev server, click Dashboard link
Expected: Navigate to /admin with stats displayed

**Step 3: Commit**

```bash
git add components/builder/builder-toolbar.tsx
git commit -m "feat(admin): add dashboard navigation link to toolbar"
```

---

## Task 9: Add Component Usage Tracking

**Files:**
- Modify: `lib/stores/builder-store.ts:5` (add import)
- Modify: `lib/stores/builder-store.ts:236-237` (add tracking call)

**Step 1: Add import at top of file**

```typescript
import { track_component_usage } from "@/lib/repositories/stats";
```

**Step 2: Add tracking in select_component action**

Inside the `select_component` function, after line 236 (`recompute_prompt();`), add:

```typescript
// Track usage for stats
if (component) {
  fetch("/api/stats/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ component_id: component.id }),
  }).catch(() => {
    // Silent fail - tracking is non-critical
  });
}
```

**Step 3: Create tracking API endpoint**

Create `app/api/stats/track/route.ts`:

```typescript
// app/api/stats/track/route.ts
import { NextRequest, NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { track_component_usage } from "@/lib/repositories/stats";

export const POST = async (request: NextRequest) => {
  return with_auth(async () => {
    const body = await request.json();
    const { component_id } = body;

    if (!component_id || typeof component_id !== "string") {
      return NextResponse.json({ error: "component_id required" }, { status: 400 });
    }

    track_component_usage(component_id);

    return NextResponse.json({ success: true });
  });
};
```

**Step 4: Commit**

```bash
git add lib/stores/builder-store.ts app/api/stats/track/route.ts
git commit -m "feat(admin): add component usage tracking"
```

---

## Task 10: Final Testing

**Step 1: Start dev server**

Run: `bun dev`

**Step 2: Test dashboard loads**

Navigate to `/admin`
Expected: Dashboard with stats cards, chart, popular components

**Step 3: Test auto-refresh**

Wait 30 seconds
Expected: Data refreshes automatically

**Step 4: Test component tracking**

1. Go to `/builder`
2. Select a component
3. Go to `/admin`
Expected: Component appears in popular components (or usage count increases)

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(admin): complete admin dashboard implementation"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Stats repository with SQL queries |
| 2 | /api/stats endpoint |
| 3 | use_stats SWR hook |
| 4 | Stats overview cards |
| 5 | Generation history chart |
| 6 | Popular components list |
| 7 | Admin dashboard page |
| 8 | Navigation link |
| 9 | Component usage tracking |
| 10 | Final testing |
