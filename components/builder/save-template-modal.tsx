"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Loader2 } from "lucide-react";

type SaveTemplateModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  component_ids: string[];
  shared_component_ids: string[];
  thumbnail_generation_id?: string;
};

export const SaveTemplateModal = ({
  open,
  on_open_change,
  component_ids,
  shared_component_ids,
  thumbnail_generation_id,
}: SaveTemplateModalProps) => {
  const [name, set_name] = useState("");
  const [description, set_description] = useState("");
  const [is_saving, set_is_saving] = useState(false);
  const [error, set_error] = useState<string | null>(null);

  const handle_save = async () => {
    if (!name.trim()) {
      set_error("Please enter a template name");
      return;
    }

    set_is_saving(true);
    set_error(null);

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          component_ids,
          shared_component_ids,
          thumbnail_generation_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save template");
      }

      // Reset and close
      set_name("");
      set_description("");
      on_open_change(false);
    } catch (err) {
      set_error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      set_is_saving(false);
    }
  };

  const total_components = component_ids.length + shared_component_ids.length;

  return (
    <ModalDialog
      open={open}
      on_open_change={on_open_change}
      title="Save as Template"
      description={`Save your current selection of ${total_components} component${total_components !== 1 ? "s" : ""} as a reusable template.`}
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => on_open_change(false)}
            disabled={is_saving}
          >
            Cancel
          </Button>
          <Button onClick={handle_save} disabled={is_saving || !name.trim()}>
            {is_saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            Save Template
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template-name">Name</Label>
          <Input
            id="template-name"
            placeholder="My Template"
            value={name}
            onChange={(e) => set_name(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-description">Description (optional)</Label>
          <Textarea
            id="template-description"
            placeholder="A brief description of this template..."
            value={description}
            onChange={(e) => set_description(e.target.value)}
            rows={3}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </ModalDialog>
  );
};
