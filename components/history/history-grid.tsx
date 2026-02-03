"use client";

import { useEffect, useRef } from "react";

import { ImageIcon, Loader2 } from "lucide-react";

import { HistoryCard } from "./history-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonImageGrid } from "@/components/ui/skeleton";

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
  selected_ids: string[];
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
        <SkeletonImageGrid count={12} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={ImageIcon}
          heading="No generations found"
          description="Create your first image to see it here."
        />
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
              is_selected={selected_ids.includes(item.id)}
              is_focused={focused_index === index}
            />
          </div>
        ))}
      </div>

      <div ref={load_more_ref} className="h-10 mt-8">
        {is_loading_more && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
      </div>
    </div>
  );
};
