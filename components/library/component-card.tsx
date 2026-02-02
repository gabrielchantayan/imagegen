'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import type { Component } from '@/lib/types/database';

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
      className={`cursor-pointer transition-colors relative ${
        selected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      }`}
      onClick={on_select}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 left-2 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
          {selection_order ?? <Check className="size-3" />}
        </div>
      )}

      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <CardTitle className={`text-sm font-medium ${selected ? 'pl-7' : ''}`}>
            {component.name}
          </CardTitle>
          {on_edit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                on_edit();
              }}
            >
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      {component.description && (
        <CardContent className="p-4 pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {component.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
};
