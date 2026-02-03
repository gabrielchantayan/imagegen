"use client";

import useSWR from "swr";
import type { Template } from "@/lib/repositories/templates";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TemplatesResponse = {
  templates: Template[];
};

/**
 * Hook for fetching templates.
 */
export const use_templates = () => {
  const { data, error, isLoading, mutate } = useSWR<TemplatesResponse>(
    "/api/templates",
    fetcher
  );

  return {
    templates: data?.templates ?? [],
    is_loading: isLoading,
    error,
    mutate,
  };
};

/**
 * Create a new template.
 */
export const create_template_api = async (data: {
  name: string;
  description?: string;
  component_ids: string[];
  shared_component_ids: string[];
  thumbnail_generation_id?: string;
}): Promise<Template> => {
  const res = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error_data = await res.json();
    throw new Error(error_data.error || "Failed to create template");
  }

  const response = await res.json();
  return response.template;
};

/**
 * Update a template.
 */
export const update_template_api = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    component_ids?: string[];
    shared_component_ids?: string[];
    thumbnail_generation_id?: string | null;
  }
): Promise<Template> => {
  const res = await fetch(`/api/templates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error_data = await res.json();
    throw new Error(error_data.error || "Failed to update template");
  }

  const response = await res.json();
  return response.template;
};

/**
 * Delete a template.
 */
export const delete_template_api = async (id: string): Promise<void> => {
  const res = await fetch(`/api/templates/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error_data = await res.json();
    throw new Error(error_data.error || "Failed to delete template");
  }
};

/**
 * Export a template as JSON.
 */
export const export_template_api = async (id: string): Promise<object> => {
  const res = await fetch(`/api/templates/${id}?export=true`);

  if (!res.ok) {
    const error_data = await res.json();
    throw new Error(error_data.error || "Failed to export template");
  }

  return res.json();
};

/**
 * Import a template from JSON.
 */
export const import_template_api = async (data: {
  name: string;
  description?: string;
  component_ids: string[];
  shared_component_ids?: string[];
  exported_at?: string;
}): Promise<Template> => {
  const res = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error_data = await res.json();
    throw new Error(error_data.error || "Failed to import template");
  }

  const response = await res.json();
  return response.template;
};
