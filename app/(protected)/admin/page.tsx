"use client";

import { use_stats } from "@/lib/hooks/use-stats";
import { StatsOverview } from "@/components/admin/stats-overview";
import { PopularComponents } from "@/components/admin/popular-components";
import { GenerationChart } from "@/components/admin/generation-chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function AdminPage() {
  const { stats, is_loading, mutate } = use_stats();

  if (is_loading) {
    return (
      <div className="container py-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/builder">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/builder">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

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

