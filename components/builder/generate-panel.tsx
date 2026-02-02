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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Save, Copy } from "lucide-react";
import { use_components, create_component_api } from "@/lib/hooks/use-components";

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
    <div className="h-full flex gap-4 p-4">
      {/* Left: Input area */}
      <div className="w-1/2 flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={(value) => set_category(value ?? "")}>
            <SelectTrigger id="category">
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

        <div className="flex-1 flex flex-col space-y-2">
          <Label htmlFor="description">Describe what you want</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => set_description(e.target.value)}
            placeholder="e.g., dining table outside italian restaurant overlooking the seaside"
            className="flex-1 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {description.length}/2000 characters
          </p>
        </div>

        <Button
          onClick={handle_generate}
          disabled={!category || !description.trim() || generating}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2" />
              Generate
            </>
          )}
        </Button>
      </div>

      {/* Right: Results */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Generated Prompt</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {error && <p className="text-destructive mb-4">{error}</p>}

            {save_success && (
              <p className="text-green-600 mb-4">Preset saved successfully!</p>
            )}

            {result ? (
              <>
                <Textarea
                  value={JSON.stringify(result, null, 2)}
                  readOnly
                  className="flex-1 font-mono text-xs resize-none"
                />
                <div className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      value={preset_name}
                      onChange={(e) => set_preset_name(e.target.value)}
                      placeholder="Enter a name for this preset"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handle_save}
                      disabled={!preset_name.trim() || saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="size-4 mr-2" />
                      )}
                      Save as Preset
                    </Button>
                    <Button variant="outline" onClick={handle_copy}>
                      <Copy className="size-4" />
                    </Button>
                    <Button variant="outline" onClick={handle_clear}>
                      Clear
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {generating ? (
                  <div className="text-center">
                    <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                    <p>Generating prompt...</p>
                  </div>
                ) : (
                  <p>Select a category and describe what you want</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
