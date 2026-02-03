import { useEffect } from "react";

import type { GenerationWithFavorite } from "@/lib/types/database";

type DetailPanelState =
  | { mode: "empty" }
  | { mode: "single"; item: GenerationWithFavorite }
  | { mode: "batch"; items: GenerationWithFavorite[] };

type UseHistoryKeyboardShortcutsOptions = {
  is_select_mode: boolean;
  selected_ids: string[];
  items: GenerationWithFavorite[];
  focused_index: number;
  detail_panel: DetailPanelState;
  shortcuts_modal_open: boolean;
  compare_modal_open: boolean;
  on_toggle_favorite: (id: string) => void;
  on_toggle_selection: (id: string) => void;
  on_exit_select_mode: () => void;
  on_set_focused_index: (index: number) => void;
  on_open_detail: (item: GenerationWithFavorite | null) => void;
  on_open_shortcuts: (open: boolean) => void;
  on_close_compare: () => void;
  on_compare: () => void;
  on_request_delete: (item: GenerationWithFavorite) => void;
  get_grid_columns: () => number;
};

export const use_history_keyboard_shortcuts = (
  options: UseHistoryKeyboardShortcutsOptions
) => {
  const {
    is_select_mode,
    selected_ids,
    items,
    focused_index,
    detail_panel,
    shortcuts_modal_open,
    compare_modal_open,
    on_toggle_favorite,
    on_toggle_selection,
    on_exit_select_mode,
    on_set_focused_index,
    on_open_detail,
    on_open_shortcuts,
    on_close_compare,
    on_compare,
    on_request_delete,
    get_grid_columns,
  } = options;

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
          on_open_shortcuts(false);
        } else if (compare_modal_open) {
          on_close_compare();
        } else if (is_select_mode) {
          on_exit_select_mode();
        } else if (detail_panel.mode !== "empty") {
          on_open_detail(null);
        }
        return;
      }

      // ? - show shortcuts help
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        on_open_shortcuts(true);
        return;
      }

      // Arrow keys - navigate grid and auto-select
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const columns = get_grid_columns();
        let new_index = focused_index;

        if (e.key === "ArrowUp") new_index = Math.max(0, focused_index - columns);
        if (e.key === "ArrowDown")
          new_index = Math.min(items.length - 1, focused_index + columns);
        if (e.key === "ArrowLeft") new_index = Math.max(0, focused_index - 1);
        if (e.key === "ArrowRight")
          new_index = Math.min(items.length - 1, focused_index + 1);

        on_set_focused_index(new_index);

        // Auto-select item in detail panel (unless in select mode)
        if (!is_select_mode && new_index >= 0 && new_index < items.length) {
          on_open_detail(items[new_index]);
        }
        return;
      }

      // Enter - open focused item in detail panel
      if (e.key === "Enter" && focused_index >= 0 && focused_index < items.length) {
        const item = items[focused_index];
        if (!is_select_mode) {
          on_open_detail(item);
        }
        return;
      }

      // Space - toggle selection in select mode
      if (
        e.key === " " &&
        is_select_mode &&
        focused_index >= 0 &&
        focused_index < items.length
      ) {
        e.preventDefault();
        on_toggle_selection(items[focused_index].id);
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
          on_toggle_favorite(target_item.id);
        }
        return;
      }

      // Delete - delete focused/selected item(s)
      if (e.key === "Delete" || e.key === "Backspace") {
        if (detail_panel.mode === "single") {
          on_request_delete(detail_panel.item);
        }
        return;
      }

      // C - compare (when 2 items selected)
      if (e.key === "c" && !e.ctrlKey && !e.metaKey && selected_ids.length === 2) {
        on_compare();
        return;
      }
    };

    window.addEventListener("keydown", handle_keydown);
    return () => window.removeEventListener("keydown", handle_keydown);
  }, [
    is_select_mode,
    selected_ids,
    items,
    focused_index,
    detail_panel,
    shortcuts_modal_open,
    compare_modal_open,
    on_toggle_favorite,
    on_toggle_selection,
    on_exit_select_mode,
    on_set_focused_index,
    on_open_detail,
    on_open_shortcuts,
    on_close_compare,
    on_compare,
    on_request_delete,
    get_grid_columns,
  ]);
};
