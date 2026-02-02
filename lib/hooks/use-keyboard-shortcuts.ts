"use client";

import { useEffect, useCallback } from "react";
import { use_builder_store } from "@/lib/stores/builder-store";

type KeyboardShortcutsOptions = {
  on_generate?: () => void;
  on_save?: () => void;
  on_search?: () => void;
};

export const use_keyboard_shortcuts = (options: KeyboardShortcutsOptions = {}) => {
  const composed_prompt = use_builder_store((s) => s.composed_prompt);
  const generation_status = use_builder_store((s) => s.generation_status);

  const handle_key_down = useCallback(
    (e: KeyboardEvent) => {
      const is_mod = e.metaKey || e.ctrlKey;

      // Ignore shortcuts when typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // Allow Cmd+Enter even in textareas
        if (!(is_mod && e.key === "Enter")) {
          return;
        }
      }

      // ⌘/Ctrl + Enter: Generate
      if (is_mod && e.key === "Enter") {
        e.preventDefault();
        if (composed_prompt && generation_status !== "generating") {
          options.on_generate?.();
        }
      }

      // ⌘/Ctrl + S: Save prompt
      if (is_mod && e.key === "s") {
        e.preventDefault();
        if (composed_prompt) {
          options.on_save?.();
        }
      }

      // ⌘/Ctrl + K: Search
      if (is_mod && e.key === "k") {
        e.preventDefault();
        options.on_search?.();
      }
    },
    [composed_prompt, generation_status, options]
  );

  useEffect(() => {
    document.addEventListener("keydown", handle_key_down);
    return () => document.removeEventListener("keydown", handle_key_down);
  }, [handle_key_down]);
};
