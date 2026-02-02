# Admin Dashboard

## Overview

Statistics view and management interface showing generation metrics, popular components, and system health.

**Dependencies:** 00-foundation-database.md, 01-authentication.md, 04-generation-system.md

**Dependents:** None (standalone feature)

---

## Directory Structure

```
app/
├── api/
│   └── stats/
│       └── route.ts              # GET (statistics)
└── (protected)/
    └── admin/
        └── page.tsx

components/
└── admin/
    ├── stats-overview.tsx        # Summary cards
    ├── popular-components.tsx    # Most used components
    └── generation-chart.tsx      # Generation history chart

lib/
└── repositories/
    └── stats.ts                  # Statistics queries
```

---

## Statistics Repository (`lib/repositories/stats.ts`)

```typescript
import { getDb } from '../db';

export interface GenerationStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  successRate: number;
}

export interface PopularComponent {
  id: string;
  name: string;
  category_id: string;
  usage_count: number;
}

export interface DailyGenerations {
  date: string;
  count: number;
  success: number;
  failed: number;
}

// Get generation statistics
export function getGenerationStats(): GenerationStats {
  const db = getDb();

  const total = (db.prepare(`
    SELECT COUNT(*) as count FROM generations
  `).get() as { count: number }).count;

  const today = (db.prepare(`
    SELECT COUNT(*) as count FROM generations
    WHERE date(created_at) = date('now')
  `).get() as { count: number }).count;

  const thisWeek = (db.prepare(`
    SELECT COUNT(*) as count FROM generations
    WHERE created_at >= date('now', '-7 days')
  `).get() as { count: number }).count;

  const thisMonth = (db.prepare(`
    SELECT COUNT(*) as count FROM generations
    WHERE created_at >= date('now', '-30 days')
  `).get() as { count: number }).count;

  const successCount = (db.prepare(`
    SELECT COUNT(*) as count FROM generations WHERE status = 'completed'
  `).get() as { count: number }).count;

  const failedCount = (db.prepare(`
    SELECT COUNT(*) as count FROM generations WHERE status = 'failed'
  `).get() as { count: number }).count;

  const totalAttempts = successCount + failedCount;
  const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 100;

  return {
    total,
    today,
    thisWeek,
    thisMonth,
    successRate: Math.round(successRate * 10) / 10,
  };
}

// Get popular components
export function getPopularComponents(limit = 10): PopularComponent[] {
  const db = getDb();

  // This requires usage_stats table to be populated
  // For now, we can count by component mentions in generations
  // A proper implementation would track component usage on selection

  const rows = db.prepare(`
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
  `).all(limit) as PopularComponent[];

  return rows;
}

// Get daily generation counts for chart
export function getDailyGenerations(days = 30): DailyGenerations[] {
  const db = getDb();

  const rows = db.prepare(`
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
  `).all(days - 1) as DailyGenerations[];

  return rows;
}

// Get queue status
export interface QueueStats {
  queued: number;
  processing: number;
  avgWaitTime: number | null;  // in seconds
}

export function getQueueStats(): QueueStats {
  const db = getDb();

  const queued = (db.prepare(`
    SELECT COUNT(*) as count FROM generation_queue WHERE status = 'queued'
  `).get() as { count: number }).count;

  const processing = (db.prepare(`
    SELECT COUNT(*) as count FROM generation_queue WHERE status = 'processing'
  `).get() as { count: number }).count;

  // Calculate average wait time from recent completed items
  const avgWait = db.prepare(`
    SELECT AVG(
      (julianday(started_at) - julianday(created_at)) * 86400
    ) as avg_seconds
    FROM generation_queue
    WHERE status IN ('completed', 'failed')
    AND started_at IS NOT NULL
    AND created_at >= datetime('now', '-1 hour')
  `).get() as { avg_seconds: number | null };

  return {
    queued,
    processing,
    avgWaitTime: avgWait.avg_seconds ? Math.round(avgWait.avg_seconds) : null,
  };
}

// Track component usage
export function trackComponentUsage(componentId: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO usage_stats (event_type, component_id, created_at)
    VALUES ('component_use', ?, datetime('now'))
  `).run(componentId);
}

// Track generation event
export function trackGeneration(): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO usage_stats (event_type, created_at)
    VALUES ('generation', datetime('now'))
  `).run();
}
```

---

## API Endpoint

### GET /api/stats

Get all dashboard statistics.

**Response (200):**
```typescript
interface StatsResponse {
  generations: GenerationStats;
  popularComponents: PopularComponent[];
  dailyGenerations: DailyGenerations[];
  queue: QueueStats;
}
```

**Implementation:**
```typescript
// app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import {
  getGenerationStats,
  getPopularComponents,
  getDailyGenerations,
  getQueueStats,
} from '@/lib/repositories/stats';

export async function GET() {
  return withAuth(async () => {
    const stats = {
      generations: getGenerationStats(),
      popularComponents: getPopularComponents(10),
      dailyGenerations: getDailyGenerations(30),
      queue: getQueueStats(),
    };

    return NextResponse.json(stats);
  });
}
```

---

## React Hooks

```typescript
// lib/hooks/use-stats.ts
'use client';

import useSWR from 'swr';

interface GenerationStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  successRate: number;
}

interface PopularComponent {
  id: string;
  name: string;
  category_id: string;
  usage_count: number;
}

interface DailyGenerations {
  date: string;
  count: number;
  success: number;
  failed: number;
}

interface QueueStats {
  queued: number;
  processing: number;
  avgWaitTime: number | null;
}

interface StatsData {
  generations: GenerationStats;
  popularComponents: PopularComponent[];
  dailyGenerations: DailyGenerations[];
  queue: QueueStats;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useStats() {
  const { data, error, isLoading, mutate } = useSWR<StatsData>(
    '/api/stats',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    stats: data,
    isLoading,
    error,
    mutate,
  };
}
```

---

## UI Components

### Admin Dashboard Page

```typescript
// app/(protected)/admin/page.tsx
'use client';

import { useStats } from '@/lib/hooks/use-stats';
import { StatsOverview } from '@/components/admin/stats-overview';
import { PopularComponents } from '@/components/admin/popular-components';
import { GenerationChart } from '@/components/admin/generation-chart';
import { QueueStatus } from '@/components/admin/queue-status';

export default function AdminPage() {
  const { stats, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid gap-6">
          <div className="grid grid-cols-4 gap-4">
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
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-6">
        <StatsOverview stats={stats.generations} queue={stats.queue} />
        <GenerationChart data={stats.dailyGenerations} />
        <PopularComponents components={stats.popularComponents} />
      </div>
    </div>
  );
}
```

### Stats Overview

```typescript
// components/admin/stats-overview.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image, Calendar, Clock, CheckCircle } from 'lucide-react';

interface StatsOverviewProps {
  stats: {
    total: number;
    today: number;
    thisWeek: number;
    successRate: number;
  };
  queue: {
    queued: number;
    processing: number;
    avgWaitTime: number | null;
  };
}

export function StatsOverview({ stats, queue }: StatsOverviewProps) {
  const cards = [
    {
      title: 'Total Generations',
      value: stats.total.toLocaleString(),
      icon: Image,
      description: `${stats.today} today`,
    },
    {
      title: 'This Week',
      value: stats.thisWeek.toLocaleString(),
      icon: Calendar,
      description: 'Last 7 days',
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: CheckCircle,
      description: 'Completed generations',
    },
    {
      title: 'Queue',
      value: `${queue.processing}/${queue.queued + queue.processing}`,
      icon: Clock,
      description: queue.avgWaitTime
        ? `~${queue.avgWaitTime}s avg wait`
        : 'No wait time data',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
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
}
```

### Generation Chart

```typescript
// components/admin/generation-chart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GenerationChartProps {
  data: {
    date: string;
    count: number;
    success: number;
    failed: number;
  }[];
}

export function GenerationChart({ data }: GenerationChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generation History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end gap-1">
          {data.map((day) => {
            const height = (day.count / maxCount) * 100;
            const successHeight = day.count > 0 ? (day.success / day.count) * height : 0;
            const failedHeight = height - successHeight;

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col justify-end group relative"
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap">
                    <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                    <div>{day.count} total</div>
                    <div className="text-green-500">{day.success} success</div>
                    <div className="text-red-500">{day.failed} failed</div>
                  </div>
                </div>

                {/* Bar */}
                <div className="w-full flex flex-col">
                  {day.failed > 0 && (
                    <div
                      className="bg-red-500/50 rounded-t"
                      style={{ height: `${failedHeight}%` }}
                    />
                  )}
                  {day.success > 0 && (
                    <div
                      className={`bg-primary ${day.failed === 0 ? 'rounded-t' : ''}`}
                      style={{ height: `${successHeight}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{new Date(data[0]?.date).toLocaleDateString()}</span>
          <span>Today</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Popular Components

```typescript
// components/admin/popular-components.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PopularComponentsProps {
  components: {
    id: string;
    name: string;
    category_id: string;
    usage_count: number;
  }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  characters: 'Character',
  physical_traits: 'Traits',
  jewelry: 'Jewelry',
  wardrobe: 'Wardrobe',
  wardrobe_tops: 'Top',
  wardrobe_bottoms: 'Bottom',
  wardrobe_footwear: 'Footwear',
  poses: 'Pose',
  scenes: 'Scene',
  backgrounds: 'Background',
  camera: 'Camera',
  ban_lists: 'Ban List',
};

export function PopularComponents({ components }: PopularComponentsProps) {
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
            <div
              key={component.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-6">
                  #{index + 1}
                </span>
                <div>
                  <p className="font-medium">{component.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_LABELS[component.category_id] || component.category_id}
                  </Badge>
                </div>
              </div>
              <span className="text-muted-foreground">
                {component.usage_count} uses
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Queue Status (Real-time)

```typescript
// components/admin/queue-status.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QueueStatusProps {
  queue: {
    queued: number;
    processing: number;
    avgWaitTime: number | null;
  };
}

export function QueueStatus({ queue }: QueueStatusProps) {
  const total = queue.queued + queue.processing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Queue Status
          <Badge variant={total > 0 ? 'default' : 'secondary'}>
            {total > 0 ? 'Active' : 'Idle'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Processing</span>
            <span className="font-medium">{queue.processing}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Queued</span>
            <span className="font-medium">{queue.queued}</span>
          </div>
          {queue.avgWaitTime !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Wait Time</span>
              <span className="font-medium">{queue.avgWaitTime}s</span>
            </div>
          )}
        </div>

        {/* Visual progress */}
        <div className="mt-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(queue.processing / 5) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {queue.processing}/5 concurrent slots used
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Tracking Component Usage

To track which components are most popular, add tracking when components are selected in the builder:

```typescript
// In lib/stores/builder-store.ts, in selectComponent action:
import { trackComponentUsage } from '@/lib/repositories/stats';

selectComponent: (categoryId, component) => {
  // ... existing logic ...

  // Track usage
  if (component) {
    trackComponentUsage(component.id);
  }
},
```

---

## Implementation Checklist

- [ ] Create `lib/repositories/stats.ts`
- [ ] Create `app/api/stats/route.ts`
- [ ] Create `lib/hooks/use-stats.ts`
- [ ] Create `app/(protected)/admin/page.tsx`
- [ ] Create `components/admin/stats-overview.tsx`
- [ ] Create `components/admin/generation-chart.tsx`
- [ ] Create `components/admin/popular-components.tsx`
- [ ] Create `components/admin/queue-status.tsx`
- [ ] Add usage tracking to builder store
- [ ] Add navigation link to admin
- [ ] Test statistics calculations
- [ ] Test chart rendering
- [ ] Test auto-refresh

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No generations | Show zeros, empty chart |
| No usage data | Show "No usage data yet" |
| All failures | Success rate 0% |
| Very old data | Still included in total |
| High traffic | Consider caching stats |

---

## Performance Considerations

- Stats queries may be slow with large datasets
- Consider caching stats with short TTL
- Chart uses 30 days by default, could add time range selector
- Popular components limited to top 10
- Auto-refresh every 30 seconds (configurable)
