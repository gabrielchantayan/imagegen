"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Download, Trash2, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import type { GenerationWithFavorite } from "@/lib/types/database";

type HistoryDetailModalProps = {
  item: GenerationWithFavorite | null;
  on_close: () => void;
  on_toggle_favorite: (id: string) => void;
  on_delete: (id: string) => void;
  on_use_prompt: (prompt: Record<string, unknown>) => void;
};

export const HistoryDetailModal = ({
  item,
  on_close,
  on_toggle_favorite,
  on_delete,
  on_use_prompt,
}: HistoryDetailModalProps) => {
  const [show_delete_dialog, set_show_delete_dialog] = useState(false);

  if (!item) return null;

  const handle_delete = () => {
    set_show_delete_dialog(false);
    on_delete(item.id);
    on_close();
  };

  return (
    <AlertDialog open={!!item} onOpenChange={() => on_close()}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center justify-between">
            <span>{new Date(item.created_at).toLocaleString()}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => on_toggle_favorite(item.id)}
              >
                <Star
                  className={`w-5 h-5 ${
                    item.is_favorite ? "fill-yellow-400 text-yellow-400" : ""
                  }`}
                />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => set_show_delete_dialog(true)}>
                <Trash2 className="w-5 h-5 text-destructive" />
              </Button>
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex gap-4 overflow-hidden min-h-0 flex-1">
          <div className="w-1/2 relative aspect-[3/4] flex-shrink-0">
            {item.image_path ? (
              <Image
                src={item.image_path}
                alt=""
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>

          <div className="w-1/2 flex flex-col min-h-0">
            <Textarea
              value={JSON.stringify(item.prompt_json, null, 2)}
              readOnly
              className="flex-1 font-mono text-xs resize-none"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => on_use_prompt(item.prompt_json)}>
            <Copy className="w-4 h-4 mr-2" />
            Use Prompt
          </Button>
          {item.image_path && (
            <a
              href={item.image_path}
              download
              className="inline-flex items-center justify-center h-8 gap-1.5 px-2.5 rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground text-sm font-medium transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </a>
          )}
          <Button variant="outline" onClick={on_close}>
            Close
          </Button>
        </AlertDialogFooter>

        <AlertDialog open={show_delete_dialog} onOpenChange={set_show_delete_dialog}>
          <AlertDialogContent className="w-lg max-w-lg">
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
      </AlertDialogContent>
    </AlertDialog>
  );
};
