"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PromptsList } from "@/components/library/prompts-list";
import { use_builder_store } from "@/lib/stores/builder-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { SavedPrompt } from "@/lib/types/database";

export default function LibraryPage() {
  const router = useRouter();
  const load_prompt = use_builder_store((s) => s.load_prompt);

  const handle_select = (prompt: SavedPrompt) => {
    load_prompt(prompt.prompt_json);
    router.push("/builder");
  };

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/builder">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Saved Prompts</h1>
      </div>
      <PromptsList on_select={handle_select} />
    </div>
  );
}
