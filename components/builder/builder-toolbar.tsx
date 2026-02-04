"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsDropdown } from "./settings-dropdown";
import { use_builder_store } from "@/lib/stores/builder-store";
import { submit_generation, type ComponentUsedInput } from "@/lib/hooks/use-generation";
import { SavePromptModal } from "@/components/library/save-prompt-modal";
import { SaveTemplateModal } from "@/components/builder/save-template-modal";
import { KeyboardShortcutsModal } from "@/components/ui/keyboard-shortcuts-modal";
import { use_keyboard_shortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Sparkles, Save, Trash2, History, Library, BarChart3, Layers, Keyboard, FileText, LayoutTemplate, ChevronDown } from "lucide-react";
import type { Component } from "@/lib/types/database";

// Helper to collect all selected components for tagging
const collect_components_used = (
  subjects: { id: string; selections: Record<string, Component[]> }[],
  shared_selections: Record<string, Component[]>
): ComponentUsedInput[] => {
  const components: ComponentUsedInput[] = [];

  // Collect from all subjects
  for (const subject of subjects) {
    for (const [category_id, category_components] of Object.entries(subject.selections)) {
      for (const component of category_components) {
        components.push({
          id: component.id,
          name: component.name,
          category_id,
        });
      }
    }
  }

  // Collect from shared selections
  for (const [category_id, category_components] of Object.entries(shared_selections)) {
    for (const component of category_components) {
      components.push({
        id: component.id,
        name: component.name,
        category_id,
      });
    }
  }

  return components;
};

// Helper to collect inline references from all selected components
const collect_inline_references = (
  subjects: { id: string; selections: Record<string, Component[]> }[],
  shared_selections: Record<string, Component[]>
): string[] => {
  const paths = new Set<string>();

  // Collect from all subjects
  for (const subject of subjects) {
    for (const category_components of Object.values(subject.selections)) {
      for (const component of category_components) {
        if (component.inline_references) {
          for (const path of component.inline_references) {
            paths.add(path);
          }
        }
      }
    }
  }

  // Collect from shared selections
  for (const category_components of Object.values(shared_selections)) {
    for (const component of category_components) {
      if (component.inline_references) {
        for (const path of component.inline_references) {
          paths.add(path);
        }
      }
    }
  }

  return Array.from(paths);
};

// Helper to collect all component IDs (for templates)
const collect_component_ids = (
  subjects: { id: string; selections: Record<string, Component[]> }[]
): string[] => {
  const ids: string[] = [];
  for (const subject of subjects) {
    for (const category_components of Object.values(subject.selections)) {
      for (const component of category_components) {
        ids.push(component.id);
      }
    }
  }
  return ids;
};

const collect_shared_component_ids = (
  shared_selections: Record<string, Component[]>
): string[] => {
  const ids: string[] = [];
  for (const category_components of Object.values(shared_selections)) {
    for (const component of category_components) {
      ids.push(component.id);
    }
  }
  return ids;
};

export const BuilderToolbar = () => {
  const [save_modal_open, set_save_modal_open] = useState(false);
  const [save_template_modal_open, set_save_template_modal_open] = useState(false);
  const [shortcuts_modal_open, set_shortcuts_modal_open] = useState(false);

  const clear_builder = use_builder_store((s) => s.clear_builder);
  const composed_prompt = use_builder_store((s) => s.composed_prompt);
  const generation_status = use_builder_store((s) => s.generation_status);
  const queue_position = use_builder_store((s) => s.queue_position);
  const settings = use_builder_store((s) => s.settings);
  const selected_reference_ids = use_builder_store((s) => s.selected_reference_ids);
  const subjects = use_builder_store((s) => s.subjects);
  const shared_selections = use_builder_store((s) => s.shared_selections);
  const set_generation_status = use_builder_store((s) => s.set_generation_status);
  const set_queue_position = use_builder_store((s) => s.set_queue_position);
  const set_generation_error = use_builder_store((s) => s.set_generation_error);
  const set_last_generated_image = use_builder_store((s) => s.set_last_generated_image);

  const generation_id_ref = useRef<string | null>(null);
  const polling_ref = useRef<NodeJS.Timeout | null>(null);
  const polling_start_ref = useRef<number | null>(null);
  const error_count_ref = useRef<number>(0);
  const completed_ref = useRef<boolean>(false);

  // Max polling duration: 5 minutes
  const MAX_POLLING_DURATION_MS = 5 * 60 * 1000;
  // Max consecutive errors before giving up
  const MAX_CONSECUTIVE_ERRORS = 5;

  const stop_polling = useCallback(() => {
    if (polling_ref.current) {
      clearInterval(polling_ref.current);
      polling_ref.current = null;
    }
    polling_start_ref.current = null;
    error_count_ref.current = 0;
    completed_ref.current = true;
  }, []);

  const poll_status = useCallback(async () => {
    if (!generation_id_ref.current) return;

    // Skip if we've already completed/failed (prevents race conditions with in-flight requests)
    if (completed_ref.current) return;

    // Check for timeout
    if (polling_start_ref.current && Date.now() - polling_start_ref.current > MAX_POLLING_DURATION_MS) {
      console.error("Generation polling timed out");
      set_generation_status("failed");
      set_generation_error("Generation timed out. Please try again.");
      set_queue_position(null);
      stop_polling();
      return;
    }

    try {
      const res = await fetch(`/api/generate/${generation_id_ref.current}/status`);
      const data = await res.json();

      // Double-check we haven't completed while waiting for this fetch
      if (completed_ref.current) return;

      // Reset error count on successful fetch
      error_count_ref.current = 0;

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
      error_count_ref.current += 1;

      // Give up after too many consecutive errors
      if (error_count_ref.current >= MAX_CONSECUTIVE_ERRORS) {
        set_generation_status("failed");
        set_generation_error("Lost connection to server. Please check your generation in History.");
        set_queue_position(null);
        stop_polling();
      }
    }
  }, [set_generation_status, set_last_generated_image, set_generation_error, set_queue_position, stop_polling]);

  const handle_generate = useCallback(async () => {
    if (!composed_prompt) return;

    set_generation_status("queued");
    set_generation_error(null);

    // Collect all selected components for tagging
    const components_used = collect_components_used(subjects, shared_selections);

    // Collect inline references from selected components
    const inline_reference_paths = collect_inline_references(subjects, shared_selections);

    try {
      const result = await submit_generation(composed_prompt, {
        aspect_ratio: settings.aspect_ratio,
        count: settings.image_count,
        reference_photo_ids: selected_reference_ids.length > 0 ? selected_reference_ids : undefined,
        inline_reference_paths: inline_reference_paths.length > 0 ? inline_reference_paths : undefined,
        components_used: components_used.length > 0 ? components_used : undefined,
        google_search: settings.google_search,
        safety_override: settings.safety_override,
      });

      generation_id_ref.current = result.generation_id;
      set_queue_position(result.position);

      polling_start_ref.current = Date.now();
      error_count_ref.current = 0;
      completed_ref.current = false;
      polling_ref.current = setInterval(poll_status, 2000);
      poll_status();
    } catch (error) {
      set_generation_status("failed");
      set_generation_error(error instanceof Error ? error.message : "Failed to submit generation");
    }
  }, [composed_prompt, settings, selected_reference_ids, subjects, shared_selections, set_generation_status, set_generation_error, set_queue_position, poll_status]);

  const handle_save_prompt = () => {
    set_save_modal_open(true);
  };

  use_keyboard_shortcuts({
    on_generate: handle_generate,
    on_save: handle_save_prompt,
    on_show_shortcuts: () => set_shortcuts_modal_open(true),
  });

  useEffect(() => {
    return () => stop_polling();
  }, [stop_polling]);

  const is_generating = generation_status === "generating" || generation_status === "queued";

  return (
    <div className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Button
          onClick={handle_generate}
          disabled={!composed_prompt}
          className="bg-primary hover:bg-primary/90 shadow-sm transition-all"
        >
          <Sparkles className="size-4 mr-2" />
          {is_generating ? "Add to Queue" : "Generate"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!composed_prompt}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-sm border-primary/20 hover:border-primary/50 text-foreground h-9 px-4 py-2"
          >
            <Save className="size-4" />
            Save
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handle_save_prompt}>
              <FileText className="size-4 mr-2" />
              Save as Prompt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => set_save_template_modal_open(true)}>
              <LayoutTemplate className="size-4 mr-2" />
              Save as Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

          <Link href="/queue">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
              <Layers className="size-4 mr-1.5" />
              Queue
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

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => set_shortcuts_modal_open(true)}
          title="Keyboard shortcuts (⌘?)"
        >
          <Keyboard className="size-4" />
        </Button>

        <SettingsDropdown />
      </div>

      <SavePromptModal
        open={save_modal_open}
        on_open_change={set_save_modal_open}
        prompt_json={composed_prompt || {}}
      />

      <SaveTemplateModal
        open={save_template_modal_open}
        on_open_change={set_save_template_modal_open}
        component_ids={collect_component_ids(subjects)}
        shared_component_ids={collect_shared_component_ids(shared_selections)}
      />

      <KeyboardShortcutsModal
        open={shortcuts_modal_open}
        on_open_change={set_shortcuts_modal_open}
        context="builder"
      />
    </div>
  );
};
