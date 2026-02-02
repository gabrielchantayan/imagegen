import { create } from "zustand";

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
  selected_ids: Set<string>;
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
  selected_ids: new Set(),
  last_selected_id: null,

  focused_id: null,
  focused_index: -1,

  sidebar_collapsed: false,
  shortcuts_modal_open: false,
  compare_modal_open: false,

  filters: DEFAULT_FILTERS,

  detail_panel: { mode: "empty" },

  compare_items: null,

  // Selection actions
  toggle_select_mode: () => {
    const state = get();
    if (state.is_select_mode) {
      // Exiting select mode - clear selection
      set({
        is_select_mode: false,
        selected_ids: new Set(),
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
      selected_ids: new Set(),
      last_selected_id: null,
      detail_panel: { mode: "empty" },
    });
  },

  select_item: (id) => {
    set((state) => {
      const new_selected = new Set(state.selected_ids);
      new_selected.add(id);
      return {
        selected_ids: new_selected,
        last_selected_id: id,
      };
    });
  },

  deselect_item: (id) => {
    set((state) => {
      const new_selected = new Set(state.selected_ids);
      new_selected.delete(id);
      return { selected_ids: new_selected };
    });
  },

  toggle_selection: (id) => {
    const state = get();
    if (state.selected_ids.has(id)) {
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
      const new_selected = new Set(state.selected_ids);
      for (let i = start; i <= end; i++) {
        new_selected.add(all_ids[i]);
      }
      return {
        selected_ids: new_selected,
        last_selected_id: to_id,
      };
    });
  },

  select_all: (ids) => {
    set({ selected_ids: new Set(ids) });
  },

  clear_selection: () => {
    set({
      selected_ids: new Set(),
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
    if (items.length === 0) {
      set({ detail_panel: { mode: "empty" } });
    } else {
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
}));

// Export types
export type { FilterState, DatePreset, SortOption, DetailPanelState };
