"use client";

import Image from "next/image";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GenerationWithFavorite } from "@/lib/types/database";

type HistoryCardProps = {
  item: GenerationWithFavorite;
  on_click: () => void;
  on_toggle_favorite: () => void;
};

export const HistoryCard = ({
  item,
  on_click,
  on_toggle_favorite,
}: HistoryCardProps) => {
  return (
    <div
      className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer bg-muted"
      onClick={on_click}
    >
      {item.image_path && (
        <Image
          src={item.image_path}
          alt=""
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <Button
        variant="ghost"
        size="icon"
        className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${
          item.is_favorite ? "opacity-100" : ""
        }`}
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

      <div className="absolute bottom-2 left-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
        {new Date(item.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};
