"use client";

import { useMemo } from "react";
import {
  Search,
  Calendar,
  Tag,
  Star,
  SortDesc,
  ChevronLeft,
  ChevronRight,
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
import { use_history_store, type DatePreset, type SortOption } from "@/lib/stores/history-store";
import type { GenerationWithFavorite } from "@/lib/types/database";

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
  items,
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

  // Extract unique tags from items for the tag filter
  // In a real app, this would come from the API
  const available_tags = useMemo(() => {
    const tag_counts = new Map<string, number>();

    // For now, extract from prompt_json - later this will come from API
    for (const item of items) {
      const prompt = item.prompt_json;

      // Extract subject tags
      const subject = prompt.subject as Record<string, unknown> | undefined;
      if (subject?.species) {
        const tag = `species:${String(subject.species).toLowerCase()}`;
        tag_counts.set(tag, (tag_counts.get(tag) || 0) + 1);
      }
      if (subject?.ethnicity) {
        const tag = `ethnicity:${String(subject.ethnicity).toLowerCase()}`;
        tag_counts.set(tag, (tag_counts.get(tag) || 0) + 1);
      }

      // Extract wardrobe tags
      const wardrobe = prompt.wardrobe as Record<string, unknown> | undefined;
      if (wardrobe?.top) {
        const tag = `top:${String(wardrobe.top).toLowerCase().slice(0, 20)}`;
        tag_counts.set(tag, (tag_counts.get(tag) || 0) + 1);
      }
      if (wardrobe?.bottom) {
        const tag = `bottom:${String(wardrobe.bottom).toLowerCase().slice(0, 20)}`;
        tag_counts.set(tag, (tag_counts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tag_counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);

  const has_active_filters =
    filters.search ||
    filters.date_preset !== "all" ||
    filters.tags.length > 0 ||
    filters.favorites_only ||
    filters.sort !== "newest";

  if (collapsed) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-4 gap-2 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggle_sidebar}>
              <ChevronRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand filters</TooltipContent>
        </Tooltip>

        <Separator className="my-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filters.search ? "secondary" : "ghost"}
              size="icon"
              onClick={toggle_sidebar}
            >
              <Search className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filters.date_preset !== "all" ? "secondary" : "ghost"}
              size="icon"
              onClick={toggle_sidebar}
            >
              <Calendar className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Date filter</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filters.tags.length > 0 ? "secondary" : "ghost"}
              size="icon"
              onClick={toggle_sidebar}
            >
              <Tag className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Tags</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filters.favorites_only ? "default" : "ghost"}
              size="icon"
              onClick={() => set_favorites_only(!filters.favorites_only)}
            >
              <Star className={`size-4 ${filters.favorites_only ? "fill-current" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {filters.favorites_only ? "Showing favorites" : "Show favorites only"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filters.sort !== "newest" ? "secondary" : "ghost"}
              size="icon"
              onClick={toggle_sidebar}
            >
              <SortDesc className="size-4" />
            </Button>
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
              {filters.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="text-xs cursor-pointer"
                  onClick={() => toggle_tag(tag)}
                >
                  {tag}
                  <X className="size-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}

          {/* Available tags */}
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {available_tags
              .filter((t) => !filters.tags.includes(t.tag))
              .map(({ tag, count }) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-muted"
                  onClick={() => toggle_tag(tag)}
                >
                  {tag} ({count})
                </Badge>
              ))}
            {available_tags.length === 0 && (
              <span className="text-xs text-muted-foreground">No tags available</span>
            )}
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
