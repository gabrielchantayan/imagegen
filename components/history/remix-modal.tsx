"use client";

import { useState } from "react";
import { GitFork, Replace, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ModalDialog } from "@/components/ui/modal-dialog";
import type { GenerationWithFavorite } from "@/lib/types/database";

type RemixModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  source: GenerationWithFavorite;
  on_submit: (instructions: string, mode: "fork" | "replace") => Promise<void>;
};

const EXAMPLE_INSTRUCTIONS = [
  "Change hair color to red",
  "Add a warm sunset lighting",
  "Change the background to a forest",
  "Make the clothing blue instead of green",
  "Add glasses",
  "Change expression to smiling",
];

export const RemixModal = ({
  open,
  on_open_change,
  source,
  on_submit,
}: RemixModalProps) => {
  const [instructions, set_instructions] = useState("");
  const [is_submitting, set_is_submitting] = useState(false);
  const [submit_mode, set_submit_mode] = useState<"fork" | "replace" | null>(null);

  const handle_submit = async (mode: "fork" | "replace") => {
    if (!instructions.trim() || is_submitting) return;

    set_is_submitting(true);
    set_submit_mode(mode);

    try {
      await on_submit(instructions.trim(), mode);
      set_instructions("");
      on_open_change(false);
    } finally {
      set_is_submitting(false);
      set_submit_mode(null);
    }
  };

  const handle_example_click = (example: string) => {
    set_instructions(example);
  };

  return (
    <ModalDialog
      open={open}
      on_open_change={on_open_change}
      title="Remix Image"
      description="Edit this image with AI-powered changes"
      size="lg"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => handle_submit("replace")}
            disabled={!instructions.trim() || is_submitting}
          >
            {is_submitting && submit_mode === "replace" ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Replace className="size-4 mr-2" />
            )}
            Replace Original
          </Button>
          <Button
            onClick={() => handle_submit("fork")}
            disabled={!instructions.trim() || is_submitting}
          >
            {is_submitting && submit_mode === "fork" ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <GitFork className="size-4 mr-2" />
            )}
            Save as New
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[180px_1fr] gap-6">
        {/* Source image preview */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Source Image</Label>
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
            {source.image_path && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={source.image_path}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Edit instructions */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructions">Edit Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => set_instructions(e.target.value)}
              placeholder="Describe what changes you want to make to this image..."
              className="min-h-[120px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Examples</Label>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_INSTRUCTIONS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handle_example_click(example)}
                  className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Save as New:</strong> Creates a new image linked to this one, preserving the original.
            <br />
            <strong>Replace Original:</strong> Updates this image in place (archives the old version).
          </div>
        </div>
      </div>
    </ModalDialog>
  );
};
