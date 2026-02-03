"use client";

import useSWR from "swr";

import type { QueueHistoryItem } from "@/lib/repositories/queue";
import type { PaginatedResult } from "@/lib/db-helpers";

type StatusFilter = "completed" | "failed" | "all";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const use_queue_history = (page: number = 1, status_filter: StatusFilter = "all") => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (status_filter !== "all") {
    params.set("status", status_filter);
  }

  const { data, error, isLoading, mutate } = useSWR<PaginatedResult<QueueHistoryItem>>(
    `/api/queue/history?${params}`,
    fetcher,
    {
      refreshInterval: 10000,
    }
  );

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    total_pages: data?.total_pages ?? 1,
    is_loading: isLoading,
    is_error: !!error,
    mutate,
  };
};
