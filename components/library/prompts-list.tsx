"use client";

import { useState } from "react";
import { use_prompts, delete_prompt } from "@/lib/hooks/use-prompts";
import { PromptCard } from "./prompt-card";
import { Input } from "@/components/ui/input";
import type { SavedPrompt } from "@/lib/types/database";

type PromptsListProps = {
  on_select: (prompt: SavedPrompt) => void;
};

export const PromptsList = ({ on_select }: PromptsListProps) => {
  const [search, set_search] = useState("");
  const { prompts, is_loading, mutate } = use_prompts(search);

  const handle_delete = async (id: string) => {
    if (!confirm("Delete this prompt?")) return;
    await delete_prompt(id);
    mutate();
  };

  if (is_loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Input
        placeholder="Search prompts..."
        value={search}
        onChange={(e) => set_search(e.target.value)}
        className="mb-4 max-w-xs"
      />

      {prompts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "No prompts match your search." : "No saved prompts yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              on_select={() => on_select(prompt)}
              on_delete={() => handle_delete(prompt.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
