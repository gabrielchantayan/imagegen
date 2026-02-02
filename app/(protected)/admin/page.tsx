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
