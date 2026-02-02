# AI Prompt Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Generate" tab that expands brief text descriptions into detailed, category-specific prompt JSON.

**Architecture:** New API endpoint calls Gemini with category-specific system prompts. UI follows existing AnalyzePanel pattern with category selector, text input, JSON preview, and save functionality.

**Tech Stack:** Next.js API route, Gemini API (@google/genai), shadcn/ui components, existing component repository.

---

## Task 1: Create the prompt expansion library

**Files:**
- Create: `lib/generate-prompt.ts`

**Step 1: Create the category prompts map and expansion function**

```ts
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const CATEGORY_PROMPTS: Record<string, string> = {
  scenes: `You are an expert at writing detailed scene descriptions for image generation.
Given a brief description, expand it into a rich, evocative scene description.
Include: setting details, atmosphere, time of day, weather/lighting conditions, ambient details, mood, and sensory elements.
Return ONLY a JSON object with a "scene" key containing the full description string.
Example output: {"scene": "An intimate outdoor dining setup at a charming Italian trattoria..."}`,

  backgrounds: `You are an expert at writing detailed background descriptions for image generation.
Given a brief description, expand it into a comprehensive background description.
Include: environment type, depth layers (foreground/midground/background), props, architectural details, natural elements, lighting conditions.
Return ONLY a JSON object with keys like "setting", "props" (array), "lighting", etc.
Example output: {"setting": "A sun-drenched Mediterranean courtyard...", "props": ["terracotta pots", "climbing vines"], "lighting": "warm afternoon light filtering through..."}`,

  camera: `You are an expert cinematographer and photographer.
Given a brief description of a look or style, expand it into detailed camera/photography settings.
Include: film stock or digital sensor characteristics, lens type and focal length, lighting style, color grading, texture (grain, halation), depth of field.
Return ONLY a JSON object with keys like "texture", "color", "device", "lighting", etc.
Example output: {"texture": "Fujifilm Eterna 800 film grain, subtle halation on highlights", "color": "muted teal and orange color grade", "device": "shot on 35mm film camera with 50mm lens", "lighting": "soft window light with gentle fill"}`,

  wardrobe: `You are an expert fashion stylist.
Given a brief description, expand it into a detailed outfit description.
Include: style era, fabric types, fit description, color palette, layering, condition (pristine, worn, weathered).
Return ONLY a JSON object with keys like "top", "bottom", "footwear", "accessories", etc.
Example output: {"top": "A vintage cream silk blouse with pearl buttons...", "bottom": "High-waisted wide-leg linen trousers in navy...", "footwear": "Worn leather oxford shoes in cognac"}`,

  wardrobe_tops: `You are an expert fashion stylist specializing in tops and upper body garments.
Given a brief description, expand it into a detailed top/shirt description.
Include: garment type, fabric, fit, color, details, condition.
Return ONLY a JSON object with a "top" key containing the full description string.
Example output: {"top": "A relaxed-fit cream linen button-down shirt with mother-of-pearl buttons..."}`,

  wardrobe_bottoms: `You are an expert fashion stylist specializing in bottoms and lower body garments.
Given a brief description, expand it into a detailed bottoms description.
Include: garment type, fabric, fit, color, details, condition.
Return ONLY a JSON object with a "bottom" key (and optionally "belt") containing the description.
Example output: {"bottom": "Vintage high-waisted dark wash denim jeans with subtle fading...", "belt": "Thin cognac leather belt with brass buckle"}`,

  wardrobe_footwear: `You are an expert fashion stylist specializing in footwear.
Given a brief description, expand it into a detailed footwear description.
Include: shoe type, material, color, condition, style details.
Return ONLY a JSON object with a "footwear" key containing the full description string.
Example output: {"footwear": "Well-worn white leather sneakers with scuffed soles and fraying laces"}`,

  poses: `You are an expert at describing body language and poses for photography.
Given a brief description, expand it into a detailed pose description.
Include: body positioning, weight distribution, hand placement, head tilt, eye direction, emotional undertone, interaction with environment.
Return ONLY a JSON object with keys like "body", "hands", "expression", "gaze", etc.
Example output: {"body": "Leaning casually against the doorframe, weight on left hip...", "hands": "One hand loosely holding a coffee cup, the other tucked in back pocket", "expression": "Soft, contemplative smile", "gaze": "Looking slightly off-camera to the left"}`,

  physical_traits: `You are an expert at describing human physical characteristics for image generation.
Given a brief description, expand it into detailed physical trait descriptions.
Include: hair (texture, style, color, length), skin tone, body type, distinguishing features.
Return ONLY a JSON object with keys like "hair", "skin", "body", "face", etc.
Example output: {"hair": "Wavy chestnut brown hair falling just past shoulders, with subtle auburn highlights", "skin": "Warm olive complexion with light freckles across the nose", "body": "Athletic build with broad shoulders"}`,

  jewelry: `You are an expert at describing jewelry and accessories for image generation.
Given a brief description, expand it into detailed jewelry descriptions.
Include: metal types, gem details, style (minimalist, ornate, vintage, modern), placement, cultural influences.
Return ONLY a JSON object with a "jewelry" or "accessories" key, or specific keys like "necklace", "earrings", "rings", etc.
Example output: {"necklace": "Delicate gold chain with small crescent moon pendant", "earrings": "Simple gold hoops, medium-sized", "rings": "Stack of thin gold bands on right ring finger"}`,

  characters: `You are an expert at creating detailed character descriptions for image generation.
Given a brief description, expand it into a comprehensive character description.
Include: overall appearance, ethnicity, hair, skin, body type, face shape, distinguishing features.
Return ONLY a JSON object with keys like "description", "ethnicity", "hair", "skin", "body", "face", etc.
Example output: {"description": "A striking woman in her late twenties...", "ethnicity": "East Asian", "hair": "Long straight black hair with blunt bangs", "skin": "Fair porcelain complexion", "face": "Heart-shaped face with high cheekbones"}`,

  ban_lists: `You are an expert at creating negative prompt lists for image generation.
Given a brief description of what to avoid, expand it into a comprehensive ban list.
Include specific items, styles, or elements that should be excluded from the generated image.
Return ONLY a JSON object with a "ban" key containing an array of items to exclude.
Example output: {"ban": ["watermarks", "text", "blurry", "low quality", "extra limbs", "distorted faces"]}`,
};

export type GeneratePromptResult = {
  success: boolean;
  data?: Record<string, unknown>;
  raw_text?: string;
  error?: string;
};

export const generate_prompt = async (
  category: string,
  description: string
): Promise<GeneratePromptResult> => {
  try {
    const system_prompt = CATEGORY_PROMPTS[category];
    if (!system_prompt) {
      return {
        success: false,
        error: `Unknown category: ${category}`,
      };
    }

    const model_name =
      process.env.GEMINI_ANALYSIS_MODEL || "gemini-3-pro-preview";

    const result = await genAI.models.generateContent({
      model: model_name,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${system_prompt}\n\nUser description: "${description}"\n\nRespond with ONLY the JSON object, no markdown or explanation.`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    // Extract text from response
    let text = "";
    for (const candidate of result.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.text) {
          text += part.text;
        }
      }
    }

    // Extract JSON from response
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) {
      return {
        success: false,
        raw_text: text,
        error: "No JSON found in response",
      };
    }

    const data = JSON.parse(json_match[0]);
    return {
      success: true,
      data,
      raw_text: text,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
};

// Export list of supported categories for UI
export const SUPPORTED_CATEGORIES = Object.keys(CATEGORY_PROMPTS);
```

**Step 2: Verify file was created correctly**

Run: `head -20 lib/generate-prompt.ts`
Expected: Shows the imports and start of CATEGORY_PROMPTS

**Step 3: Commit**

```bash
git add lib/generate-prompt.ts
git commit -m "feat: add prompt generation library with category-specific prompts"
```

---

## Task 2: Create the API endpoint

**Files:**
- Create: `app/api/generate-prompt/route.ts`

**Step 1: Create the API route**

```ts
import { NextResponse } from "next/server";
import { with_auth } from "@/lib/api-auth";
import { generate_prompt, SUPPORTED_CATEGORIES } from "@/lib/generate-prompt";

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const body = await request.json();
    const { category, description } = body;

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { success: false, error: "Category is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Description too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Unsupported category: ${category}` },
        { status: 400 }
      );
    }

    const result = await generate_prompt(category, description);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  });
};
```

**Step 2: Verify file was created correctly**

Run: `head -20 app/api/generate-prompt/route.ts`
Expected: Shows imports and start of POST handler

**Step 3: Commit**

```bash
git add app/api/generate-prompt/route.ts
git commit -m "feat: add /api/generate-prompt endpoint"
```

---

## Task 3: Create the Generate Panel UI component

**Files:**
- Create: `components/builder/generate-panel.tsx`

**Step 1: Create the panel component**

```tsx
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
          <Select value={category} onValueChange={set_category}>
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
```

**Step 2: Verify file was created correctly**

Run: `head -30 components/builder/generate-panel.tsx`
Expected: Shows imports and CATEGORY_OPTIONS

**Step 3: Commit**

```bash
git add components/builder/generate-panel.tsx
git commit -m "feat: add GeneratePanel UI component"
```

---

## Task 4: Add "Generate" tab to sidebar

**Files:**
- Modify: `components/builder/category-sidebar.tsx`

**Step 1: Add the Generate button below Analyze**

Find this section at the end of the component (around line 71-83):

```tsx
      <Separator className="my-2" />

      <div className="px-2">
        <Button
          variant={active_category === "analyze" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => set_active_category("analyze")}
        >
          <ImageIcon className="size-4 mr-2" />
          Analyze Image
        </Button>
      </div>
```

Replace with:

```tsx
      <Separator className="my-2" />

      <div className="px-2 space-y-1">
        <Button
          variant={active_category === "analyze" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => set_active_category("analyze")}
        >
          <ImageIcon className="size-4 mr-2" />
          Analyze Image
        </Button>
        <Button
          variant={active_category === "generate" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => set_active_category("generate")}
        >
          <Sparkles className="size-4 mr-2" />
          Generate Prompt
        </Button>
      </div>
```

**Step 2: Add Sparkles import**

Find the import line:
```tsx
import { ImageIcon, Loader2 } from "lucide-react";
```

Replace with:
```tsx
import { ImageIcon, Loader2, Sparkles } from "lucide-react";
```

**Step 3: Verify changes**

Run: `grep -n "Sparkles\|generate" components/builder/category-sidebar.tsx`
Expected: Shows Sparkles import and generate button

**Step 4: Commit**

```bash
git add components/builder/category-sidebar.tsx
git commit -m "feat: add Generate Prompt tab to sidebar"
```

---

## Task 5: Handle "generate" category in ComponentGrid

**Files:**
- Modify: `components/builder/component-grid.tsx`

**Step 1: Import GeneratePanel**

Find the imports section (around line 10-12):
```tsx
import { AnalyzePanel } from "./analyze-panel";
import { FacialAnalysisPanel } from "./facial-analysis-panel";
import { SavePresetsModal } from "./save-presets-modal";
```

Add after `SavePresetsModal` import:
```tsx
import { GeneratePanel } from "./generate-panel";
```

**Step 2: Add handler for "generate" category**

Find the handler for "analyze" category (around line 40-59):
```tsx
  // Handle "analyze" special category
  if (active_category === "analyze") {
    return (
      <>
        <AnalyzePanel
          on_save_as_presets={(data) => {
            set_analysis_data(data);
            set_save_presets_open(true);
          }}
        />
        {analysis_data && (
          <SavePresetsModal
            open={save_presets_open}
            on_open_change={set_save_presets_open}
            analysis_data={analysis_data}
          />
        )}
      </>
    );
  }
```

Add AFTER this block (before the facial analysis handler):
```tsx
  // Handle "generate" special category
  if (active_category === "generate") {
    return <GeneratePanel />;
  }
```

**Step 3: Verify changes**

Run: `grep -n "GeneratePanel\|generate" components/builder/component-grid.tsx`
Expected: Shows import and handler for generate category

**Step 4: Commit**

```bash
git add components/builder/component-grid.tsx
git commit -m "feat: wire up GeneratePanel in ComponentGrid"
```

---

## Task 6: Manual testing

**Step 1: Start the dev server**

Run: `bun run dev`
Expected: Server starts without errors

**Step 2: Test the feature**

1. Navigate to the builder page
2. Click "Generate Prompt" in sidebar
3. Select "Scenes" category
4. Enter: "dining table outside italian restaurant overlooking the seaside"
5. Click Generate
6. Verify JSON is generated with scene description
7. Enter a name and click "Save as Preset"
8. Switch to "Scenes" category and verify new preset appears

**Step 3: Test other categories**

1. Go back to Generate tab
2. Select "Camera / Look"
3. Enter: "film grain, eterna 800, golden hour"
4. Click Generate
5. Verify JSON includes texture, color, etc.

---

## Task 7: Final commit

**Step 1: Verify all files are committed**

Run: `git status`
Expected: Working tree clean (all changes committed)

**Step 2: Create summary commit if needed**

If any uncommitted changes remain:
```bash
git add -A
git commit -m "feat: complete AI prompt generator feature"
```
