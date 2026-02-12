"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PromptsList } from "@/components/library/prompts-list";
import { use_builder_store } from "@/lib/stores/builder-store";
import { Button } from "@/components/ui/button";
import { ToolbarSlots } from "@/components/shared/toolbar-slots";
import type { SavedPrompt } from "@/lib/types/database";

export default function LibraryPage() {
  const router = useRouter();
  const load_prompt = use_builder_store((s) => s.load_prompt);

  const handle_select = (prompt: SavedPrompt) => {
    load_prompt(prompt.prompt_json);
    router.push("/builder");
  };

  const left_slot = useMemo(() => (
    <h1 className="text-lg font-semibold">Saved Prompts</h1>
  ), []);

  const right_slot = useMemo(() => (
    <Link href="/library/import-export">
      <Button variant="outline" size="sm">
        Import / Export
      </Button>
    </Link>
  ), []);

  return (
    <div className="container py-8">
      <ToolbarSlots left={left_slot} right={right_slot} />
      <PromptsList on_select={handle_select} />
    </div>
  );
}
