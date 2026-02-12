"use client";

import { useMemo } from "react";
import { use_stats } from "@/lib/hooks/use-stats";
import { StatsOverview } from "@/components/admin/stats-overview";
import { PopularComponents } from "@/components/admin/popular-components";
import { GenerationChart } from "@/components/admin/generation-chart";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { ToolbarSlots } from "@/components/shared/toolbar-slots";

export default function AdminPage() {
  const { stats, is_loading, mutate } = use_stats();

  const left_slot = useMemo(() => (
    <h1 className="text-lg font-semibold">Dashboard</h1>
  ), []);

  const right_slot = useMemo(() => (
    <Button variant="outline" size="sm" onClick={() => mutate()}>
      <RefreshCw className="size-4 mr-2" />
      Refresh
    </Button>
  ), [mutate]);

  if (is_loading) {
    return (
      <div className="container py-8 max-w-5xl mx-auto">
        <ToolbarSlots left={left_slot} right={right_slot} />
        <div className="grid gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-3 h-[400px]">
            <div className="md:col-span-2 bg-muted/50 animate-pulse rounded-xl" />
            <div className="bg-muted/50 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="container py-8 max-w-5xl mx-auto space-y-8">
      <ToolbarSlots left={left_slot} right={right_slot} />

      <StatsOverview stats={stats.generations} queue={stats.queue} />

      <div className="grid gap-6 md:grid-cols-3">
        <GenerationChart data={stats.daily_generations} />
        <div className="md:col-span-1">
          <PopularComponents components={stats.popular_components} />
        </div>
      </div>
    </div>
  );
}
