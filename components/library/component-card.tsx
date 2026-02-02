'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Pencil } from 'lucide-react';
import type { Component } from '@/lib/types/database';
import { cn } from '@/lib/utils';

type ComponentCardProps = {
  component: Component;
  selected?: boolean;
  selection_order?: number;
  on_select?: () => void;
  on_edit?: () => void;
};

export const ComponentCard = ({
  component,
  selected,
  selection_order,
  on_select,
  on_edit
}: ComponentCardProps) => {
  return (
    <Card
      className={cn(
        "group relative cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden w-full",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
      )}
      onClick={on_select}
    >
      <div className="px-3 py-1.5">
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

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-0 right-0 p-0">
          <div className="bg-primary text-primary-foreground rounded-bl-lg px-2 py-1 text-xs font-medium flex items-center justify-center min-w-[24px]">
            {selection_order ?? <Check className="size-3" />}
          </div>
        </div>
      )}

      {/* Edit Action - Visible on hover */}
      {on_edit && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
        </div>
      )}
    </Card>
  );
};
