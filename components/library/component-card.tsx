"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Pencil, Copy } from "lucide-react";
import type { Component } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type ComponentCardProps = {
  component: Component;
  selected?: boolean;
  selection_order?: number;
  show_inline_references?: boolean;
  show_face_references?: boolean;
  face_reference_paths?: string[];
  on_select?: () => void;
  on_edit?: () => void;
};

export const ComponentCard = ({
  component,
  selected,
  selection_order,
  show_inline_references = true,
  show_face_references = true,
  face_reference_paths,
  on_select,
  on_edit,
}: ComponentCardProps) => {
  // Combine inline references and face references based on settings
  const all_reference_paths = [
    ...(show_inline_references ? (component.inline_references ?? []) : []),
    ...(show_face_references ? (face_reference_paths ?? []) : []),
  ];
  const has_references = all_reference_paths.length > 0;
  const show_image = has_references;

  return (
    <Card
      className={cn(
        "group relative cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden w-full",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:border-primary/50",
        show_image ? "py-1.5" : "pl-2",
      )}
      onClick={on_select}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-0.5",
          show_image && "pl-1.5",
        )}
      >
        {/* Reference image thumbnail */}
        {show_image && (
          <div className="overflow-hidden relative w-12 h-12 rounded-md border shrink-0 bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={all_reference_paths[0]}
              alt=""
              className="object-cover w-full h-full"
            />
            {all_reference_paths.length > 1 && (
              <div className="absolute bottom-0 left-0 px-1 text-white rounded-tr-md bg-black/60 text-[10px]">
                +{all_reference_paths.length - 1}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 justify-between items-start">
            <h3
              className={cn(
                "text-base font-semibold leading-tight tracking-tight pr-6",
                selected && "text-primary",
              )}
            >
              {component.name}
            </h3>
          </div>

          {component.description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {component.description}
            </p>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-0 right-0 p-0">
          <div className="flex justify-center items-center py-1 px-2 text-xs font-medium rounded-bl-lg bg-primary text-primary-foreground min-w-[24px]">
            {selection_order ?? <Check className="size-3" />}
          </div>
        </div>
      )}

      {/* Edit Action - Visible on hover */}
      <div className="flex absolute right-2 bottom-2 gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <Button
          variant="secondary"
          size="icon"
          className="w-7 h-7 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(
              JSON.stringify(component.data, null, 2),
            );
          }}
          title="Copy JSON"
        >
          <Copy className="size-3.5" />
          <span className="sr-only">Copy JSON</span>
        </Button>
        {on_edit && (
          <Button
            variant="secondary"
            size="icon"
            className="w-7 h-7 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              on_edit();
            }}
          >
            <Pencil className="size-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
      </div>
    </Card>
  );
};
