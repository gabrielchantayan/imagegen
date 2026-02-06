"use client";

import useSWR from "swr";
import type { SavedRemixPrompt } from "@/lib/types/database";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const use_remix_prompts = () => {
  const { data, error, isLoading, mutate } = useSWR<{ prompts: SavedRemixPrompt[] }>(
    "/api/remix-prompts",
    fetcher
  );

  return {
    prompts: data?.prompts ?? [],
    is_loading: isLoading,
    error,
    mutate,
  };
};

export const save_remix_prompt = async (data: {
  name: string;
  instructions: string;
}): Promise<SavedRemixPrompt> => {
  const res = await fetch("/api/remix-prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to save remix prompt");
  }

  return res.json();
};

export const delete_remix_prompt = async (id: string): Promise<void> => {
  const res = await fetch(`/api/remix-prompts/${id}`, { method: "DELETE" });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete remix prompt");
  }
};
