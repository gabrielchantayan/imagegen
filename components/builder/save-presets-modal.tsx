"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { create_component_api } from "@/lib/hooks/use-components";
import { Loader2 } from "lucide-react";

type SavePresetsModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  analysis_data: Record<string, unknown>;
};

export const SavePresetsModal = ({
  open,
  on_open_change,
  analysis_data,
}: SavePresetsModalProps) => {
  const [saving, set_saving] = useState(false);
  const [base_name, set_base_name] = useState("");
  const [error, set_error] = useState<string | null>(null);

  // Determine what presets can be created
  const has_subject = !!analysis_data.subject;
  const has_wardrobe = !!analysis_data.wardrobe;
  const has_pose = !!analysis_data.pose;
  const has_scene = !!analysis_data.scene || !!analysis_data.background;
  const has_camera = !!analysis_data.camera;

  const [save_subject, set_save_subject] = useState(has_subject);
  const [save_wardrobe, set_save_wardrobe] = useState(has_wardrobe);
  const [save_pose, set_save_pose] = useState(has_pose);
  const [save_scene, set_save_scene] = useState(has_scene);
  const [save_camera, set_save_camera] = useState(has_camera);

  // Reset state when modal opens or analysis_data changes
  useEffect(() => {
    if (open) {
      set_save_subject(!!analysis_data.subject);
      set_save_wardrobe(!!analysis_data.wardrobe);
      set_save_pose(!!analysis_data.pose);
      set_save_scene(!!analysis_data.scene || !!analysis_data.background);
      set_save_camera(!!analysis_data.camera);
      set_base_name("");
      set_error(null);
    }
  }, [open, analysis_data]);

  const handle_save = async () => {
    if (!base_name.trim()) return;

    set_saving(true);
    set_error(null);

    try {
      const promises: Promise<unknown>[] = [];

      if (save_subject && analysis_data.subject) {
        promises.push(
          create_component_api({
            category_id: "characters",
            name: `${base_name} - Character`,
            description: "Created from image analysis",
            data: { subject: analysis_data.subject },
          })
        );
      }

      if (save_wardrobe && analysis_data.wardrobe) {
        promises.push(
          create_component_api({
            category_id: "wardrobe",
            name: `${base_name} - Wardrobe`,
            description: "Created from image analysis",
            data: analysis_data.wardrobe as Record<string, unknown>,
          })
        );
      }

      if (save_pose && analysis_data.pose) {
        promises.push(
          create_component_api({
            category_id: "poses",
            name: `${base_name} - Pose`,
            description: "Created from image analysis",
            data: analysis_data.pose as Record<string, unknown>,
          })
        );
      }

      if (save_scene) {
        const scene_data: Record<string, unknown> = {};
        if (analysis_data.scene) scene_data.scene = analysis_data.scene;
        if (analysis_data.background)
          scene_data.background = analysis_data.background;

        promises.push(
          create_component_api({
            category_id: "scenes",
            name: `${base_name} - Scene`,
            description: "Created from image analysis",
            data: scene_data,
          })
        );
      }

      if (save_camera && analysis_data.camera) {
        promises.push(
          create_component_api({
            category_id: "camera",
            name: `${base_name} - Camera`,
            description: "Created from image analysis",
            data: analysis_data.camera as Record<string, unknown>,
          })
        );
      }

      await Promise.all(promises);
      on_open_change(false);
      set_base_name("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save presets";
      set_error(message);
    } finally {
      set_saving(false);
    }
  };

  const any_selected =
    save_subject || save_wardrobe || save_pose || save_scene || save_camera;

  return (
    <AlertDialog open={open} onOpenChange={on_open_change}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save as Presets</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="baseName">Base Name</Label>
            <Input
              id="baseName"
              value={base_name}
              onChange={(e) => set_base_name(e.target.value)}
              placeholder="e.g., Beach Photo Reference"
            />
          </div>

          <div className="space-y-2">
            <Label>Create Presets</Label>
            <div className="space-y-2">
              {has_subject && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="subject"
                    checked={save_subject}
                    onCheckedChange={(c) => set_save_subject(!!c)}
                  />
                  <Label htmlFor="subject" className="font-normal cursor-pointer">
                    Character (subject details)
                  </Label>
                </div>
              )}
              {has_wardrobe && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="wardrobe"
                    checked={save_wardrobe}
                    onCheckedChange={(c) => set_save_wardrobe(!!c)}
                  />
                  <Label htmlFor="wardrobe" className="font-normal cursor-pointer">
                    Wardrobe (clothing)
                  </Label>
                </div>
              )}
              {has_pose && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pose"
                    checked={save_pose}
                    onCheckedChange={(c) => set_save_pose(!!c)}
                  />
                  <Label htmlFor="pose" className="font-normal cursor-pointer">
                    Pose (body position)
                  </Label>
                </div>
              )}
              {has_scene && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="scene"
                    checked={save_scene}
                    onCheckedChange={(c) => set_save_scene(!!c)}
                  />
                  <Label htmlFor="scene" className="font-normal cursor-pointer">
                    Scene (background/environment)
                  </Label>
                </div>
              )}
              {has_camera && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="camera"
                    checked={save_camera}
                    onCheckedChange={(c) => set_save_camera(!!c)}
                  />
                  <Label htmlFor="camera" className="font-normal cursor-pointer">
                    Camera (angle/framing)
                  </Label>
                </div>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => on_open_change(false)}>
            Cancel
          </Button>
          <Button
            onClick={handle_save}
            disabled={saving || !base_name.trim() || !any_selected}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Presets"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
