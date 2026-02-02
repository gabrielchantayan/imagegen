"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Trash2, Download, Copy, ImageIcon, Heart, Archive, Plus, X, Tag, Clipboard } from "lucide-react";

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
import type { GenerationWithFavorite } from "@/lib/types/database";

type HistoryDetailPanelProps = {
  state: DetailPanelState;
  on_toggle_favorite: (id: string) => void;
  on_delete: (id: string) => void;
  on_use_prompt: (prompt: Record<string, unknown>) => void;
  on_close: () => void;
  total_count: number;
  on_update?: () => void;
};

export const HistoryDetailPanel = ({
  state,
  on_toggle_favorite,
  on_delete,
  on_use_prompt,
  on_close,
  total_count,
  on_update,
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

// Single item state - shows full detail view
const SingleState = ({
  item,
  on_toggle_favorite,
  on_delete,
  on_use_prompt,
  on_update,
}: {
  item: GenerationWithFavorite;
  on_toggle_favorite: (id: string) => void;
  on_delete: (id: string) => void;
  on_use_prompt: (prompt: Record<string, unknown>) => void;
  on_close: () => void;
  on_update?: () => void;
}) => {
  const [prompt_text, set_prompt_text] = useState(
    JSON.stringify(item.prompt_json, null, 2)
  );
  const [show_delete_dialog, set_show_delete_dialog] = useState(false);
  const [new_tag, set_new_tag] = useState("");
  const [is_adding_tag, set_is_adding_tag] = useState(false);

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
          <Image
            src={item.image_path}
            alt=""
            width={1024}
            height={1536}
            className="w-full h-auto"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : (
          <div className="w-full aspect-[3/4] flex items-center justify-center text-muted-foreground">
            <Archive className="size-12" />
          </div>
        )}

        {/* Overlay actions */}
        <div className="absolute top-2 right-2 flex gap-1">
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
            <span className="text-xs text-muted-foreground">
              {item.status}
            </span>
          </div>

          {/* Tags Section */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags?.map((t) => (
              <Badge key={t.id} variant="secondary" className="pl-2 pr-1 h-6">
                {t.tag}
                <button
                  onClick={() => handle_remove_tag(t.tag)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <div className="flex items-center gap-1 min-w-[120px]">
               <Input
                 value={new_tag}
                 onChange={(e) => set_new_tag(e.target.value)}
                 onKeyDown={(e) => {
                    if (e.key === "Enter") handle_add_tag();
                 }}
                 placeholder="Add tag..."
                 className="h-6 text-xs px-2 w-24"
               />
               <Button
                 size="icon"
                 variant="ghost"
                 className="h-6 w-6"
                 onClick={handle_add_tag}
                 disabled={is_adding_tag || !new_tag.trim()}
               >
                 <Plus className="size-3" />
               </Button>
            </div>
          </div>
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
            onClick={handle_use_prompt}
          >
            <Copy className="size-4 mr-2" />
            Use in Builder
          </Button>

          <div className="flex gap-2">
            {item.image_path && (
              <a
                href={item.image_path}
                download={`generation-${item.id}.png`}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="size-4 mr-2" />
                  Download
                </Button>
              </a>
            )}

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
    </div>
  );
};
