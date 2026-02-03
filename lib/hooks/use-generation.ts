"use client";

import { useState, useEffect, useCallback } from "react";

type GenerationStatusResponse = {
  status: "pending" | "generating" | "completed" | "failed";
  image_path?: string;
  error?: string;
  queue_position?: number;
};

export const use_generation = (generation_id: string | null) => {
  const [status, set_status] = useState<GenerationStatusResponse | null>(null);
  const [is_polling, set_is_polling] = useState(false);

  const poll = useCallback(async () => {
    if (!generation_id) return;

    try {
      const res = await fetch(`/api/generate/${generation_id}/status`);
      const data = await res.json();
      set_status(data);

      if (data.status === "completed" || data.status === "failed") {
        set_is_polling(false);
      }
    } catch (error) {
      console.error("Failed to poll status:", error);
    }
  }, [generation_id]);

  useEffect(() => {
    if (!generation_id || !is_polling) return;

    poll();

    const interval = setInterval(poll, 2000);

    return () => clearInterval(interval);
  }, [generation_id, is_polling, poll]);

  const start_polling = useCallback(() => {
    set_is_polling(true);
  }, []);

  return { status, is_polling, start_polling };
};

export type ComponentUsedInput = {
  id: string;
  name: string;
  category_id: string;
};

export type SubmitGenerationOptions = {
  aspect_ratio?: string;
  count?: number;
  reference_photo_ids?: string[];
  inline_reference_paths?: string[];
  components_used?: ComponentUsedInput[];
  google_search?: boolean;
  safety_override?: boolean;
};

export type SubmitGenerationResponse = {
  queue_id: string;
  generation_id: string;
  position: number;
};

export const submit_generation = async (
  prompt_json: Record<string, unknown>,
  options?: SubmitGenerationOptions
): Promise<SubmitGenerationResponse> => {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt_json,
      options,
      reference_photo_ids: options?.reference_photo_ids,
      inline_reference_paths: options?.inline_reference_paths,
      components_used: options?.components_used,
      google_search: options?.google_search,
      safety_override: options?.safety_override,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Generation failed");
  }

  return res.json();
};
