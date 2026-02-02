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
  on_item_click: (item: GenerationWithFavorite, shift_key: boolean) => void;
  on_toggle_favorite: (id: string) => void;
  is_select_mode: boolean;
  selected_ids: Set<string>;
  focused_index: number;
};

export const HistoryGrid = ({
  items,
  is_loading,
  is_loading_more,
  is_reaching_end,
  on_load_more,
  on_item_click,
  on_toggle_favorite,
  is_select_mode,
  selected_ids,
  focused_index,
}: HistoryGridProps) => {
  const load_more_ref = useRef<HTMLDivElement>(null);
  const grid_ref = useRef<HTMLDivElement>(null);
  const item_refs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Infinite scroll observer
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

  // Scroll focused item into view
  useEffect(() => {
    if (focused_index >= 0 && item_refs.current.has(focused_index)) {
      const element = item_refs.current.get(focused_index);
      element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focused_index]);

  const set_item_ref = (index: number, el: HTMLDivElement | null) => {
    if (el) {
      item_refs.current.set(index, el);
    } else {
      item_refs.current.delete(index);
    }
  };

  if (is_loading) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-12 text-muted-foreground">
          No generations found. Create your first image to see it here.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4" ref={grid_ref}>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item, index) => (
          <div key={item.id} ref={(el) => set_item_ref(index, el)}>
            <HistoryCard
              item={item}
              on_click={(e) => on_item_click(item, e.shiftKey)}
              on_toggle_favorite={() => on_toggle_favorite(item.id)}
              is_select_mode={is_select_mode}
              is_selected={selected_ids.has(item.id)}
              is_focused={focused_index === index}
            />
          </div>
        ))}
      </div>

      <div ref={load_more_ref} className="h-10 mt-8">
        {is_loading_more && (
          <div className="flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};
