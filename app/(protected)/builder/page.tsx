"use client";

import { BuilderLayout } from "@/components/builder/builder-layout";
import { use_keyboard_shortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

export default function BuilderPage() {
  // Set up keyboard shortcuts
  use_keyboard_shortcuts({
    on_generate: () => {
      // Will be implemented in spec 04
      console.log("Generate shortcut triggered");
    },
    on_save: () => {
      // Will be implemented in spec 07
      console.log("Save shortcut triggered");
    },
    on_search: () => {
      // Focus search input
      const search_input = document.querySelector<HTMLInputElement>(
        'input[placeholder="Search components..."]'
      );
      search_input?.focus();
    },
  });

  return <BuilderLayout />;
}
