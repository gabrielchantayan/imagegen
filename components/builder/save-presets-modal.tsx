"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { create_component_api } from "@/lib/hooks/use-components";
import { normalize_analysis } from "@/lib/normalize-analysis";
import { Loader2, ChevronRight } from "lucide-react";

type SavePresetsModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  analysis_data: Record<string, unknown>;
};

type CategoryConfig = {
  key: string;
  nested_key?: string;
  category_id: string;
  label: string;
  singular: string;
};

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { key: "subjects", category_id: "characters", label: "Subjects", singular: "Subject" },
  { key: "wardrobe", nested_key: "tops", category_id: "wardrobe_tops", label: "Tops", singular: "Top" },
  { key: "wardrobe", nested_key: "bottoms", category_id: "wardrobe_bottoms", label: "Bottoms", singular: "Bottom" },
  { key: "wardrobe", nested_key: "footwear", category_id: "wardrobe_footwear", label: "Footwear", singular: "Footwear" },
  { key: "jewelry", category_id: "jewelry", label: "Jewelry", singular: "Jewelry" },
  { key: "poses", category_id: "poses", label: "Poses", singular: "Pose" },
  { key: "scenes", category_id: "scenes", label: "Scenes", singular: "Scene" },
  { key: "backgrounds", category_id: "backgrounds", label: "Backgrounds", singular: "Background" },
  { key: "cameras", category_id: "camera", label: "Camera", singular: "Camera" },
];

const get_items_for_category = (
  data: Record<string, unknown>,
  config: CategoryConfig
): unknown[] => {
  if (config.nested_key) {
    const parent = data[config.key] as Record<string, unknown> | undefined;
    if (!parent) return [];
    const items = parent[config.nested_key];
    return Array.isArray(items) ? items : [];
  }
  const items = data[config.key];
  return Array.isArray(items) ? items : [];
};

const get_item_preview = (item: unknown): string => {
  if (typeof item === "string") {
    return item.length > 60 ? `${item.slice(0, 60)}...` : item;
  }
  if (typeof item === "object" && item !== null) {
    const obj = item as Record<string, unknown>;
    // Try common description fields
    const description = obj.description || obj.setting || obj.body || obj.framing;
    if (typeof description === "string") {
      return description.length > 60 ? `${description.slice(0, 60)}...` : description;
    }
    // Fallback to first string value
    for (const value of Object.values(obj)) {
      if (typeof value === "string") {
        return value.length > 60 ? `${value.slice(0, 60)}...` : value;
      }
    }
  }
  return "Item";
};

export const SavePresetsModal = ({
  open,
  on_open_change,
  analysis_data,
}: SavePresetsModalProps) => {
  const [saving, set_saving] = useState(false);
  const [base_name, set_base_name] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [expanded_categories, set_expanded_categories] = useState<Set<string>>(new Set());

  // Track selected items per category: { category_id: Set<item_index> }
  const [selected_items, set_selected_items] = useState<Record<string, Set<number>>>({});

  // Normalize analysis data
  const normalized_data = useMemo(
    () => normalize_analysis(analysis_data),
    [analysis_data]
  );

  // Get categories with items
  const categories_with_items = useMemo(() => {
    return CATEGORY_CONFIGS.map((config) => ({
      config,
      items: get_items_for_category(normalized_data, config),
    })).filter(({ items }) => items.length > 0);
  }, [normalized_data]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      set_base_name("");
      set_error(null);
      set_expanded_categories(new Set());

      // Initialize all items as selected
      const initial_selected: Record<string, Set<number>> = {};
      for (const { config, items } of categories_with_items) {
        initial_selected[config.category_id] = new Set(
          Array.from({ length: items.length }, (_, i) => i)
        );
      }
      set_selected_items(initial_selected);
    }
  }, [open, categories_with_items]);

  const toggle_category_expanded = (category_id: string) => {
    set_expanded_categories((prev) => {
      const next = new Set(prev);
      if (next.has(category_id)) {
        next.delete(category_id);
      } else {
        next.add(category_id);
      }
      return next;
    });
  };

  const toggle_category_all = (category_id: string, items_count: number) => {
    set_selected_items((prev) => {
      const current = prev[category_id] ?? new Set();
      const all_selected = current.size === items_count;

      return {
        ...prev,
        [category_id]: all_selected
          ? new Set()
          : new Set(Array.from({ length: items_count }, (_, i) => i)),
      };
    });
  };

  const toggle_item = (category_id: string, index: number) => {
    set_selected_items((prev) => {
      const current = new Set(prev[category_id] ?? []);
      if (current.has(index)) {
        current.delete(index);
      } else {
        current.add(index);
      }
      return { ...prev, [category_id]: current };
    });
  };

  const get_item_name = (
    base: string,
    singular: string,
    index: number,
    total: number
  ): string => {
    if (total === 1) {
      return `${base} - ${singular}`;
    }
    return `${base} - ${singular} ${index + 1}`;
  };

  const handle_save = async () => {
    if (!base_name.trim()) return;

    set_saving(true);
    set_error(null);

    try {
      const promises: Promise<unknown>[] = [];

      for (const { config, items } of categories_with_items) {
        const selected = selected_items[config.category_id] ?? new Set();

        for (const index of selected) {
          const item = items[index];
          if (item === undefined) continue;

          const name = get_item_name(
            base_name.trim(),
            config.singular,
            index,
            items.length
          );

          const item_data = typeof item === "string" ? { description: item } : item;

          promises.push(
            create_component_api({
              category_id: config.category_id,
              name,
              description: "Created from image analysis",
              data: item_data as Record<string, unknown>,
            })
          );
        }
      }

      await Promise.all(promises);
      on_open_change(false);
      set_base_name("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save presets";
      set_error(message);
    } finally {
      set_saving(false);
    }
  };

  const total_selected = Object.values(selected_items).reduce(
    (sum, set) => sum + set.size,
    0
  );

  return (
    <AlertDialog open={open} onOpenChange={on_open_change}>
      <AlertDialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-0 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-background shrink-0">
          <AlertDialogTitle className="text-lg font-semibold tracking-tight">
            Save as Presets
          </AlertDialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create components from your analysis result
          </p>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center justify-center">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Label
              htmlFor="baseName"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Base Name
            </Label>
            <Input
              id="baseName"
              value={base_name}
              onChange={(e) => set_base_name(e.target.value)}
              placeholder="e.g., Beach Photo Reference"
              className="bg-background"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Select Items to Save
            </Label>
            <div className="space-y-2 pt-1">
              {categories_with_items.map(({ config, items }) => {
                const is_expanded = expanded_categories.has(config.category_id);
                const selected = selected_items[config.category_id] ?? new Set();
                const all_selected = selected.size === items.length;
                const some_selected = selected.size > 0 && selected.size < items.length;

                return (
                  <Collapsible
                    key={config.category_id}
                    open={is_expanded}
                    onOpenChange={() => toggle_category_expanded(config.category_id)}
                  >
                    <div className="rounded-lg border bg-card overflow-hidden">
                      {/* Category header */}
                      <div className="flex items-center gap-3 p-3 hover:bg-muted/10 transition-colors">
                        <Checkbox
                          checked={all_selected || some_selected}
                          indeterminate={some_selected}
                          onCheckedChange={() =>
                            toggle_category_all(config.category_id, items.length)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                        <CollapsibleTrigger className="flex-1 flex items-center gap-2 text-left">
                          <ChevronRight
                            className={`size-4 text-muted-foreground transition-transform ${
                              is_expanded ? "rotate-90" : ""
                            }`}
                          />
                          <span className="font-medium">{config.label}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {selected.size}/{items.length}
                          </Badge>
                        </CollapsibleTrigger>
                      </div>

                      {/* Expanded items */}
                      <CollapsibleContent>
                        <div className="border-t bg-muted/5">
                          {items.map((item, index) => {
                            const is_selected = selected.has(index);
                            const preview = get_item_preview(item);
                            const item_name = get_item_name(
                              base_name.trim() || "Preview",
                              config.singular,
                              index,
                              items.length
                            );

                            return (
                              <div
                                key={index}
                                className="flex items-start gap-3 px-3 py-2.5 pl-10 hover:bg-muted/10 transition-colors border-t first:border-t-0"
                              >
                                <Checkbox
                                  checked={is_selected}
                                  onCheckedChange={() =>
                                    toggle_item(config.category_id, index)
                                  }
                                  className="mt-0.5 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {item_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {preview}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}

              {categories_with_items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items found in analysis data
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-muted/5 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={() => on_open_change(false)}>
            Cancel
          </Button>
          <Button
            onClick={handle_save}
            disabled={saving || !base_name.trim() || total_selected === 0}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              `Save ${total_selected} Item${total_selected !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
