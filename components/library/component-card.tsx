'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Component } from '@/lib/types/database';

type ComponentCardProps = {
  component: Component;
  selected?: boolean;
  on_select?: () => void;
  on_edit?: () => void;
};

export const ComponentCard = ({
  component,
  selected,
  on_select,
  on_edit
}: ComponentCardProps) => {
  return (
    <Card
      className={`cursor-pointer transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      }`}
      onClick={on_select}
    >
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">
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
