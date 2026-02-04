"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HistoryToolbar } from "./history-toolbar";
import { HistoryFilterSidebar } from "./history-filter-sidebar";
import { HistoryGrid } from "./history-grid";
import { HistoryDetailPanel } from "./history-detail-panel";
import { KeyboardShortcutsModal } from "@/components/ui/keyboard-shortcuts-modal";
import { HistoryCompareModal } from "./history-compare-modal";
import { use_history_store } from "@/lib/stores/history-store";
import { use_history, toggle_favorite_api, delete_generation_api } from "@/lib/hooks/use-history";
import { use_builder_store } from "@/lib/stores/builder-store";
import { use_history_keyboard_shortcuts } from "@/lib/hooks/use-history-keyboard-shortcuts";
import { use_history_url_sync } from "@/lib/hooks/use-history-url-sync";
import type { GenerationWithFavorite } from "@/lib/types/database";

export const HistoryLayout = () => {
  const router = useRouter();
  const load_prompt = use_builder_store((s) => s.load_prompt);

  // Sync filters with URL params
  use_history_url_sync();

  // History store state
  const sidebar_collapsed = use_history_store((s) => s.sidebar_collapsed);
  const is_select_mode = use_history_store((s) => s.is_select_mode);
  const selected_ids = use_history_store((s) => s.selected_ids);
  const filters = use_history_store((s) => s.filters);
  const detail_panel = use_history_store((s) => s.detail_panel);
  const shortcuts_modal_open = use_history_store((s) => s.shortcuts_modal_open);
  const compare_modal_open = use_history_store((s) => s.compare_modal_open);
  const compare_items = use_history_store((s) => s.compare_items);
  const delete_confirmation_item = use_history_store((s) => s.delete_confirmation_item);

  // History store actions
  const toggle_select_mode = use_history_store((s) => s.toggle_select_mode);
  const exit_select_mode = use_history_store((s) => s.exit_select_mode);
  const toggle_selection = use_history_store((s) => s.toggle_selection);
  const select_range = use_history_store((s) => s.select_range);
  const clear_selection = use_history_store((s) => s.clear_selection);
  const set_detail_item = use_history_store((s) => s.set_detail_item);
  const set_detail_batch = use_history_store((s) => s.set_detail_batch);
  const set_shortcuts_modal_open = use_history_store((s) => s.set_shortcuts_modal_open);
  const close_compare = use_history_store((s) => s.close_compare);
  const open_compare = use_history_store((s) => s.open_compare);
  const set_focused_index = use_history_store((s) => s.set_focused_index);
  const focused_index = use_history_store((s) => s.focused_index);
  const set_delete_confirmation_item = use_history_store((s) => s.set_delete_confirmation_item);

  // Fetch history data with filters
  const {
    items,
    total,
    is_loading,
    is_loading_more,
    is_reaching_end,
    load_more,
    mutate,
  } = use_history({
    favorites_only: filters.favorites_only,
    search: filters.search,
    tags: filters.tags,
    date_from: filters.date_from ?? undefined,
    date_to: filters.date_to ?? undefined,
    sort: filters.sort,
  });

  // Update detail panel when selection changes in batch mode
  useEffect(() => {
    if (is_select_mode && selected_ids.length > 0) {
      const selected_items = items.filter((item) => selected_ids.includes(item.id));
      set_detail_batch(selected_items);
    } else if (is_select_mode && selected_ids.length === 0) {
      set_detail_batch([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand actions are stable
  }, [is_select_mode, selected_ids, items]);

  // Handle item click
  const handle_item_click = useCallback(
    (item: GenerationWithFavorite, shift_key: boolean) => {
      // Update focused index for keyboard navigation
      const clicked_index = items.findIndex((i) => i.id === item.id);
      if (clicked_index >= 0) {
        set_focused_index(clicked_index);
      }

      if (is_select_mode) {
        if (shift_key && use_history_store.getState().last_selected_id) {
          const all_ids = items.map((i) => i.id);
          select_range(use_history_store.getState().last_selected_id!, item.id, all_ids);
        } else {
          toggle_selection(item.id);
        }
      } else {
        set_detail_item(item);
      }
    },
    [is_select_mode, items, select_range, toggle_selection, set_detail_item, set_focused_index]
  );

  // Handle toggle favorite
  const handle_toggle_favorite = useCallback(
    async (id: string) => {
      await toggle_favorite_api(id);
      mutate();

      // Update detail panel if showing this item
      if (detail_panel.mode === "single" && detail_panel.item.id === id) {
        set_detail_item({ ...detail_panel.item, is_favorite: !detail_panel.item.is_favorite });
      }
    },
    [mutate, detail_panel, set_detail_item]
  );

  // Handle delete
  const handle_delete = useCallback(
    async (id: string) => {
      await delete_generation_api(id);
      mutate();

      // Clear from selection if in select mode
      if (is_select_mode && selected_ids.includes(id)) {
        use_history_store.setState({
          selected_ids: selected_ids.filter((selected_id) => selected_id !== id),
        });
      }

      // Clear detail panel if showing this item
      if (detail_panel.mode === "single" && detail_panel.item.id === id) {
        set_detail_item(null);
      }
    },
    [mutate, is_select_mode, selected_ids, detail_panel, set_detail_item]
  );

  // Handle use prompt
  const handle_use_prompt = useCallback(
    (prompt: Record<string, unknown>) => {
      load_prompt(prompt);
      router.push("/builder");
    },
    [load_prompt, router]
  );

  // Handle compare
  const handle_compare = useCallback(() => {
    if (selected_ids.length === 2) {
      const selected_items = items.filter((item) => selected_ids.includes(item.id));
      if (selected_items.length === 2) {
        open_compare([selected_items[0], selected_items[1]]);
      }
    }
  }, [selected_ids, items, open_compare]);

  // Handle selecting a generation by ID (for lineage navigation)
  const handle_select_id = useCallback(
    async (id: string) => {
      // First check if the item is in the current list
      const existing_item = items.find((i) => i.id === id);
      if (existing_item) {
        set_detail_item(existing_item);
        return;
      }

      // Otherwise fetch it from the API
      try {
        const res = await fetch(`/api/history/${id}`);
        if (res.ok) {
          const data = await res.json();
          set_detail_item(data.generation);
        }
      } catch (err) {
        console.error("Failed to fetch generation:", err);
      }
    },
    [items, set_detail_item]
  );

  // Keyboard shortcuts
  use_history_keyboard_shortcuts({
    is_select_mode,
    selected_ids,
    items,
    focused_index,
    detail_panel,
    shortcuts_modal_open,
    compare_modal_open,
    on_toggle_favorite: handle_toggle_favorite,
    on_toggle_selection: toggle_selection,
    on_exit_select_mode: exit_select_mode,
    on_set_focused_index: set_focused_index,
    on_open_detail: set_detail_item,
    on_open_shortcuts: set_shortcuts_modal_open,
    on_close_compare: close_compare,
    on_compare: handle_compare,
    on_request_delete: set_delete_confirmation_item,
    get_grid_columns,
  });

  return (
    <div className="h-screen flex flex-col">
      <HistoryToolbar
        total={total}
        selected_count={selected_ids.length}
        is_select_mode={is_select_mode}
        on_toggle_select_mode={toggle_select_mode}
        on_compare={handle_compare}
        on_clear_selection={clear_selection}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Filter sidebar */}
        <HistoryFilterSidebar
          collapsed={sidebar_collapsed}
          items={items}
        />

        {/* Main content with resizable panels */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Image grid */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <HistoryGrid
              items={items}
              is_loading={is_loading}
              is_loading_more={is_loading_more ?? false}
              is_reaching_end={is_reaching_end ?? false}
              on_load_more={load_more}
              on_item_click={handle_item_click}
              on_toggle_favorite={handle_toggle_favorite}
              is_select_mode={is_select_mode}
              selected_ids={selected_ids}
              focused_index={focused_index}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

            {/* Detail panel */}
          <ResizablePanel defaultSize={35} minSize={20}>
            <HistoryDetailPanel
              state={detail_panel}
              on_toggle_favorite={handle_toggle_favorite}
              on_delete={handle_delete}
              on_use_prompt={handle_use_prompt}
              on_close={() => set_detail_item(null)}
              total_count={total}
              on_update={mutate}
              on_select_id={handle_select_id}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Modals */}
      <KeyboardShortcutsModal
        open={shortcuts_modal_open}
        on_open_change={set_shortcuts_modal_open}
        context="history"
      />

      {compare_items && (
        <HistoryCompareModal
          open={compare_modal_open}
          items={compare_items}
          on_close={close_compare}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!delete_confirmation_item}
        onOpenChange={(open) => !open && set_delete_confirmation_item(null)}
      >
        <AlertDialogContent
          className="w-lg max-w-lg"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (delete_confirmation_item) {
                handle_delete(delete_confirmation_item.id);
                set_delete_confirmation_item(null);
              }
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              image and its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="gap-2">
              Cancel
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Esc</kbd>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (delete_confirmation_item) {
                  handle_delete(delete_confirmation_item.id);
                  set_delete_confirmation_item(null);
                }
              }}
              className="gap-2 bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
              <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono text-xs">Enter</kbd>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Helper to estimate grid columns based on viewport
const get_grid_columns = (): number => {
  if (typeof window === "undefined") return 4;
  const width = window.innerWidth;
  if (width < 768) return 2;
  if (width < 1024) return 4;
  return 6;
};
