"use client";

import { useEffect, useRef } from "react";

import { HistoryCard } from "./history-card";
import type { GenerationWithFavorite } from "@/lib/types/database";

type HistoryGridProps = {
  items: GenerationWithFavorite[];
  is_loading: boolean;
  is_loading_more: boolean;
  is_reaching_end: boolean;
  on_load_more: () => void;
  on_select: (item: GenerationWithFavorite) => void;
  on_toggle_favorite: (id: string) => void;
};

export const HistoryGrid = ({
  items,
  is_loading,
  is_loading_more,
  is_reaching_end,
  on_load_more,
  on_select,
  on_toggle_favorite,
}: HistoryGridProps) => {
  const load_more_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !is_loading_more && !is_reaching_end) {
          on_load_more();
        }
      },
      { threshold: 0.1 }
    );

    if (load_more_ref.current) {
      observer.observe(load_more_ref.current);
    }

    return () => observer.disconnect();
  }, [is_loading_more, is_reaching_end, on_load_more]);

  if (is_loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No generations found. Create your first image to see it here.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <HistoryCard
            key={item.id}
            item={item}
            on_click={() => on_select(item)}
            on_toggle_favorite={() => on_toggle_favorite(item.id)}
          />
        ))}
      </div>

      <div ref={load_more_ref} className="h-10 mt-8">
        {is_loading_more && (
          <div className="flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </>
  );
};
