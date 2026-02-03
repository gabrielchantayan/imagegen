'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Pencil, Copy } from 'lucide-react';
import type { Component } from '@/lib/types/database';
import { cn } from '@/lib/utils';

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
  on_edit
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
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
      )}
      onClick={on_select}
    >
      <div className={cn("flex items-center gap-3 px-3 py-1.5", show_image && "pl-1.5")}>
        {/* Reference image thumbnail */}
        {show_image && (
          <div className="relative shrink-0 w-12 h-12 bg-muted/30 rounded-md overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={all_reference_paths[0]}
              alt=""
              className="w-full h-full object-cover"
            />
            {all_reference_paths.length > 1 && (
              <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[10px] px-1 rounded-tr-md">
                +{all_reference_paths.length - 1}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              "text-base font-semibold leading-tight tracking-tight pr-6",
              selected && "text-primary"
            )}>
              {component.name}
            </h3>
          </div>

          {component.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {component.description}
            </p>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-0 right-0 p-0">
          <div className="bg-primary text-primary-foreground rounded-bl-lg px-2 py-1 text-xs font-medium flex items-center justify-center min-w-[24px]">
            {selection_order ?? <Check className="size-3" />}
          </div>
        </div>
      )}

      {/* Edit Action - Visible on hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(JSON.stringify(component.data, null, 2));
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
            className="h-7 w-7 shadow-sm"
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
