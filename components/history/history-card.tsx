"use client";

import Image from "next/image";
import { Star, Check, User, RefreshCw, AlertTriangle, Sparkles, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GenerationWithFavorite } from "@/lib/types/database";

type HistoryCardProps = {
  item: GenerationWithFavorite;
  on_click: (e: React.MouseEvent) => void;
  on_toggle_favorite: () => void;
  is_select_mode?: boolean;
  is_selected?: boolean;
  is_focused?: boolean;
};

export const HistoryCard = ({
  item,
  on_click,
  on_toggle_favorite,
  is_select_mode = false,
  is_selected = false,
  is_focused = false,
}: HistoryCardProps) => {
  return (
    <div
      className={`
        group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer bg-muted
        transition-all duration-150
        ${is_selected ? "ring-2 ring-primary ring-offset-2" : ""}
        ${is_focused && !is_selected ? "ring-2 ring-sky-500 ring-offset-2 scale-[1.02] shadow-lg shadow-sky-500/25" : ""}
        ${!is_selected && !is_focused ? "hover:ring-1 hover:ring-muted-foreground/30" : ""}
      `}
      onClick={on_click}
    >
      {/* Image */}
      {item.image_path && (
        <Image
          src={item.image_path}
          alt=""
          fill
          className={`
            object-cover transition-transform
            ${!is_select_mode ? "group-hover:scale-105" : ""}
          `}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
        />
      )}

      {/* Gradient overlay */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-t from-black/60 via-transparent
          transition-opacity
          ${is_select_mode || is_selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
      />

      {/* Selection checkbox (select mode) */}
      {is_select_mode && (
        <div
          className={`
            absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center
            transition-all
            ${is_selected
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-background/80 border-muted-foreground/50"
            }
          `}
        >
          {is_selected && <Check className="w-4 h-4" />}
        </div>
      )}

      {/* Favorite button */}
      <Button
        variant="ghost"
        size="icon"
        className={`
          absolute top-2 right-2 transition-opacity
          ${item.is_favorite || is_select_mode ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
        onClick={(e) => {
          e.stopPropagation();
          on_toggle_favorite();
        }}
      >
        <Star
          className={`w-5 h-5 ${
            item.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-white"
          }`}
        />
      </Button>

      {/* Bottom info */}
      <div
        className={`
          absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white transition-opacity
          ${is_select_mode ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
      >
        <span>{new Date(item.created_at).toLocaleDateString()}</span>
        <div className="flex items-center gap-1">
          {item.parent_id && (
            <span
              className="flex items-center bg-violet-500/70 rounded px-1 py-0.5"
              title="AI Remix"
            >
              <Sparkles className="size-3" />
            </span>
          )}
          {item.reference_photo_ids && item.reference_photo_ids.length > 0 && (
            <span
              className="flex items-center gap-0.5 bg-black/50 rounded px-1 py-0.5"
              title={`${item.reference_photo_ids.length} reference${item.reference_photo_ids.length !== 1 ? "s" : ""} used`}
            >
              <User className="size-3" />
              {item.reference_photo_ids.length}
            </span>
          )}
          {item.used_fallback && !item.face_swap_failed && (
            <span
              className="flex items-center bg-amber-500/70 rounded px-1 py-0.5"
              title="Face swapped (fallback)"
            >
              <RefreshCw className="size-3" />
            </span>
          )}
          {item.face_swap_failed && (
            <span
              className="flex items-center bg-red-500/70 rounded px-1 py-0.5"
              title="Face swap failed"
            >
              <AlertTriangle className="size-3" />
            </span>
          )}
        </div>
      </div>

      {/* Hidden indicator overlay */}
      {item.is_hidden && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none flex items-center justify-center">
          <EyeOff className="size-6 text-white/70" />
        </div>
      )}

      {/* Selected indicator overlay */}
      {is_selected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
      )}
    </div>
  );
};
