import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { GenerationWithFavorite } from "@/lib/types/database";

type SortOption = "newest" | "oldest";

type DatePreset = "all" | "today" | "week" | "month" | "custom";

type FilterState = {
  search: string;
  date_preset: DatePreset;
  date_from: string | null;
  date_to: string | null;
  tags: string[];
  favorites_only: boolean;
  sort: SortOption;
};

type DetailPanelState =
  | { mode: "empty" }
  | { mode: "single"; item: GenerationWithFavorite }
  | { mode: "batch"; items: GenerationWithFavorite[] };

type HistoryState = {
  // Selection mode
  is_select_mode: boolean;
  selected_ids: string[];
  last_selected_id: string | null; // For shift+click range select

  // Keyboard navigation
  focused_id: string | null;
  focused_index: number;

  // UI state
  sidebar_collapsed: boolean;
  shortcuts_modal_open: boolean;
  compare_modal_open: boolean;

  // Filters
  filters: FilterState;

  // Detail panel
  detail_panel: DetailPanelState;

  // Compare mode items
  compare_items: [GenerationWithFavorite, GenerationWithFavorite] | null;

  // Delete confirmation
  delete_confirmation_item: GenerationWithFavorite | null;

  // Actions - Selection
  toggle_select_mode: () => void;
  exit_select_mode: () => void;
  select_item: (id: string) => void;
  deselect_item: (id: string) => void;
  toggle_selection: (id: string) => void;
  select_range: (from_id: string, to_id: string, all_ids: string[]) => void;
  select_all: (ids: string[]) => void;
  clear_selection: () => void;

  // Actions - Keyboard navigation
  set_focused_id: (id: string | null) => void;
  set_focused_index: (index: number) => void;

  // Actions - UI
  toggle_sidebar: () => void;
  set_sidebar_collapsed: (collapsed: boolean) => void;
  toggle_shortcuts_modal: () => void;
  set_shortcuts_modal_open: (open: boolean) => void;

  // Actions - Filters
  set_search: (search: string) => void;
  set_date_preset: (preset: DatePreset) => void;
  set_date_range: (from: string | null, to: string | null) => void;
  toggle_tag: (tag: string) => void;
  set_tags: (tags: string[]) => void;
  clear_tags: () => void;
  set_favorites_only: (favorites_only: boolean) => void;
  set_sort: (sort: SortOption) => void;
  reset_filters: () => void;

  // Actions - Detail panel
  set_detail_item: (item: GenerationWithFavorite | null) => void;
  set_detail_batch: (items: GenerationWithFavorite[]) => void;
  clear_detail_panel: () => void;

  // Actions - Compare
  open_compare: (items: [GenerationWithFavorite, GenerationWithFavorite]) => void;
  close_compare: () => void;

  // Actions - Delete confirmation
  set_delete_confirmation_item: (item: GenerationWithFavorite | null) => void;
};

const DEFAULT_FILTERS: FilterState = {
  search: "",
  date_preset: "all",
  date_from: null,
  date_to: null,
  tags: [],
  favorites_only: false,
  sort: "newest",
};

export const use_history_store = create<HistoryState>()((set, get) => ({
  // Initial state
  is_select_mode: false,
  selected_ids: [],
  last_selected_id: null,

  focused_id: null,
  focused_index: -1,

  sidebar_collapsed: false,
  shortcuts_modal_open: false,
  compare_modal_open: false,

  filters: DEFAULT_FILTERS,

  detail_panel: { mode: "empty" },

  compare_items: null,

  delete_confirmation_item: null,

  // Selection actions
  toggle_select_mode: () => {
    const state = get();
    if (state.is_select_mode) {
      // Exiting select mode - clear selection
      set({
        is_select_mode: false,
        selected_ids: [],
        last_selected_id: null,
        detail_panel: { mode: "empty" },
      });
    } else {
      set({ is_select_mode: true });
    }
  },

  exit_select_mode: () => {
    set({
      is_select_mode: false,
      selected_ids: [],
      last_selected_id: null,
      detail_panel: { mode: "empty" },
    });
  },

  select_item: (id) => {
    set((state) => {
      // Only add if not already selected (prevent duplicates)
      if (state.selected_ids.includes(id)) {
        return { last_selected_id: id };
      }
      return {
        selected_ids: [...state.selected_ids, id],
        last_selected_id: id,
      };
    });
  },

  deselect_item: (id) => {
    set((state) => ({
      selected_ids: state.selected_ids.filter((selected_id) => selected_id !== id),
    }));
  },

  toggle_selection: (id) => {
    const state = get();
    if (state.selected_ids.includes(id)) {
      get().deselect_item(id);
    } else {
      get().select_item(id);
    }
  },

  select_range: (from_id, to_id, all_ids) => {
    const from_index = all_ids.indexOf(from_id);
    const to_index = all_ids.indexOf(to_id);

    if (from_index === -1 || to_index === -1) return;

    const start = Math.min(from_index, to_index);
    const end = Math.max(from_index, to_index);

    set((state) => {
      const ids_to_add = all_ids.slice(start, end + 1);
      // Merge existing selections with new range, avoiding duplicates
      const new_selected = [...state.selected_ids];
      for (const id of ids_to_add) {
        if (!new_selected.includes(id)) {
          new_selected.push(id);
        }
      }
      return {
        selected_ids: new_selected,
        last_selected_id: to_id,
      };
    });
  },

  select_all: (ids) => {
    set({ selected_ids: [...ids] });
  },

  clear_selection: () => {
    set({
      selected_ids: [],
      last_selected_id: null,
    });
  },

  // Keyboard navigation actions
  set_focused_id: (id) => set({ focused_id: id }),
  set_focused_index: (index) => set({ focused_index: index }),

  // UI actions
  toggle_sidebar: () => {
    set((state) => ({ sidebar_collapsed: !state.sidebar_collapsed }));
  },

  set_sidebar_collapsed: (collapsed) => {
    set({ sidebar_collapsed: collapsed });
  },

  toggle_shortcuts_modal: () => {
    set((state) => ({ shortcuts_modal_open: !state.shortcuts_modal_open }));
  },

  set_shortcuts_modal_open: (open) => {
    set({ shortcuts_modal_open: open });
  },

  // Filter actions
  set_search: (search) => {
    set((state) => ({
      filters: { ...state.filters, search },
    }));
  },

  set_date_preset: (preset) => {
    set((state) => {
      const filters = { ...state.filters, date_preset: preset };

      // Calculate date range based on preset
      if (preset === "all") {
        filters.date_from = null;
        filters.date_to = null;
      } else if (preset === "today") {
        const today = new Date().toISOString().split("T")[0];
        filters.date_from = today;
        filters.date_to = today;
      } else if (preset === "week") {
        const today = new Date();
        const week_ago = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filters.date_from = week_ago.toISOString().split("T")[0];
        filters.date_to = today.toISOString().split("T")[0];
      } else if (preset === "month") {
        const today = new Date();
        const month_ago = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filters.date_from = month_ago.toISOString().split("T")[0];
        filters.date_to = today.toISOString().split("T")[0];
      }
      // "custom" keeps existing dates

      return { filters };
    });
  },

  set_date_range: (from, to) => {
    set((state) => ({
      filters: {
        ...state.filters,
        date_preset: "custom",
        date_from: from,
        date_to: to,
      },
    }));
  },

  toggle_tag: (tag) => {
    set((state) => {
      const tags = state.filters.tags.includes(tag)
        ? state.filters.tags.filter((t) => t !== tag)
        : [...state.filters.tags, tag];
      return { filters: { ...state.filters, tags } };
    });
  },

  set_tags: (tags) => {
    set((state) => ({
      filters: { ...state.filters, tags },
    }));
  },

  clear_tags: () => {
    set((state) => ({
      filters: { ...state.filters, tags: [] },
    }));
  },

  set_favorites_only: (favorites_only) => {
    set((state) => ({
      filters: { ...state.filters, favorites_only },
    }));
  },

  set_sort: (sort) => {
    set((state) => ({
      filters: { ...state.filters, sort },
    }));
  },

  reset_filters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  // Detail panel actions
  set_detail_item: (item) => {
    if (item) {
      set({ detail_panel: { mode: "single", item } });
    } else {
      set({ detail_panel: { mode: "empty" } });
    }
  },

  set_detail_batch: (items) => {
    const current = get().detail_panel;
    if (items.length === 0) {
      // Bail out if already empty to prevent infinite loops
      if (current.mode === "empty") return;
      set({ detail_panel: { mode: "empty" } });
    } else {
      // Bail out if same items (by id) to prevent unnecessary updates
      if (
        current.mode === "batch" &&
        current.items.length === items.length &&
        current.items.every((item, i) => item.id === items[i].id)
      ) {
        return;
      }
      set({ detail_panel: { mode: "batch", items } });
    }
  },

  clear_detail_panel: () => {
    set({ detail_panel: { mode: "empty" } });
  },

  // Compare actions
  open_compare: (items) => {
    set({
      compare_items: items,
      compare_modal_open: true,
    });
  },

  close_compare: () => {
    set({
      compare_modal_open: false,
      compare_items: null,
    });
  },

  // Delete confirmation actions
  set_delete_confirmation_item: (item) => {
    set({ delete_confirmation_item: item });
  },
}));

// Export types
export type { FilterState, DatePreset, SortOption, DetailPanelState };

// Memoized selectors
export const use_history_ui_state = () =>
  use_history_store(
    useShallow((s) => ({
      sidebar_collapsed: s.sidebar_collapsed,
      is_select_mode: s.is_select_mode,
      shortcuts_modal_open: s.shortcuts_modal_open,
      compare_modal_open: s.compare_modal_open,
    }))
  );

export const use_history_selection = () =>
  use_history_store(
    useShallow((s) => ({
      selected_ids: s.selected_ids,
      last_selected_id: s.last_selected_id,
      focused_id: s.focused_id,
      focused_index: s.focused_index,
    }))
  );

export const use_history_filters = () =>
  use_history_store(
    useShallow((s) => ({
      filters: s.filters,
    }))
  );

export const use_history_detail_panel = () =>
  use_history_store(
    useShallow((s) => ({
      detail_panel: s.detail_panel,
      compare_items: s.compare_items,
    }))
  );

export const use_history_selection_actions = () =>
  use_history_store(
    useShallow((s) => ({
      toggle_select_mode: s.toggle_select_mode,
      exit_select_mode: s.exit_select_mode,
      select_item: s.select_item,
      deselect_item: s.deselect_item,
      toggle_selection: s.toggle_selection,
      select_range: s.select_range,
      select_all: s.select_all,
      clear_selection: s.clear_selection,
    }))
  );

export const use_history_navigation_actions = () =>
  use_history_store(
    useShallow((s) => ({
      set_focused_id: s.set_focused_id,
      set_focused_index: s.set_focused_index,
    }))
  );

export const use_history_ui_actions = () =>
  use_history_store(
    useShallow((s) => ({
      toggle_sidebar: s.toggle_sidebar,
      set_sidebar_collapsed: s.set_sidebar_collapsed,
      toggle_shortcuts_modal: s.toggle_shortcuts_modal,
      set_shortcuts_modal_open: s.set_shortcuts_modal_open,
    }))
  );

export const use_history_filter_actions = () =>
  use_history_store(
    useShallow((s) => ({
      set_search: s.set_search,
      set_date_preset: s.set_date_preset,
      set_date_range: s.set_date_range,
      toggle_tag: s.toggle_tag,
      set_tags: s.set_tags,
      clear_tags: s.clear_tags,
      set_favorites_only: s.set_favorites_only,
      set_sort: s.set_sort,
      reset_filters: s.reset_filters,
    }))
  );

export const use_history_detail_actions = () =>
  use_history_store(
    useShallow((s) => ({
      set_detail_item: s.set_detail_item,
      set_detail_batch: s.set_detail_batch,
      clear_detail_panel: s.clear_detail_panel,
    }))
  );

export const use_history_compare_actions = () =>
  use_history_store(
    useShallow((s) => ({
      open_compare: s.open_compare,
      close_compare: s.close_compare,
    }))
  );
