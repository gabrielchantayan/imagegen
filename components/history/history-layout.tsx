"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { HistoryToolbar } from "./history-toolbar";
import { HistoryFilterSidebar } from "./history-filter-sidebar";
import { HistoryGrid } from "./history-grid";
import { HistoryDetailPanel } from "./history-detail-panel";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import { HistoryCompareModal } from "./history-compare-modal";
import { use_history_store } from "@/lib/stores/history-store";
import { use_history, toggle_favorite_api, delete_generation_api } from "@/lib/hooks/use-history";
import { use_builder_store } from "@/lib/stores/builder-store";
import type { GenerationWithFavorite } from "@/lib/types/database";

export const HistoryLayout = () => {
  const router = useRouter();
  const load_prompt = use_builder_store((s) => s.load_prompt);

  // History store state
  const sidebar_collapsed = use_history_store((s) => s.sidebar_collapsed);
  const is_select_mode = use_history_store((s) => s.is_select_mode);
  const selected_ids = use_history_store((s) => s.selected_ids);
  const filters = use_history_store((s) => s.filters);
  const detail_panel = use_history_store((s) => s.detail_panel);
  const shortcuts_modal_open = use_history_store((s) => s.shortcuts_modal_open);
  const compare_modal_open = use_history_store((s) => s.compare_modal_open);
  const compare_items = use_history_store((s) => s.compare_items);

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
    if (is_select_mode && selected_ids.size > 0) {
      const selected_items = items.filter((item) => selected_ids.has(item.id));
      set_detail_batch(selected_items);
    } else if (is_select_mode && selected_ids.size === 0) {
      set_detail_batch([]);
    }
  }, [is_select_mode, selected_ids, items, set_detail_batch]);

  // Handle item click
  const handle_item_click = useCallback(
    (item: GenerationWithFavorite, shift_key: boolean) => {
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
    [is_select_mode, items, select_range, toggle_selection, set_detail_item]
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
      if (is_select_mode && selected_ids.has(id)) {
        const new_selected = new Set(selected_ids);
        new_selected.delete(id);
        use_history_store.setState({ selected_ids: new_selected });
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
    if (selected_ids.size === 2) {
      const selected_items = items.filter((item) => selected_ids.has(item.id));
      if (selected_items.length === 2) {
        open_compare([selected_items[0], selected_items[1]]);
      }
    }
  }, [selected_ids, items, open_compare]);

  // Keyboard shortcuts
  useEffect(() => {
    const handle_keydown = (e: KeyboardEvent) => {
      // Ignore if in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // ESC - exit select mode or close modal
      if (e.key === "Escape") {
        if (shortcuts_modal_open) {
          set_shortcuts_modal_open(false);
        } else if (compare_modal_open) {
          close_compare();
        } else if (is_select_mode) {
          exit_select_mode();
        } else if (detail_panel.mode !== "empty") {
          set_detail_item(null);
        }
        return;
      }

      // ? - show shortcuts help
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        set_shortcuts_modal_open(true);
        return;
      }

      // Arrow keys - navigate grid
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const columns = get_grid_columns();
        let new_index = focused_index;

        if (e.key === "ArrowUp") new_index = Math.max(0, focused_index - columns);
        if (e.key === "ArrowDown") new_index = Math.min(items.length - 1, focused_index + columns);
        if (e.key === "ArrowLeft") new_index = Math.max(0, focused_index - 1);
        if (e.key === "ArrowRight") new_index = Math.min(items.length - 1, focused_index + 1);

        set_focused_index(new_index);
        return;
      }

      // Enter - open focused item in detail panel
      if (e.key === "Enter" && focused_index >= 0 && focused_index < items.length) {
        const item = items[focused_index];
        if (!is_select_mode) {
          set_detail_item(item);
        }
        return;
      }

      // Space - toggle selection in select mode
      if (e.key === " " && is_select_mode && focused_index >= 0 && focused_index < items.length) {
        e.preventDefault();
        toggle_selection(items[focused_index].id);
        return;
      }

      // S - toggle favorite for focused item
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        const target_item =
          detail_panel.mode === "single"
            ? detail_panel.item
            : focused_index >= 0 && focused_index < items.length
              ? items[focused_index]
              : null;

        if (target_item) {
          handle_toggle_favorite(target_item.id);
        }
        return;
      }

      // Delete - delete focused/selected item(s)
      if (e.key === "Delete" || e.key === "Backspace") {
        if (detail_panel.mode === "single") {
          if (confirm("Delete this generation?")) {
            handle_delete(detail_panel.item.id);
          }
        }
        return;
      }

      // C - compare (when 2 items selected)
      if (e.key === "c" && !e.ctrlKey && !e.metaKey && selected_ids.size === 2) {
        handle_compare();
        return;
      }
    };

    window.addEventListener("keydown", handle_keydown);
    return () => window.removeEventListener("keydown", handle_keydown);
  }, [
    is_select_mode,
    selected_ids,
    detail_panel,
    focused_index,
    items,
    shortcuts_modal_open,
    compare_modal_open,
    exit_select_mode,
    toggle_selection,
    set_detail_item,
    set_shortcuts_modal_open,
    close_compare,
    handle_toggle_favorite,
    handle_delete,
    handle_compare,
    set_focused_index,
  ]);

  return (
    <div className="h-screen flex flex-col">
      <HistoryToolbar
        total={total}
        selected_count={selected_ids.size}
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
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Modals */}
      <KeyboardShortcutsModal
        open={shortcuts_modal_open}
        on_close={() => set_shortcuts_modal_open(false)}
      />

      {compare_items && (
        <HistoryCompareModal
          open={compare_modal_open}
          items={compare_items}
          on_close={close_compare}
        />
      )}
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
