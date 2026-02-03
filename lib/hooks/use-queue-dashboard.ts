"use client";

import useSWR from "swr";

import type { QueueItemWithPosition, QueueMetrics } from "@/lib/repositories/queue";

type QueueDashboardData = {
  items: QueueItemWithPosition[];
  metrics: QueueMetrics;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const use_queue_dashboard = () => {
  const { data, error, isLoading, mutate } = useSWR<QueueDashboardData>(
    "/api/queue",
    fetcher,
    {
      refreshInterval: 3000,
    }
  );

  const processing_items = data?.items.filter((i) => i.status === "processing") ?? [];
  const queued_items = data?.items.filter((i) => i.status === "queued") ?? [];

  return {
    items: data?.items ?? [],
    processing_items,
    queued_items,
    metrics: data?.metrics ?? null,
    is_loading: isLoading,
    is_error: !!error,
    mutate,
  };
};
