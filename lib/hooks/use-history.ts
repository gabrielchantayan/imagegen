"use client";

import useSWRInfinite from "swr/infinite";

import type { GenerationWithFavorite } from "@/lib/types/database";
import type { PaginatedResult } from "@/lib/db-helpers";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type HistoryOptions = {
  favorites_only?: boolean;
  hidden_filter?: "normal" | "all" | "hidden_only";
  search?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  sort?: "newest" | "oldest";
};

export const use_history = (options: HistoryOptions = {}) => {
  const get_key = (page_index: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page_index + 1));
    params.set("limit", "24");
    if (options.favorites_only) params.set("favorites", "true");
    if (options.hidden_filter && options.hidden_filter !== "normal") params.set("hidden_filter", options.hidden_filter);
    if (options.search) params.set("search", options.search);
    if (options.tags && options.tags.length > 0) {
      params.set("tags", options.tags.join(","));
    }
    if (options.date_from) params.set("date_from", options.date_from);
    if (options.date_to) params.set("date_to", options.date_to);
    if (options.sort) params.set("sort", options.sort);
    return `/api/history?${params}`;
  };

  const { data, error, size, setSize, isLoading, mutate } =
    useSWRInfinite<PaginatedResult<GenerationWithFavorite>>(get_key, fetcher);

  const items = data?.flatMap((page) => page.items) ?? [];
  const total = data?.[0]?.total ?? 0;
  const is_loading_more =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const is_empty = data?.[0]?.items.length === 0;
  const is_reaching_end =
    is_empty || (data && data[data.length - 1]?.items.length < 24);

  return {
    items,
    total,
    is_loading: isLoading,
    is_loading_more,
    is_empty,
    is_reaching_end,
    load_more: () => setSize(size + 1),
    mutate,
    is_error: !!error,
  };
};

export const toggle_favorite_api = async (id: string): Promise<boolean> => {
  const res = await fetch(`/api/history/${id}/favorite`, { method: "POST" });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to toggle favorite");
  }

  const data = await res.json();
  return data.favorited;
};

export const toggle_hidden_api = async (id: string): Promise<boolean> => {
  const res = await fetch(`/api/history/${id}/hidden`, { method: "POST" });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to toggle hidden");
  }

  const data = await res.json();
  return data.hidden;
};

export const delete_generation_api = async (id: string): Promise<void> => {
  const res = await fetch(`/api/history/${id}`, { method: "DELETE" });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete generation");
  }
};
