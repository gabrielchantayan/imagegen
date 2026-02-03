"use client";

import { useEffect, useCallback } from "react";
import { use_builder_store } from "@/lib/stores/builder-store";

type KeyboardShortcutsOptions = {
  on_generate?: () => void;
  on_save?: () => void;
  on_search?: () => void;
  on_show_shortcuts?: () => void;
};

export const use_keyboard_shortcuts = (options: KeyboardShortcutsOptions = {}) => {
  const composed_prompt = use_builder_store((s) => s.composed_prompt);
  const generation_status = use_builder_store((s) => s.generation_status);
  const can_undo = use_builder_store((s) => s.can_undo);
  const can_redo = use_builder_store((s) => s.can_redo);
  const undo = use_builder_store((s) => s.undo);
  const redo = use_builder_store((s) => s.redo);

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

      // ⌘/Ctrl + Z: Undo
      if (is_mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (can_undo) {
          undo();
        }
      }

      // ⌘/Ctrl + Shift + Z or ⌘/Ctrl + Y: Redo
      if ((is_mod && e.shiftKey && e.key === "z") || (is_mod && e.key === "y")) {
        e.preventDefault();
        if (can_redo) {
          redo();
        }
      }

      // ⌘/Ctrl + ? (⌘/Ctrl + Shift + /): Show keyboard shortcuts
      if (is_mod && e.shiftKey && e.key === "/") {
        e.preventDefault();
        options.on_show_shortcuts?.();
      }
    },
    [composed_prompt, generation_status, options, can_undo, can_redo, undo, redo]
  );

  useEffect(() => {
    document.addEventListener("keydown", handle_key_down);
    return () => document.removeEventListener("keydown", handle_key_down);
  }, [handle_key_down]);
};
