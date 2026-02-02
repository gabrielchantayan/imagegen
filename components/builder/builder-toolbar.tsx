"use client";

import { Button } from "@/components/ui/button";
import { SettingsDropdown } from "./settings-dropdown";
import { use_builder_store } from "@/lib/stores/builder-store";
import { Sparkles, Save, Trash2 } from "lucide-react";

export const BuilderToolbar = () => {
  const clear_builder = use_builder_store((s) => s.clear_builder);
  const composed_prompt = use_builder_store((s) => s.composed_prompt);
  const generation_status = use_builder_store((s) => s.generation_status);
  const queue_position = use_builder_store((s) => s.queue_position);

  const handle_generate = async () => {
    // Will be implemented in 04-generation-system.md
    console.log("Generate clicked - will be implemented in spec 04");
  };

  const handle_save_prompt = async () => {
    // Will be implemented in 07-saved-prompts.md
    console.log("Save prompt clicked - will be implemented in spec 07");
  };

  const is_generating = generation_status === "generating" || generation_status === "queued";

  return (
    <div className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Button onClick={handle_generate} disabled={!composed_prompt || is_generating}>
          <Sparkles className="size-4 mr-2" />
          {is_generating ? "Generating..." : "Generate"}
        </Button>

        <Button variant="outline" onClick={handle_save_prompt} disabled={!composed_prompt}>
          <Save className="size-4 mr-2" />
          Save Prompt
        </Button>

        <Button variant="ghost" onClick={clear_builder}>
          <Trash2 className="size-4 mr-2" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {queue_position !== null && (
          <span className="text-sm text-muted-foreground">Queue: {queue_position}/5</span>
        )}

        <span className="text-xs text-muted-foreground">⌘Enter to generate</span>

        <SettingsDropdown />
      </div>
    </div>
  );
};
