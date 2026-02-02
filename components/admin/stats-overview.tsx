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
