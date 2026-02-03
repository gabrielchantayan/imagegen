"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { use_history_store, type DatePreset, type SortOption } from "@/lib/stores/history-store";

/**
 * Hook to synchronize history filters with URL search params.
 *
 * This allows:
 * - Sharing filtered views via URL
 * - Preserving filters on page refresh
 * - Browser back/forward navigation through filter states
 */
export const use_history_url_sync = () => {
  const search_params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = use_history_store((s) => s.filters);
  const set_search = use_history_store((s) => s.set_search);
  const set_date_preset = use_history_store((s) => s.set_date_preset);
  const set_date_range = use_history_store((s) => s.set_date_range);
  const set_tags = use_history_store((s) => s.set_tags);
  const set_favorites_only = use_history_store((s) => s.set_favorites_only);
  const set_sort = use_history_store((s) => s.set_sort);

  // Track if we're currently syncing from URL to store
  const is_syncing_from_url = useRef(false);

  // Track if initial load from URL has happened
  const has_loaded_from_url = useRef(false);

  // Sync URL params to store on initial load and URL changes
  useEffect(() => {
    // Prevent sync loop
    if (is_syncing_from_url.current) return;
    is_syncing_from_url.current = true;

    try {
      // Parse URL params
      const url_search = search_params.get("q") ?? "";
      const url_date_preset = search_params.get("date") as DatePreset | null;
      const url_date_from = search_params.get("from");
      const url_date_to = search_params.get("to");
      const url_tags = search_params.get("tags")?.split(",").filter(Boolean) ?? [];
      const url_favorites = search_params.get("favorites") === "true";
      const url_sort = search_params.get("sort") as SortOption | null;

      // Only apply if this is the initial load or if URL actually has params
      if (!has_loaded_from_url.current || search_params.toString()) {
        has_loaded_from_url.current = true;

        // Apply URL params to store
        if (url_search !== filters.search) {
          set_search(url_search);
        }

        if (url_date_preset && ["all", "today", "week", "month", "custom"].includes(url_date_preset)) {
          if (url_date_preset !== filters.date_preset) {
            set_date_preset(url_date_preset);
          }
        }

        if (url_date_preset === "custom" && (url_date_from || url_date_to)) {
          if (url_date_from !== filters.date_from || url_date_to !== filters.date_to) {
            set_date_range(url_date_from, url_date_to);
          }
        }

        const tags_match =
          url_tags.length === filters.tags.length &&
          url_tags.every((t) => filters.tags.includes(t));
        if (!tags_match) {
          set_tags(url_tags);
        }

        if (url_favorites !== filters.favorites_only) {
          set_favorites_only(url_favorites);
        }

        if (url_sort && ["newest", "oldest"].includes(url_sort) && url_sort !== filters.sort) {
          set_sort(url_sort);
        }
      }
    } finally {
      // Small delay before allowing sync back to URL
      setTimeout(() => {
        is_syncing_from_url.current = false;
      }, 50);
    }
  }, [
    search_params,
    set_search,
    set_date_preset,
    set_date_range,
    set_tags,
    set_favorites_only,
    set_sort,
    // Don't include filters in deps to avoid loops
  ]);

  // Sync store to URL when filters change
  useEffect(() => {
    // Don't sync if we're currently syncing from URL
    if (is_syncing_from_url.current) return;
    // Don't sync until we've loaded from URL once
    if (!has_loaded_from_url.current) return;

    const params = new URLSearchParams();

    // Only add non-default values to URL
    if (filters.search) {
      params.set("q", filters.search);
    }

    if (filters.date_preset !== "all") {
      params.set("date", filters.date_preset);

      if (filters.date_preset === "custom") {
        if (filters.date_from) params.set("from", filters.date_from);
        if (filters.date_to) params.set("to", filters.date_to);
      }
    }

    if (filters.tags.length > 0) {
      params.set("tags", filters.tags.join(","));
    }

    if (filters.favorites_only) {
      params.set("favorites", "true");
    }

    if (filters.sort !== "newest") {
      params.set("sort", filters.sort);
    }

    // Build new URL
    const new_search = params.toString();
    const new_url = new_search ? `${pathname}?${new_search}` : pathname;

    // Only update if different
    const current_url = `${pathname}${search_params.toString() ? `?${search_params.toString()}` : ""}`;
    if (new_url !== current_url) {
      router.replace(new_url, { scroll: false });
    }
  }, [
    filters.search,
    filters.date_preset,
    filters.date_from,
    filters.date_to,
    filters.tags,
    filters.favorites_only,
    filters.sort,
    pathname,
    router,
    search_params,
  ]);
};
