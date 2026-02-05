"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, Trash2, Download, Copy, ImageIcon, Heart, Archive, Plus, X, Clipboard, User, RefreshCw, AlertTriangle, Wand2, Sparkles, GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import type { DetailPanelState } from "@/lib/stores/history-store";
import type { Generation, GenerationWithFavorite } from "@/lib/types/database";
import { RemixModal } from "./remix-modal";
import { use_builder_actions } from "@/lib/stores/builder-store";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DEFAULT_CATEGORY_COLOR,
} from "@/lib/constants/categories";

// Alias for backwards compatibility
const DEFAULT_COLOR = DEFAULT_CATEGORY_COLOR;

type GroupedTags = Record<string, { id: number; tag: string }[]>;

// Extract display name from tag (e.g., "char:selene" -> "Selene")
const format_tag_name = (tag: string): string => {
  const parts = tag.split(":");
  const name = parts.length > 1 ? parts[1] : tag;
  return name.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

type HistoryDetailPanelProps = {
  state: DetailPanelState;
  on_toggle_favorite: (id: string) => void;
  on_delete: (id: string) => void;
  on_use_prompt: (prompt: Record<string, unknown>) => void;
  on_close: () => void;
  total_count: number;
  on_update?: () => void;
  on_select_id?: (id: string) => void;
};

export const HistoryDetailPanel = ({
  state,
  on_toggle_favorite,
  on_delete,
  on_use_prompt,
  on_close,
  total_count,
  on_update,
  on_select_id,
}: HistoryDetailPanelProps) => {
  if (state.mode === "empty") {
    return <EmptyState total_count={total_count} />;
  }

  if (state.mode === "batch") {
    return (
      <BatchState
        items={state.items}
        on_toggle_favorite={on_toggle_favorite}
        on_delete={on_delete}
      />
    );
  }

  return (
    <SingleState
      item={state.item}
      on_toggle_favorite={on_toggle_favorite}
      on_delete={on_delete}
      on_use_prompt={on_use_prompt}
      on_close={on_close}
      on_update={on_update}
      on_select_id={on_select_id}
    />
  );
};

// Empty state - shows stats and instructions
const EmptyState = ({ total_count }: { total_count: number }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <ImageIcon className="size-8 text-muted-foreground" />
      </div>

      <h3 className="font-medium mb-2">No image selected</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Click on an image to view details, or enter select mode to perform batch operations.
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="p-4 rounded-lg bg-muted text-center">
          <div className="text-2xl font-bold">{total_count}</div>
          <div className="text-xs text-muted-foreground">Total images</div>
        </div>
        <div className="p-4 rounded-lg bg-muted text-center">
          <div className="text-2xl font-bold">
            <Heart className="size-6 mx-auto text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground">Press S to favorite</div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">?</kbd> for keyboard shortcuts
      </p>
    </div>
  );
};

// Batch state - shows selection and batch actions
const BatchState = ({
  items,
  on_toggle_favorite,
  on_delete,
}: {
  items: GenerationWithFavorite[];
  on_toggle_favorite: (id: string) => void;
  on_delete: (id: string) => void;
}) => {
  const [is_deleting, set_is_deleting] = useState(false);
  const [show_delete_dialog, set_show_delete_dialog] = useState(false);

  const handle_favorite_all = async () => {
    for (const item of items) {
      if (!item.is_favorite) {
        await on_toggle_favorite(item.id);
      }
    }
  };

  const handle_delete_all = async () => {
    set_is_deleting(true);
    set_show_delete_dialog(false);
    for (const item of items) {
      await on_delete(item.id);
    }
    set_is_deleting(false);
  };

  const handle_download_all = () => {
    // Download each image - in a real app this would create a ZIP
    for (const item of items) {
      if (item.image_path) {
        const link = document.createElement("a");
        link.href = item.image_path;
        link.download = `generation-${item.id}.png`;
        link.click();
      }
    }
  };

  const favorites_count = items.filter((i) => i.is_favorite).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <h3 className="font-medium">{items.length} images selected</h3>
        <p className="text-sm text-muted-foreground">
          {favorites_count} favorited
        </p>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2 border-b shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handle_favorite_all}
        >
          <Star className="size-4 mr-2" />
          Favorite all
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handle_download_all}
        >
          <Download className="size-4 mr-2" />
          Download all
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive"
          disabled={is_deleting}
          onClick={() => set_show_delete_dialog(true)}
        >
          <Trash2 className="size-4 mr-2" />
          {is_deleting ? "Deleting..." : "Delete all"}
        </Button>

        <AlertDialog open={show_delete_dialog} onOpenChange={set_show_delete_dialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {items.length} images?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected
                images and their associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handle_delete_all}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Thumbnail grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="aspect-[3/4] rounded-md overflow-hidden bg-muted relative"
            >
              {item.image_path && (
                <Image
                  src={item.image_path}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100px"
                />
              )}
              {item.is_favorite && (
                <Star className="absolute top-1 right-1 size-3 fill-yellow-400 text-yellow-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type ReferencePhoto = {
  id: string;
  name: string;
  image_path: string;
};

// Tags Section component - shows grouped colored tags
const TagsSection = ({
  tags,
  on_add_tag,
  on_remove_tag,
  new_tag,
  set_new_tag,
  is_adding_tag,
}: {
  tags?: { id: number; tag: string; category: string | null }[];
  on_add_tag: () => void;
  on_remove_tag: (tag: string) => void;
  new_tag: string;
  set_new_tag: (value: string) => void;
  is_adding_tag: boolean;
}) => {
  // Group tags by category
  const grouped_tags = useMemo(() => {
    if (!tags || tags.length === 0) return {};

    const groups: GroupedTags = {};
    for (const t of tags) {
      const category = t.category || "user";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ id: t.id, tag: t.tag });
    }
    return groups;
  }, [tags]);

  const has_tags = Object.keys(grouped_tags).length > 0;

  // Order categories: known categories first, then user tags at the end
  const category_order = [
    "characters", "physical_traits", "jewelry",
    "wardrobe", "wardrobe_tops", "wardrobe_bottoms", "wardrobe_footwear",
    "poses", "scenes", "backgrounds", "camera", "ban_lists", "subject", "user"
  ];

  const sorted_categories = Object.keys(grouped_tags).sort((a, b) => {
    const a_idx = category_order.indexOf(a);
    const b_idx = category_order.indexOf(b);
    if (a_idx === -1 && b_idx === -1) return a.localeCompare(b);
    if (a_idx === -1) return 1;
    if (b_idx === -1) return -1;
    return a_idx - b_idx;
  });

  return (
    <div className="mt-3 space-y-2">
      {has_tags && (
        <div className="space-y-2">
          {sorted_categories.map((category) => {
            const colors = CATEGORY_COLORS[category] || DEFAULT_COLOR;
            const label = CATEGORY_LABELS[category] || category;
            const category_tags = grouped_tags[category];

            return (
              <div key={category} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-16 shrink-0">
                  {label}
                </span>
                {category_tags.map((t) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className={`pl-2 pr-1 h-6 ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {format_tag_name(t.tag)}
                    <button
                      onClick={() => on_remove_tag(t.tag)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Add tag input */}
      <div className="flex items-center gap-1 pt-1">
        <Input
          value={new_tag}
          onChange={(e) => set_new_tag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") on_add_tag();
          }}
          placeholder="Add custom tag..."
          className="h-6 text-xs px-2 w-32"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={on_add_tag}
          disabled={is_adding_tag || !new_tag.trim()}
        >
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  );
};

// Single item state - shows full detail view
const SingleState = ({
  item,
  on_toggle_favorite,
  on_delete,
  on_use_prompt,
  on_update,
  on_select_id,
}: {
  item: GenerationWithFavorite;
  on_toggle_favorite: (id: string) => void;
  on_delete: (id: string) => void;
  on_use_prompt: (prompt: Record<string, unknown>) => void;
  on_close: () => void;
  on_update?: () => void;
  on_select_id?: (id: string) => void;
}) => {
  const router = useRouter();
  const { restore_from_generation } = use_builder_actions();
  const [prompt_text, set_prompt_text] = useState(
    JSON.stringify(item.prompt_json, null, 2)
  );
  const [show_delete_dialog, set_show_delete_dialog] = useState(false);
  const [new_tag, set_new_tag] = useState("");
  const [is_adding_tag, set_is_adding_tag] = useState(false);
  const [is_remixing, set_is_remixing] = useState(false);
  const [references, set_references] = useState<ReferencePhoto[]>([]);
  const [show_remix_modal, set_show_remix_modal] = useState(false);
  const [lineage, set_lineage] = useState<{
    ancestors: Generation[];
    current: Generation;
    children: Generation[];
  } | null>(null);

  // Fetch reference photos if this generation used any
  useEffect(() => {
    if (!item.reference_photo_ids || item.reference_photo_ids.length === 0) {
      set_references([]);
      return;
    }

    const controller = new AbortController();

    fetch("/api/references", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const all_refs = data.references as ReferencePhoto[];
        const used_refs = all_refs.filter((r) =>
          item.reference_photo_ids?.includes(r.id)
        );
        set_references(used_refs);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          set_references([]);
        }
      });

    return () => controller.abort();
  }, [item.reference_photo_ids]);

  // Fetch lineage data for version history
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/history/${item.id}/lineage`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.current) {
          set_lineage(data);
        } else {
          set_lineage(null);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          set_lineage(null);
        }
      });

    return () => controller.abort();
  }, [item.id]);

  const handle_ai_remix = async (instructions: string, mode: "fork" | "replace") => {
    const res = await fetch("/api/remix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_id: item.id,
        edit_instructions: instructions,
        mode,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to queue remix");
    }

    on_update?.();
  };

  const handle_remix = async () => {
    if (is_remixing) return;
    set_is_remixing(true);

    try {
      if (item.components_used && item.components_used.length > 0) {
        const ids = item.components_used.map((c) => c.id);
        const res = await fetch("/api/components/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });

        if (res.ok) {
          const data = await res.json();
          restore_from_generation(data.components);
          router.push("/builder");
          return;
        }
      }
      
      // Fallback to simple JSON load if fetching components fails or none exist
      handle_use_prompt();
      router.push("/builder");
    } catch (e) {
      console.error("Remix failed:", e);
      handle_use_prompt();
    } finally {
      set_is_remixing(false);
    }
  };

  const handle_use_prompt = () => {
    try {
      const parsed = JSON.parse(prompt_text);
      on_use_prompt(parsed);
    } catch {
      // Use original if parsing fails
      on_use_prompt(item.prompt_json);
    }
  };

  const handle_delete = () => {
    set_show_delete_dialog(false);
    on_delete(item.id);
  };

  const handle_add_tag = async () => {
    if (!new_tag.trim()) return;
    set_is_adding_tag(true);
    try {
      await fetch(`/api/history/${item.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: new_tag.trim() }),
      });
      set_new_tag("");
      on_update?.();
    } catch (e) {
      console.error(e);
    } finally {
      set_is_adding_tag(false);
    }
  };

  const handle_remove_tag = async (tag: string) => {
    try {
      await fetch(`/api/history/${item.id}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      on_update?.();
    } catch (e) {
      console.error(e);
    }
  };

  const handle_copy_image = async () => {
    if (!item.image_path) return;
    try {
      const response = await fetch(item.image_path);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch (err) {
      console.error("Failed to copy image:", err);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Image preview - full size */}
      <div className="relative bg-muted">
        {item.image_path ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.image_path}
            alt=""
            className="w-full h-auto"
          />
        ) : (
          <div className="w-full aspect-[3/4] flex items-center justify-center text-muted-foreground">
            <Archive className="size-12" />
          </div>
        )}

        {/* Overlay actions */}
        <div className="absolute top-2 right-2 flex gap-1">
          {item.image_path && (
            <a
              href={item.image_path}
              download={`generation-${item.id}.png`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="secondary"
                size="icon"
                className="size-8"
                title="Download"
              >
                <Download className="size-4" />
              </Button>
            </a>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            onClick={handle_copy_image}
            title="Copy Image"
          >
            <Clipboard className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            onClick={() => on_toggle_favorite(item.id)}
            title={item.is_favorite ? "Unfavorite" : "Favorite"}
          >
            <Star
              className={`size-4 ${
                item.is_favorite ? "fill-yellow-400 text-yellow-400" : ""
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col">
        {/* Meta */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {new Date(item.created_at).toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div className="flex items-center gap-2">
              {item.used_fallback && !item.face_swap_failed && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  <RefreshCw className="size-3 mr-1" />
                  Face swapped
                </Badge>
              )}
              {item.face_swap_failed && (
                <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                  <AlertTriangle className="size-3 mr-1" />
                  Face swap failed
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {item.status}
              </span>
            </div>
          </div>

          {/* Reference Photos Section */}
          {references.length > 0 && (
            <div className="mt-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Reference{references.length !== 1 ? "s" : ""} used
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {references.map((ref) => (
                  <div
                    key={ref.id}
                    className="relative w-12 h-12 rounded-lg overflow-hidden border"
                    title={ref.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ref.image_path}
                      alt={ref.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pre-swap Image Section */}
          {item.pre_swap_image_path && (
            <div className="mt-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pre-swap image</span>
              </div>
              <a
                href={item.pre_swap_image_path}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative w-24 h-32 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                title="View original image before face swap"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.pre_swap_image_path}
                  alt="Pre-swap"
                  className="w-full h-full object-cover"
                />
              </a>
            </div>
          )}

          {/* Tags Section - Grouped by Category */}
          <TagsSection
            tags={item.tags}
            on_add_tag={handle_add_tag}
            on_remove_tag={handle_remove_tag}
            new_tag={new_tag}
            set_new_tag={set_new_tag}
            is_adding_tag={is_adding_tag}
          />

          {/* Lineage Section - Version History */}
          {lineage && (lineage.ancestors.length > 0 || lineage.children.length > 0 || item.edit_instructions) && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Version History</span>
              </div>

              {/* Edit instructions for this version */}
              {item.edit_instructions && (
                <div className="mb-2 p-2 rounded bg-muted/50 text-xs">
                  <span className="text-muted-foreground">Edit: </span>
                  <span className="italic">&ldquo;{item.edit_instructions}&rdquo;</span>
                </div>
              )}

              {/* Version timeline */}
              <div className="flex flex-wrap items-center gap-1 pb-2">
                {lineage.ancestors.map((ancestor, idx) => (
                  <div
                    key={ancestor.id}
                    className="relative cursor-pointer group"
                    title={`Version ${idx + 1}${ancestor.edit_instructions ? `: ${ancestor.edit_instructions}` : ""}`}
                    onClick={() => on_select_id?.(ancestor.id)}
                  >
                    <div className="w-10 h-14 rounded overflow-hidden border border-muted-foreground/20 hover:border-primary transition-colors">
                      {ancestor.image_path && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={ancestor.image_path}
                          alt=""
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                    </div>
                    {idx < lineage.ancestors.length - 1 && (
                      <div className="absolute top-1/2 -right-1 w-2 h-px bg-muted-foreground/30" />
                    )}
                  </div>
                ))}

                {lineage.ancestors.length > 0 && (
                  <div className="w-2 h-px bg-muted-foreground/30" />
                )}

                {/* Current version - highlighted */}
                <div className="relative">
                  <div className="w-10 h-14 rounded overflow-hidden border-2 border-primary">
                    {item.image_path && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.image_path}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-primary font-medium whitespace-nowrap">
                    Current
                  </div>
                </div>

                {lineage.children.length > 0 && (
                  <div className="w-2 h-px bg-muted-foreground/30" />
                )}

                {lineage.children.map((child) => (
                  <div
                    key={child.id}
                    className="relative cursor-pointer group"
                    title={child.edit_instructions ? `Edit: ${child.edit_instructions}` : "Child version"}
                    onClick={() => on_select_id?.(child.id)}
                  >
                    <div className="w-10 h-14 rounded overflow-hidden border border-muted-foreground/20 hover:border-primary transition-colors">
                      {child.image_path && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={child.image_path}
                          alt=""
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Prompt JSON */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Prompt JSON</span>
            <span className="text-xs text-muted-foreground">Editable</span>
          </div>
          <Textarea
            value={prompt_text}
            onChange={(e) => set_prompt_text(e.target.value)}
            className="font-mono text-xs resize-none min-h-[200px]"
          />
        </div>

        <Separator />

        {/* Actions */}
        <div className="p-4 space-y-2">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => set_show_remix_modal(true)}
            disabled={!item.image_path}
          >
            <Sparkles className="size-4 mr-2" />
            Edit with AI
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handle_remix}
            disabled={is_remixing}
          >
            <Wand2 className="size-4 mr-2" />
            {is_remixing ? "Loading..." : "Remix in Builder"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handle_use_prompt}
          >
            <Copy className="size-4 mr-2" />
            Copy JSON to Builder
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={() => set_show_delete_dialog(true)}
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </Button>

            <AlertDialog open={show_delete_dialog} onOpenChange={set_show_delete_dialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this image?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    image and its associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handle_delete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Remix Modal */}
      <RemixModal
        open={show_remix_modal}
        on_open_change={set_show_remix_modal}
        source={item}
        on_submit={handle_ai_remix}
      />
    </div>
  );
};
