"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { SavedPrompt } from "@/lib/types/database";

type PromptCardProps = {
  prompt: SavedPrompt;
  on_select: () => void;
  on_delete: () => void;
};

export const PromptCard = ({
  prompt,
  on_select,
  on_delete,
}: PromptCardProps) => {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={on_select}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{prompt.name}</CardTitle>
            {prompt.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {prompt.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              on_delete();
            }}
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(prompt.updated_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
};
