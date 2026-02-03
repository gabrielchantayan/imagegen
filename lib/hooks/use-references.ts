"use client";

import useSWR from "swr";
import type { ReferencePhoto } from "@/lib/types/database";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ReferencesData = {
  references: ReferencePhoto[];
  component_defaults: Record<string, string[]>;
};

export const use_references = () => {
  const { data, error, isLoading, mutate } = useSWR<ReferencesData>(
    "/api/references",
    fetcher
  );

  return {
    references: data?.references ?? [],
    component_defaults: data?.component_defaults ?? {},
    is_loading: isLoading,
    is_error: !!error,
    mutate,
  };
};

export const upload_reference = async (
  file: File,
  name: string
): Promise<ReferencePhoto> => {
  const form_data = new FormData();
  form_data.append("file", file);
  form_data.append("name", name);

  const res = await fetch("/api/references", {
    method: "POST",
    body: form_data,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to upload reference");
  }

  return res.json();
};

export const delete_reference_api = async (id: string): Promise<void> => {
  const res = await fetch(`/api/references/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete reference");
  }
};

export const update_reference_api = async (
  id: string,
  name: string
): Promise<ReferencePhoto> => {
  const res = await fetch(`/api/references/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update reference");
  }

  return res.json();
};

export const attach_reference_api = async (
  component_id: string,
  reference_photo_id: string
): Promise<void> => {
  const res = await fetch(`/api/components/${component_id}/references`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference_photo_id }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to attach reference");
  }
};

export const detach_reference_api = async (
  component_id: string,
  reference_photo_id: string
): Promise<void> => {
  const res = await fetch(
    `/api/components/${component_id}/references/${reference_photo_id}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to detach reference");
  }
};
