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

        <Link href="/history">
          <Button variant="ghost">
            <History className="size-4 mr-2" />
            History
          </Button>
        </Link>

        <Link href="/library">
          <Button variant="ghost">
            <Library className="size-4 mr-2" />
            Library
          </Button>
        </Link>

        <Link href="/admin">
          <Button variant="ghost">
            <BarChart3 className="size-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {queue_position !== null && (
          <span className="text-sm text-muted-foreground">Queue: {queue_position}/5</span>
        )}

        <span className="text-xs text-muted-foreground">⌘Enter to generate</span>

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
