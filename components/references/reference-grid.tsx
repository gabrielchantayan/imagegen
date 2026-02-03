"use client";

import { Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReferencePhoto } from "@/lib/types/database";

type ReferenceGridProps = {
  references: ReferencePhoto[];
  selected_ids: string[];
  on_toggle: (id: string) => void;
  auto_selected_ids?: string[];
  compact?: boolean;
};

export const ReferenceGrid = ({
  references,
  selected_ids,
  on_toggle,
  auto_selected_ids = [],
  compact = false,
}: ReferenceGridProps) => {
  if (references.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <User className="size-8 mb-2 opacity-50" />
        <p className="text-sm">No reference photos</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
      )}
    >
      {references.map((ref) => {
        const is_selected = selected_ids.includes(ref.id);
        const is_auto = auto_selected_ids.includes(ref.id);

        return (
          <button
            key={ref.id}
            onClick={() => on_toggle(ref.id)}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
              "hover:ring-2 hover:ring-primary/50 hover:ring-offset-1",
              is_selected
                ? "border-primary ring-2 ring-primary/30"
                : "border-transparent hover:border-primary/30"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ref.image_path}
              alt={ref.name}
              className="w-full h-full object-cover"
            />

            {/* Selection checkbox overlay */}
            <div
              className={cn(
                "absolute inset-0 flex items-start justify-end p-1",
                is_selected ? "bg-primary/10" : ""
              )}
            >
              <div
                className={cn(
                  "size-5 rounded-full flex items-center justify-center transition-all",
                  is_selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-black/40 text-white/70"
                )}
              >
                {is_selected && <Check className="size-3" />}
              </div>
            </div>

            {/* Auto-selected indicator */}
            {is_auto && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-0.5">
                <span className="text-[10px] text-white/90 font-medium">
                  Default
                </span>
              </div>
            )}

            {/* Name tooltip on hover */}
            {!compact && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{ref.name}</p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
