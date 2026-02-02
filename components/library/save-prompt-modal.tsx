"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
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
      <AlertDialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="flex flex-col">
           {/* Header */}
          <div className="px-6 py-4 border-b bg-background">
             <AlertDialogTitle className="text-lg font-semibold tracking-tight">Save Prompt</AlertDialogTitle>
             <p className="text-sm text-muted-foreground mt-1">
               Save this composition to your library
             </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => set_name(e.target.value)}
                placeholder="e.g., Cyberpunk Street Scene"
                className="bg-background"
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => set_description(e.target.value)}
                placeholder="Add a brief description..."
                className="bg-background"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Preview</Label>
              <div className="rounded-md border bg-muted/20 p-3 max-h-[120px] overflow-y-auto">
                <pre className="text-[10px] leading-relaxed font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(prompt_json, null, 2)}
                </pre>
              </div>
            </div>

            {error && (
               <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center justify-center">
                 {error}
               </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-muted/5 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => on_open_change(false)}>
              Cancel
            </Button>
            <Button onClick={handle_save} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save Prompt"}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
