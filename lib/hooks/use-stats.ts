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
