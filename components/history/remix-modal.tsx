"use client";

import { useState, useRef, useEffect } from "react";
import { GitFork, Replace, Loader2, Bookmark, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ModalDialog } from "@/components/ui/modal-dialog";
import type { GenerationWithFavorite } from "@/lib/types/database";
import {
  use_remix_prompts,
  save_remix_prompt,
  delete_remix_prompt,
} from "@/lib/hooks/use-remix-prompts";

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
  const [is_saving, set_is_saving] = useState(false);
  const [is_naming, set_is_naming] = useState(false);
  const [save_name, set_save_name] = useState("");
  const name_input_ref = useRef<HTMLInputElement>(null);
  const { prompts: saved_prompts, mutate } = use_remix_prompts();

  useEffect(() => {
    if (is_naming) {
      name_input_ref.current?.select();
    }
  }, [is_naming]);

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

  const handle_chip_click = (text: string) => {
    set_instructions(text);
  };

  const handle_start_save = () => {
    const trimmed = instructions.trim();
    if (!trimmed) return;
    const default_name = trimmed.length > 40 ? trimmed.slice(0, 40) + "..." : trimmed;
    set_save_name(default_name);
    set_is_naming(true);
  };

  const handle_confirm_save = async () => {
    const trimmed_name = save_name.trim();
    const trimmed_instructions = instructions.trim();
    if (!trimmed_name || !trimmed_instructions || is_saving) return;

    set_is_saving(true);
    try {
      await save_remix_prompt({ name: trimmed_name, instructions: trimmed_instructions });
      await mutate();
      set_is_naming(false);
      set_save_name("");
    } finally {
      set_is_saving(false);
    }
  };

  const handle_cancel_save = () => {
    set_is_naming(false);
    set_save_name("");
  };

  const handle_delete = async (id: string) => {
    await delete_remix_prompt(id);
    await mutate();
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="instructions">Edit Instructions</Label>
              {is_naming ? (
                <div className="flex items-center gap-1">
                  <Input
                    ref={name_input_ref}
                    value={save_name}
                    onChange={(e) => set_save_name(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handle_confirm_save();
                      if (e.key === "Escape") handle_cancel_save();
                    }}
                    placeholder="Name..."
                    className="h-6 text-xs w-40"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={!save_name.trim() || is_saving}
                    onClick={handle_confirm_save}
                  >
                    {is_saving ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Check className="size-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handle_cancel_save}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  disabled={!instructions.trim()}
                  onClick={handle_start_save}
                >
                  <Bookmark className="size-3 mr-1" />
                  Save
                </Button>
              )}
            </div>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => set_instructions(e.target.value)}
              placeholder="Describe what changes you want to make to this image..."
              className="min-h-[120px] resize-none"
            />
          </div>

          {saved_prompts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Saved</Label>
              <div className="flex flex-wrap gap-2">
                {saved_prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => handle_chip_click(prompt.instructions)}
                    className="group relative text-xs px-2 py-1 pr-6 rounded-md bg-primary/10 hover:bg-primary/20 text-foreground transition-colors"
                  >
                    {prompt.name}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handle_delete(prompt.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          handle_delete(prompt.id);
                        }
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-primary/20"
                    >
                      <X className="size-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Examples</Label>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_INSTRUCTIONS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handle_chip_click(example)}
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
