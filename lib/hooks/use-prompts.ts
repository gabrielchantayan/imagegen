"use client";

import useSWR from "swr";
import type { SavedPrompt } from "@/lib/types/database";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const use_prompts = (search?: string) => {
  const url = search
    ? `/api/prompts?search=${encodeURIComponent(search)}`
    : "/api/prompts";

  const { data, error, isLoading, mutate } = useSWR<{ prompts: SavedPrompt[] }>(
    url,
    fetcher
  );

  return {
    prompts: data?.prompts || [],
    is_loading: isLoading,
    error,
    mutate,
  };
};

export const use_prompt = (id: string) => {
  const { data, error, isLoading, mutate } = useSWR<SavedPrompt>(
    `/api/prompts/${id}`,
    fetcher
  );

  return {
    prompt: data,
    is_loading: isLoading,
    error,
    mutate,
  };
};

export const save_prompt = async (data: {
  name: string;
  description?: string;
  prompt_json: Record<string, unknown>;
}): Promise<SavedPrompt> => {
  const res = await fetch("/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to save prompt");
  }

  return res.json();
};

export const update_prompt = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    prompt_json?: Record<string, unknown>;
  }
): Promise<SavedPrompt> => {
  const res = await fetch(`/api/prompts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update prompt");
  }

  return res.json();
};

export const delete_prompt = async (id: string): Promise<void> => {
  const res = await fetch(`/api/prompts/${id}`, { method: "DELETE" });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete prompt");
  }
};
