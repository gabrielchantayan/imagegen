"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Save, Copy } from "lucide-react";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  use_components,
  create_component_api,
} from "@/lib/hooks/use-components";

const CATEGORY_OPTIONS = [
  { value: "scenes", label: "Scenes" },
  { value: "backgrounds", label: "Backgrounds" },
  { value: "camera", label: "Camera / Look" },
  { value: "wardrobe", label: "Wardrobe (Full Outfit)" },
  { value: "wardrobe_tops", label: "Wardrobe - Tops" },
  { value: "wardrobe_bottoms", label: "Wardrobe - Bottoms" },
  { value: "wardrobe_footwear", label: "Wardrobe - Footwear" },
  { value: "poses", label: "Poses" },
  { value: "physical_traits", label: "Physical Traits" },
  { value: "jewelry", label: "Jewelry" },
  { value: "characters", label: "Characters" },
  { value: "ban_lists", label: "Ban Lists" },
];

export const GeneratePanel = () => {
  const [category, set_category] = useState<string>("");
  const [description, set_description] = useState("");
  const [generating, set_generating] = useState(false);
  const [result, set_result] = useState<Record<string, unknown> | null>(null);
  const [error, set_error] = useState<string | null>(null);
  const [preset_name, set_preset_name] = useState("");
  const [saving, set_saving] = useState(false);
  const [save_success, set_save_success] = useState(false);

  const { mutate } = use_components(category);

  const handle_generate = async () => {
    if (!category || !description.trim()) return;

    set_generating(true);
    set_error(null);
    set_result(null);
    set_save_success(false);

    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description: description.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        set_result(data.data);
        // Suggest a name based on description
        const suggested_name = description.slice(0, 50).trim();
        set_preset_name(suggested_name);
      } else {
        set_error(data.error || "Generation failed");
      }
    } catch {
      set_error("Network error");
    } finally {
      set_generating(false);
    }
  };

  const handle_save = async () => {
    if (!result || !preset_name.trim() || !category) return;

    set_saving(true);
    set_error(null);

    try {
      await create_component_api({
        category_id: category,
        name: preset_name.trim(),
        description: description.trim(),
        data: result,
      });
      mutate();
      set_save_success(true);
    } catch {
      set_error("Failed to save preset");
    } finally {
      set_saving(false);
    }
  };

  const handle_copy = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
  };

  const handle_clear = () => {
    set_result(null);
    set_error(null);
    set_preset_name("");
    set_save_success(false);
  };

  return (
    <div className="flex gap-6 p-6 h-full bg-muted/5">
      {/* Left: Input area */}
      <div className="flex flex-col gap-6 w-1/2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Generate Prompt</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Describe what you want and AI will generate the component JSON
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Target Category
            </Label>
            <Select
              value={category}
              onValueChange={(value) => set_category(value ?? "")}
            >
              <SelectTrigger id="category" className="h-10 bg-background">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col flex-1 space-y-2">
            <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => set_description(e.target.value)}
              placeholder="e.g., dining table outside italian restaurant overlooking the seaside"
              className="flex-1 resize-none min-h-[160px] bg-background p-4 leading-relaxed"
            />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground/60">
                {description.length}/5000
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={handle_generate}
          disabled={!category || !description.trim() || generating}
          className="w-full h-10 shadow-sm mt-auto"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 animate-spin size-4" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Generate Prompt
            </>
          )}
        </Button>
      </div>

      {/* Right: Results */}
      <div className="flex flex-col w-1/2">
         <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Output</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generated JSON result
          </p>
        </div>

        <div className="flex flex-col flex-1 min-h-0 bg-card rounded-xl border shadow-sm p-1">
          {error ? (
            <div className="flex-1 flex items-center justify-center">
              <ErrorState message={error} />
            </div>
          ) : result ? (
            <>
               <div className="flex-1 relative">
                {save_success && (
                  <div className="absolute top-2 right-2 z-10 bg-green-500/10 text-green-600 text-xs font-medium px-2 py-1 rounded-md border border-green-500/20 flex items-center animate-in fade-in slide-in-from-top-1">
                    Preset saved!
                  </div>
                )}
                <Textarea
                  value={JSON.stringify(result, null, 2)}
                  readOnly
                  className="w-full h-full font-mono text-xs resize-none border-0 shadow-none focus-visible:ring-0 p-4 leading-relaxed bg-transparent"
                />
              </div>

              <div className="p-4 border-t bg-muted/10 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preset-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Preset Name
                  </Label>
                  <Input
                    id="preset-name"
                    value={preset_name}
                    onChange={(e) => set_preset_name(e.target.value)}
                    placeholder="Enter a name for this preset"
                    className="h-9 bg-background"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handle_save}
                    disabled={!preset_name.trim() || saving}
                    className="flex-1 h-9"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 animate-spin size-4" />
                    ) : (
                      <Save className="mr-2 size-4" />
                    )}
                    Save as Preset
                  </Button>
                  <Button variant="outline" onClick={handle_copy} className="h-9 px-3">
                    <Copy className="size-4" />
                  </Button>
                  <Button variant="ghost" onClick={handle_clear} className="h-9">
                    Clear
                  </Button>
                </div>
              </div>
            </>
          ) : (
             <div className="flex flex-1 justify-center items-center text-muted-foreground bg-muted/5 rounded-lg m-1 border border-dashed border-muted-foreground/10">
              {generating ? (
                <LoadingState message="Generating JSON..." size="lg" />
              ) : (
                <div className="text-center max-w-[240px]">
                   <p className="text-sm">Select a category and describe your idea to generate a starting point</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
