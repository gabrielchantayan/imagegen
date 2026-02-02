"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { HistoryGrid } from "@/components/history/history-grid";
import { HistoryFilters } from "@/components/history/history-filters";
import { HistoryDetailModal } from "@/components/history/history-detail-modal";
import {
  use_history,
  toggle_favorite_api,
  delete_generation_api,
} from "@/lib/hooks/use-history";
import { use_builder_store } from "@/lib/stores/builder-store";
import type { GenerationWithFavorite } from "@/lib/types/database";

export default function HistoryPage() {
  const router = useRouter();
  const load_prompt = use_builder_store((s) => s.load_prompt);

  const [favorites_only, set_favorites_only] = useState(false);
  const [search, set_search] = useState("");
  const [selected_item, set_selected_item] = useState<GenerationWithFavorite | null>(null);

  const {
    items,
    total,
    is_loading,
    is_loading_more,
    is_reaching_end,
    load_more,
    mutate,
  } = use_history({
    favorites_only,
    search,
  });

  const handle_toggle_favorite = async (id: string) => {
    await toggle_favorite_api(id);
    mutate();
    if (selected_item?.id === id) {
      set_selected_item((prev) =>
        prev ? { ...prev, is_favorite: !prev.is_favorite } : null
      );
    }
  };

  const handle_delete = async (id: string) => {
    await delete_generation_api(id);
    mutate();
    set_selected_item(null);
  };

  const handle_use_prompt = (prompt: Record<string, unknown>) => {
    load_prompt(prompt);
    router.push("/builder");
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">History</h1>
        <span className="text-muted-foreground">{total} generations</span>
      </div>

      <HistoryFilters
        favorites_only={favorites_only}
        on_favorites_only_change={set_favorites_only}
        search={search}
        on_search_change={set_search}
      />

      <HistoryGrid
        items={items}
        is_loading={is_loading}
        is_loading_more={is_loading_more ?? false}
        is_reaching_end={is_reaching_end ?? false}
        on_load_more={load_more}
        on_select={set_selected_item}
        on_toggle_favorite={handle_toggle_favorite}
      />

      <HistoryDetailModal
        item={selected_item}
        on_close={() => set_selected_item(null)}
        on_toggle_favorite={handle_toggle_favorite}
        on_delete={handle_delete}
        on_use_prompt={handle_use_prompt}
      />
    </div>
  );
}
