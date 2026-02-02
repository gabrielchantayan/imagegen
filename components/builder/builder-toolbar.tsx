"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsDropdown } from "./settings-dropdown";
import { use_builder_store } from "@/lib/stores/builder-store";
import { submit_generation } from "@/lib/hooks/use-generation";
import { SavePromptModal } from "@/components/library/save-prompt-modal";
import Link from "next/link";
import { Sparkles, Save, Trash2, History, Library, BarChart3 } from "lucide-react";

export const BuilderToolbar = () => {
  const [save_modal_open, set_save_modal_open] = useState(false);

  const clear_builder = use_builder_store((s) => s.clear_builder);
  const composed_prompt = use_builder_store((s) => s.composed_prompt);
  const generation_status = use_builder_store((s) => s.generation_status);
  const queue_position = use_builder_store((s) => s.queue_position);
  const settings = use_builder_store((s) => s.settings);
  const set_generation_status = use_builder_store((s) => s.set_generation_status);
  const set_queue_position = use_builder_store((s) => s.set_queue_position);
  const set_generation_error = use_builder_store((s) => s.set_generation_error);
  const set_last_generated_image = use_builder_store((s) => s.set_last_generated_image);

  const generation_id_ref = useRef<string | null>(null);
  const polling_ref = useRef<NodeJS.Timeout | null>(null);

  const stop_polling = useCallback(() => {
    if (polling_ref.current) {
      clearInterval(polling_ref.current);
      polling_ref.current = null;
    }
  }, []);

  const poll_status = useCallback(async () => {
    if (!generation_id_ref.current) return;

    try {
      const res = await fetch(`/api/generate/${generation_id_ref.current}/status`);
      const data = await res.json();

      if (data.status === "generating") {
        set_generation_status("generating");
        set_queue_position(null);
      } else if (data.status === "completed") {
        set_generation_status("completed");
        set_last_generated_image(data.image_path);
        set_queue_position(null);
        stop_polling();
      } else if (data.status === "failed") {
        set_generation_status("failed");
        set_generation_error(data.error || "Generation failed");
        set_queue_position(null);
        stop_polling();
      }
    } catch (error) {
      console.error("Failed to poll status:", error);
    }
  }, [set_generation_status, set_last_generated_image, set_generation_error, set_queue_position, stop_polling]);

  const handle_generate = useCallback(async () => {
    if (!composed_prompt) return;

    set_generation_status("queued");
    set_generation_error(null);

    try {
      const result = await submit_generation(composed_prompt, {
        aspect_ratio: settings.aspect_ratio,
        count: settings.image_count,
      });

      generation_id_ref.current = result.generation_id;
      set_queue_position(result.position);

      polling_ref.current = setInterval(poll_status, 2000);
      poll_status();
    } catch (error) {
      set_generation_status("failed");
      set_generation_error(error instanceof Error ? error.message : "Failed to submit generation");
    }
  }, [composed_prompt, settings, set_generation_status, set_generation_error, set_queue_position, poll_status]);

  const handle_save_prompt = () => {
    set_save_modal_open(true);
  };

  useEffect(() => {
    const handle_keydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (composed_prompt && generation_status === "idle") {
          handle_generate();
        }
      }
    };

    window.addEventListener("keydown", handle_keydown);
    return () => window.removeEventListener("keydown", handle_keydown);
  }, [composed_prompt, generation_status, handle_generate]);

  useEffect(() => {
    return () => stop_polling();
  }, [stop_polling]);

  const is_generating = generation_status === "generating" || generation_status === "queued";

  return (
    <div className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Button 
          onClick={handle_generate} 
          disabled={!composed_prompt || is_generating}
          className="bg-primary hover:bg-primary/90 shadow-sm transition-all"
        >
          <Sparkles className="size-4 mr-2" />
          {is_generating ? "Generating..." : "Generate"}
        </Button>

        <Button 
          variant="outline" 
          onClick={handle_save_prompt} 
          disabled={!composed_prompt}
          className="border-primary/20 hover:border-primary/50 text-foreground"
        >
          <Save className="size-4 mr-2" />
          Save
        </Button>

        <div className="h-6 w-px bg-border mx-2" />

        <Button 
          variant="ghost" 
          size="sm"
          onClick={clear_builder}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4 mr-2" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-1">
         {queue_position !== null && (
          <div className="flex items-center gap-2 mr-4 text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Queue: {queue_position}/5
          </div>
        )}

        <div className="flex items-center border rounded-lg p-1 mr-2">
          <Link href="/history">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
              <History className="size-4 mr-1.5" />
              History
            </Button>
          </Link>

          <div className="w-px h-4 bg-border mx-1" />

          <Link href="/library">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
              <Library className="size-4 mr-1.5" />
              Library
            </Button>
          </Link>
          
           <div className="w-px h-4 bg-border mx-1" />

          <Link href="/admin">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
              <BarChart3 className="size-4 mr-1.5" />
              Stats
            </Button>
          </Link>
        </div>

        <SettingsDropdown />
      </div>

      <SavePromptModal
        open={save_modal_open}
        on_open_change={set_save_modal_open}
        prompt_json={composed_prompt || {}}
      />
    </div>
  );
};
