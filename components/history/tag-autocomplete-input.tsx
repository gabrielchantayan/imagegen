"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DEFAULT_CATEGORY_COLOR,
} from "@/lib/constants/categories";

type TagSuggestion = {
  tag: string;
  category: string | null;
  count: number;
};

type TagAutocompleteInputProps = {
  on_add: (tag: string, category?: string) => void;
  is_adding: boolean;
  existing_tags?: string[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Format tag for display: "char:elena" -> "Elena"
const format_tag_name = (tag: string): string => {
  const parts = tag.split(":");
  const name = parts.length > 1 ? parts[1] : tag;
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const TagAutocompleteInput = ({
  on_add,
  is_adding,
  existing_tags = [],
}: TagAutocompleteInputProps) => {
  const [query, set_query] = useState("");
  const [is_open, set_is_open] = useState(false);
  const [highlighted_index, set_highlighted_index] = useState(-1);
  const container_ref = useRef<HTMLDivElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);
  const list_ref = useRef<HTMLDivElement>(null);

  const { data } = useSWR<{ tags: TagSuggestion[] }>("/api/tags", fetcher);

  const filtered = useMemo(() => {
    if (!data?.tags || !query.trim()) return [];

    const q = query.toLowerCase().trim();
    const existing_set = new Set(existing_tags);

    return data.tags
      .filter((t) => {
        if (existing_set.has(t.tag)) return false;
        // Match against formatted name or raw tag
        const formatted = format_tag_name(t.tag).toLowerCase();
        return formatted.includes(q) || t.tag.toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [data?.tags, query, existing_tags]);

  // Group filtered results by category
  const grouped = useMemo(() => {
    const groups: Record<string, TagSuggestion[]> = {};
    for (const tag of filtered) {
      const cat = tag.category || "user";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tag);
    }
    return groups;
  }, [filtered]);

  // Flat list for keyboard navigation
  const flat_items = useMemo(() => {
    const items: TagSuggestion[] = [];
    for (const tags of Object.values(grouped)) {
      items.push(...tags);
    }
    return items;
  }, [grouped]);

  const handle_select = useCallback(
    (suggestion: TagSuggestion) => {
      on_add(suggestion.tag, suggestion.category ?? undefined);
      set_query("");
      set_is_open(false);
      set_highlighted_index(-1);
    },
    [on_add]
  );

  const handle_submit = useCallback(() => {
    if (!query.trim()) return;

    // If an item is highlighted, select it
    if (highlighted_index >= 0 && highlighted_index < flat_items.length) {
      handle_select(flat_items[highlighted_index]);
      return;
    }

    // Check if query exactly matches an existing tag
    const exact = filtered.find(
      (t) =>
        t.tag.toLowerCase() === query.trim().toLowerCase() ||
        format_tag_name(t.tag).toLowerCase() === query.trim().toLowerCase()
    );

    if (exact) {
      handle_select(exact);
    } else {
      // Free-text tag
      on_add(query.trim());
      set_query("");
      set_is_open(false);
      set_highlighted_index(-1);
    }
  }, [query, highlighted_index, flat_items, filtered, handle_select, on_add]);

  const handle_key_down = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        set_is_open(true);
        set_highlighted_index((prev) =>
          prev < flat_items.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        set_highlighted_index((prev) =>
          prev > 0 ? prev - 1 : flat_items.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        handle_submit();
      } else if (e.key === "Escape") {
        set_is_open(false);
        set_highlighted_index(-1);
      }
    },
    [flat_items.length, handle_submit]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted_index < 0 || !list_ref.current) return;
    const items = list_ref.current.querySelectorAll("[data-tag-item]");
    items[highlighted_index]?.scrollIntoView({ block: "nearest" });
  }, [highlighted_index]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handle_click_outside = (e: MouseEvent) => {
      if (
        container_ref.current &&
        !container_ref.current.contains(e.target as Node)
      ) {
        set_is_open(false);
        set_highlighted_index(-1);
      }
    };
    document.addEventListener("mousedown", handle_click_outside);
    return () => document.removeEventListener("mousedown", handle_click_outside);
  }, []);

  // Reset highlight when filtered results change
  useEffect(() => {
    set_highlighted_index(-1);
  }, [query]);

  const show_dropdown = is_open && query.trim().length > 0 && flat_items.length > 0;

  return (
    <div ref={container_ref} className="relative flex items-center gap-1 pt-1">
      <Input
        ref={input_ref}
        value={query}
        onChange={(e) => {
          set_query(e.target.value);
          set_is_open(true);
        }}
        onFocus={() => {
          if (query.trim()) set_is_open(true);
        }}
        onKeyDown={handle_key_down}
        placeholder="Add tag..."
        className="h-6 text-xs px-2 w-32"
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={handle_submit}
        disabled={is_adding || !query.trim()}
      >
        <Plus className="size-3" />
      </Button>

      {show_dropdown && (
        <div
          ref={list_ref}
          className="absolute left-0 top-full mt-1 z-50 w-56 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md"
        >
          {Object.entries(grouped).map(([category, tags]) => {
            const colors =
              CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
            const label = CATEGORY_LABELS[category] || category;

            return (
              <div key={category}>
                <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider sticky top-0 bg-popover">
                  {label}
                </div>
                {tags.map((suggestion) => {
                  const idx = flat_items.indexOf(suggestion);
                  const is_highlighted = idx === highlighted_index;

                  return (
                    <button
                      key={suggestion.tag}
                      data-tag-item
                      className={`w-full flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-accent ${
                        is_highlighted ? "bg-accent" : ""
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handle_select(suggestion);
                      }}
                      onMouseEnter={() => set_highlighted_index(idx)}
                    >
                      <Badge
                        variant="outline"
                        className={`px-1.5 h-5 text-[10px] ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {format_tag_name(suggestion.tag)}
                      </Badge>
                      <span className="text-muted-foreground text-[10px]">
                        ({suggestion.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
