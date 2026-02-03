"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import {
  Search,
  Calendar,
  Tag,
  Star,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { use_history_store, type DatePreset, type SortOption } from "@/lib/stores/history-store";
import type { GenerationWithFavorite } from "@/lib/types/database";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEFAULT_CATEGORY_COLOR,
} from "@/lib/constants/categories";

// Alias for backwards compatibility
const DEFAULT_COLOR = DEFAULT_CATEGORY_COLOR;

// Extract display name from tag (e.g., "char:selene" -> "Selene")
const format_tag_name = (tag: string): string => {
  const parts = tag.split(":");
  const name = parts.length > 1 ? parts[1] : tag;
  return name.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

type TagWithCategoryCount = { tag: string; category: string | null; count: number };

type HistoryFilterSidebarProps = {
  collapsed: boolean;
  items: GenerationWithFavorite[];
};

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export const HistoryFilterSidebar = ({
  collapsed,
}: HistoryFilterSidebarProps) => {
  const filters = use_history_store((s) => s.filters);
  const toggle_sidebar = use_history_store((s) => s.toggle_sidebar);
  const set_search = use_history_store((s) => s.set_search);
  const set_date_preset = use_history_store((s) => s.set_date_preset);
  const set_date_range = use_history_store((s) => s.set_date_range);
  const toggle_tag = use_history_store((s) => s.toggle_tag);
  const clear_tags = use_history_store((s) => s.clear_tags);
  const set_favorites_only = use_history_store((s) => s.set_favorites_only);
  const set_sort = use_history_store((s) => s.set_sort);
  const reset_filters = use_history_store((s) => s.reset_filters);

  // Fetch available tags from API (now includes category)
  const { data: tagsData } = useSWR<{ tags: TagWithCategoryCount[] }>("/api/tags", (url: string) =>
    fetch(url).then((res) => res.json())
  );

  // Group tags by category
  const grouped_tags = useMemo(() => {
    const tags = tagsData?.tags || [];
    const groups: Record<string, TagWithCategoryCount[]> = {};

    for (const t of tags) {
      const category = t.category || "user";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(t);
    }

    return groups;
  }, [tagsData]);

  // Get sorted category keys
  const sorted_categories = useMemo(() => {
    return Object.keys(grouped_tags).sort((a, b) => {
      const a_idx = CATEGORY_ORDER.indexOf(a);
      const b_idx = CATEGORY_ORDER.indexOf(b);
      if (a_idx === -1 && b_idx === -1) return a.localeCompare(b);
      if (a_idx === -1) return 1;
      if (b_idx === -1) return -1;
      return a_idx - b_idx;
    });
  }, [grouped_tags]);

  // Track expanded categories (default: first two categories expanded)
  const [expanded_categories, set_expanded_categories] = useState<Set<string>>(
    new Set(sorted_categories.slice(0, 2))
  );

  const toggle_category_expanded = (category: string) => {
    set_expanded_categories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const available_tags = useMemo(() => {
    return tagsData?.tags || [];
  }, [tagsData]);

  const has_active_filters =
    filters.search ||
    filters.date_preset !== "all" ||
    filters.tags.length > 0 ||
    filters.favorites_only ||
    filters.sort !== "newest";

  if (collapsed) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-4 gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={toggle_sidebar}>
          <ChevronRight className="size-4" />
        </Button>

        <Separator className="my-2" />

        <Tooltip>
          <TooltipTrigger
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 size-9 ${
              filters.search
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={toggle_sidebar}
          >
            <Search className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="right">Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 size-9 ${
              filters.date_preset !== "all"
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={toggle_sidebar}
          >
            <Calendar className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="right">Date filter</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 size-9 ${
              filters.tags.length > 0
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={toggle_sidebar}
          >
            <Tag className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="right">Tags</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 size-9 ${
              filters.favorites_only
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => set_favorites_only(!filters.favorites_only)}
          >
            <Star className={`size-4 ${filters.favorites_only ? "fill-current" : ""}`} />
          </TooltipTrigger>
          <TooltipContent side="right">
            {filters.favorites_only ? "Showing favorites" : "Show favorites only"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 size-9 ${
              filters.sort !== "newest"
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={toggle_sidebar}
          >
            <SortDesc className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="right">Sort</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="w-56 border-r flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-3 border-b shrink-0">
        <span className="font-medium text-sm">Filters</span>
        <div className="flex items-center gap-1">
          {has_active_filters && (
            <Button variant="ghost" size="sm" onClick={reset_filters} className="h-7 px-2 text-xs">
              Reset
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={toggle_sidebar}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={filters.search}
              onChange={(e) => set_search(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
                onClick={() => set_search("")}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Date range */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Date range</Label>
          <Select
            value={filters.date_preset}
            onValueChange={(v) => set_date_preset(v as DatePreset)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filters.date_preset === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filters.date_from || ""}
                onChange={(e) => set_date_range(e.target.value || null, filters.date_to)}
                className="h-8 text-xs"
              />
              <Input
                type="date"
                value={filters.date_to || ""}
                onChange={(e) => set_date_range(filters.date_from, e.target.value || null)}
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            {filters.tags.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clear_tags} className="h-5 px-1 text-xs">
                Clear
              </Button>
            )}
          </div>

          {/* Selected tags */}
          {filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {filters.tags.map((tag) => {
                // Find the tag's category to apply correct color
                const tag_data = available_tags.find((t) => t.tag === tag);
                const category = tag_data?.category || "user";
                const colors = CATEGORY_COLORS[category] || DEFAULT_COLOR;

                return (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`text-xs cursor-pointer ${colors.bg} ${colors.text} ${colors.border}`}
                    onClick={() => toggle_tag(tag)}
                  >
                    {format_tag_name(tag)}
                    <X className="size-3 ml-1" />
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Grouped tags by category */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {sorted_categories.length === 0 && (
              <span className="text-xs text-muted-foreground">No tags available</span>
            )}

            {sorted_categories.map((category) => {
              const colors = CATEGORY_COLORS[category] || DEFAULT_COLOR;
              const label = CATEGORY_LABELS[category] || category;
              const category_tags = grouped_tags[category]?.filter(
                (t) => !filters.tags.includes(t.tag)
              ) || [];

              if (category_tags.length === 0) return null;

              const is_expanded = expanded_categories.has(category);

              return (
                <Collapsible
                  key={category}
                  open={is_expanded}
                  onOpenChange={() => toggle_category_expanded(category)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <span>{label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]">({category_tags.length})</span>
                      <ChevronDown
                        className={`size-3 transition-transform ${is_expanded ? "" : "-rotate-90"}`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex flex-wrap gap-1 py-1">
                      {category_tags.map(({ tag, count }) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={`text-xs cursor-pointer hover:opacity-80 ${colors.bg} ${colors.text} ${colors.border}`}
                          onClick={() => toggle_tag(tag)}
                        >
                          {format_tag_name(tag)} ({count})
                        </Badge>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Favorites */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Show</Label>
          <Button
            variant={filters.favorites_only ? "default" : "outline"}
            size="sm"
            className="w-full justify-start"
            onClick={() => set_favorites_only(!filters.favorites_only)}
          >
            <Star className={`size-4 mr-2 ${filters.favorites_only ? "fill-current" : ""}`} />
            Favorites only
          </Button>
        </div>

        <Separator />

        {/* Sort */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Sort by</Label>
          <Select value={filters.sort} onValueChange={(v) => set_sort(v as SortOption)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
