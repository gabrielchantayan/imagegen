"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { save_prompt } from "@/lib/hooks/use-prompts";

type SavePromptModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  prompt_json: Record<string, unknown>;
  on_saved?: () => void;
};

export const SavePromptModal = ({
  open,
  on_open_change,
  prompt_json,
  on_saved,
}: SavePromptModalProps) => {
  const [name, set_name] = useState("");
  const [description, set_description] = useState("");
  const [saving, set_saving] = useState(false);
  const [error, set_error] = useState("");

  const handle_save = async () => {
    if (!name.trim()) return;

    set_saving(true);
    set_error("");

    try {
      await save_prompt({
        name: name.trim(),
        description: description.trim() || undefined,
        prompt_json,
      });
      on_open_change(false);
      set_name("");
      set_description("");
      on_saved?.();
    } catch (err) {
      set_error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      set_saving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={on_open_change}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save Prompt</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => set_name(e.target.value)}
              placeholder="My awesome prompt"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => set_description(e.target.value)}
              placeholder="Brief description"
            />
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <Textarea
              value={JSON.stringify(prompt_json, null, 2)}
              readOnly
              className="font-mono text-xs h-32"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => on_open_change(false)}>
            Cancel
          </Button>
          <Button onClick={handle_save} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
