'use client';

import useSWR from 'swr';
import type { Component, Category } from '@/lib/types/database';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type ComponentsData = {
  components: Component[];
  categories: Category[];
};

export const use_components = (category?: string) => {
  const url = category
    ? `/api/components?category=${category}`
    : '/api/components';

  const { data, error, isLoading, mutate } = useSWR<ComponentsData>(url, fetcher);

  return {
    components: data?.components ?? [],
    categories: data?.categories ?? [],
    is_loading: isLoading,
    is_error: !!error,
    mutate,
  };
};

export const use_component = (id: string) => {
  const { data, error, isLoading, mutate } = useSWR<Component>(
    `/api/components/${id}`,
    fetcher
  );

  return {
    component: data,
    is_loading: isLoading,
    is_error: !!error,
    mutate,
  };
};

// Mutation helpers
export const create_component_api = async (data: {
  category_id: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
}): Promise<Component> => {
  const res = await fetch('/api/components', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create component');
  }

  return res.json();
};

export const update_component_api = async (
  id: string,
  data: { name?: string; description?: string; data?: Record<string, unknown> }
): Promise<Component> => {
  const res = await fetch(`/api/components/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update component');
  }

  return res.json();
};

export const delete_component_api = async (id: string): Promise<void> => {
  const res = await fetch(`/api/components/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete component');
  }
};
