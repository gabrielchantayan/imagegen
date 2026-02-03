"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueueMetrics } from "@/lib/repositories/queue";

type QueueMetricsBarProps = {
  metrics: QueueMetrics | null;
};

export const QueueMetricsBar = ({ metrics }: QueueMetricsBarProps) => {
  if (!metrics) return null;

  const format_time = (seconds: number | null): string => {
    if (seconds === null) return "-";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  const format_rate = (rate: number | null): string => {
    if (rate === null) return "-";
    return `${Math.round(rate)}%`;
  };

  const stats = [
    {
      label: "Queued",
      value: metrics.total_queued,
      icon: Layers,
      color: "text-amber-500",
    },
    {
      label: "Processing",
      value: metrics.total_processing,
      icon: Clock,
      color: "text-green-500",
    },
    {
      label: "Avg Wait (1h)",
      value: format_time(metrics.avg_wait_time_seconds),
      icon: Clock,
      color: "text-blue-500",
    },
    {
      label: "Success Rate (1h)",
      value: format_rate(metrics.success_rate_1h),
      icon: metrics.success_rate_1h !== null && metrics.success_rate_1h >= 80 ? CheckCircle : XCircle,
      color: metrics.success_rate_1h !== null && metrics.success_rate_1h >= 80 ? "text-green-500" : "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} size="sm">
          <CardContent className="flex items-center gap-3 py-0">
            <stat.icon className={cn("size-5", stat.color)} />
            <div>
              <div className="text-2xl font-semibold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
