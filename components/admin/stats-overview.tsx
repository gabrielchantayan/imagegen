"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, DollarSign, Zap, CheckCircle } from "lucide-react";

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
      description: `${stats.today_pst} today (PST)`,
      trend: "neutral",
    },
    {
      title: "Estimated Cost",
      value: `$${stats.estimated_cost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      description: "Based on $0.04/image",
      trend: "neutral",
    },
    {
      title: "Success Rate",
      value: `${stats.success_rate}%`,
      icon: CheckCircle,
      description: "Completed generations",
      trend: stats.success_rate >= 95 ? "good" : stats.success_rate >= 80 ? "warning" : "bad",
    },
    {
      title: "Queue Status",
      value: queue.processing > 0 ? "Processing" : "Idle",
      icon: Zap,
      description: `${queue.queued} queued · ${
        queue.avg_wait_time ? `~${queue.avg_wait_time}s wait` : "No wait data"
      }`,
      trend: "neutral",
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

