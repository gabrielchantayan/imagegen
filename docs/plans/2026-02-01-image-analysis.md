# Image Analysis (Spec 05) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement image-to-prompt analysis using Gemini's vision capabilities to extract structured JSON prompts from uploaded images.

**Architecture:** Upload images via drag-and-drop UI, send to API endpoint that uses Gemini vision model to analyze and extract structured data. Results can be saved as reusable component presets.

**Tech Stack:** Next.js API routes, Google Gemini API (@google/genai), react-dropzone for upload UI, shadcn/ui components

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install react-dropzone**

Run:
```bash
bun add react-dropzone
```

Expected: Package added to dependencies

**Step 2: Add checkbox component**

Run:
```bash
bunx shadcn@latest add checkbox
```

Expected: Checkbox component added to `components/ui/checkbox.tsx`

**Step 3: Verify installations**

Run:
```bash
grep react-dropzone package.json && ls components/ui/checkbox.tsx
```

Expected: Both exist

**Step 4: Commit**

```bash
git add package.json bun.lockb components/ui/checkbox.tsx
git commit -m "chore: add react-dropzone and checkbox dependencies for image analysis"
```

---

## Task 2: Create Analysis Library

**Files:**
- Create: `lib/analyze.ts`

**Step 1: Create the analysis module**

Create `lib/analyze.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/genai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const ANALYSIS_PROMPT = `You are an expert image analyst. Analyze the provided image and extract a detailed JSON description following this exact structure:

{
  "subject": {
    "description": "Overall description of the main subject",
    "ethnicity": "Observed or inferred ethnicity",
    "hair": "Hair description (color, style, length)",
    "skin": "Skin tone description",
    "body": "Body type description",
    "face": "Facial features description"
  },
  "wardrobe": {
    "top": "Upper body clothing description",
    "bottom": "Lower body clothing description",
    "footwear": "Footwear description",
    "accessories": "Any accessories worn"
  },
  "jewelry": {
    "description": "Jewelry items worn"
  },
  "pose": {
    "body": "Body position description",
    "hands": "Hand position description",
    "expression": "Facial expression"
  },
  "scene": "Overall scene description",
  "background": {
    "setting": "Background environment",
    "props": ["List of visible props"]
  },
  "camera": {
    "angle": "Camera angle (eye level, low angle, etc.)",
    "framing": "Shot framing (close-up, medium, full body)",
    "style": "Photography style notes"
  }
}

Be detailed and specific. If something is not visible or applicable, omit that field. Focus on factual observation, not interpretation.`;

export type AnalysisResult = {
  success: boolean;
  data?: Record<string, unknown>;
  raw_text?: string;
  error?: string;
};

export const analyze_image = async (
  image_buffer: Buffer,
  mime_type: string
): Promise<AnalysisResult> => {
  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_ANALYSIS_MODEL || "gemini-2.5-pro-preview-05-06",
    });

    const image_part = {
      inlineData: {
        data: image_buffer.toString("base64"),
        mimeType: mime_type,
      },
    };

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: ANALYSIS_PROMPT }, image_part],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) {
      return {
        success: false,
        raw_text: text,
        error: "No JSON found in response",
      };
    }

    try {
      const data = JSON.parse(json_match[0]);
      return {
        success: true,
        data,
        raw_text: text,
      };
    } catch {
      return {
        success: false,
        raw_text: text,
        error: "Failed to parse JSON from response",
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
};
```

**Step 2: Verify file syntax**

Run:
```bash
bunx tsc --noEmit lib/analyze.ts 2>&1 | head -20
```

Expected: No errors (or only expected import resolution warnings)

**Step 3: Commit**

```bash
git add lib/analyze.ts
git commit -m "feat: add image analysis library with Gemini vision API"
```

---

## Task 3: Create API Endpoint

**Files:**
- Create: `app/api/analyze/route.ts`

**Step 1: Create the API route**

Create `app/api/analyze/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { with_auth } from "@/lib/api-auth";
import { analyze_image } from "@/lib/analyze";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const form_data = await request.formData();
    const file = form_data.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    // Convert to buffer
    const array_buffer = await file.arrayBuffer();
    const buffer = Buffer.from(array_buffer);

    // Analyze
    const result = await analyze_image(buffer, file.type);

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

**Step 2: Verify file syntax**

Run:
```bash
bunx tsc --noEmit app/api/analyze/route.ts 2>&1 | head -20
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/api/analyze/route.ts
git commit -m "feat: add /api/analyze endpoint for image analysis"
```

---

## Task 4: Create Analyze Panel Component

**Files:**
- Create: `components/builder/analyze-panel.tsx`

**Step 1: Create the analyze panel**

Create `components/builder/analyze-panel.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Copy, Loader2 } from "lucide-react";
import Image from "next/image";

type AnalyzePanelProps = {
  on_save_as_presets: (data: Record<string, unknown>) => void;
};

export const AnalyzePanel = ({ on_save_as_presets }: AnalyzePanelProps) => {
  const [file, set_file] = useState<File | null>(null);
  const [preview, set_preview] = useState<string | null>(null);
  const [analyzing, set_analyzing] = useState(false);
  const [result, set_result] = useState<Record<string, unknown> | null>(null);
  const [error, set_error] = useState<string | null>(null);

  const on_drop = useCallback((accepted_files: File[]) => {
    const dropped_file = accepted_files[0];
    if (dropped_file) {
      set_file(dropped_file);
      set_preview(URL.createObjectURL(dropped_file));
      set_result(null);
      set_error(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: on_drop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const handle_analyze = async () => {
    if (!file) return;

    set_analyzing(true);
    set_error(null);

    try {
      const form_data = new FormData();
      form_data.append("image", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: form_data,
      });

      const data = await res.json();

      if (data.success) {
        set_result(data.data);
      } else {
        set_error(data.error || "Analysis failed");
      }
    } catch {
      set_error("Network error");
    } finally {
      set_analyzing(false);
    }
  };

  const handle_clear = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    set_file(null);
    set_preview(null);
    set_result(null);
    set_error(null);
  };

  const handle_copy = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
  };

  return (
    <div className="h-full flex gap-4 p-4">
      {/* Left: Upload area */}
      <div className="w-1/2 flex flex-col">
        <div
          {...getRootProps()}
          className={`flex-1 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          {preview ? (
            <div className="relative w-full h-full p-4">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="text-center p-8">
              <Upload className="size-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {isDragActive
                  ? "Drop the image here..."
                  : "Drag and drop an image, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Max 10MB. JPEG, PNG, WebP, GIF
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handle_analyze}
            disabled={!file || analyzing}
            className="flex-1"
          >
            {analyzing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze"
            )}
          </Button>
          <Button variant="outline" onClick={handle_clear} disabled={!file}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Right: Results */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Analysis Result</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {error && <p className="text-destructive mb-4">{error}</p>}

            {result ? (
              <>
                <Textarea
                  value={JSON.stringify(result, null, 2)}
                  readOnly
                  className="flex-1 font-mono text-xs resize-none"
                />
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => on_save_as_presets(result)}
                    className="flex-1"
                  >
                    Save as Presets
                  </Button>
                  <Button variant="outline" onClick={handle_copy}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {analyzing ? (
                  <div className="text-center">
                    <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                    <p>Analyzing image...</p>
                  </div>
                ) : (
                  <p>Upload and analyze an image to see results</p>
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

**Step 2: Verify file syntax**

Run:
```bash
bunx tsc --noEmit components/builder/analyze-panel.tsx 2>&1 | head -20
```

Expected: No errors

**Step 3: Commit**

```bash
git add components/builder/analyze-panel.tsx
git commit -m "feat: add analyze panel component with image upload UI"
```

---

## Task 5: Create Save Presets Modal

**Files:**
- Create: `components/builder/save-presets-modal.tsx`

**Step 1: Create the modal component**

Create `components/builder/save-presets-modal.tsx`:

```typescript
"use client";

import { useState } from "react";
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
```

**Step 2: Verify file syntax**

Run:
```bash
bunx tsc --noEmit components/builder/save-presets-modal.tsx 2>&1 | head -20
```

Expected: No errors

**Step 3: Commit**

```bash
git add components/builder/save-presets-modal.tsx
git commit -m "feat: add save presets modal for image analysis results"
```

---

## Task 6: Integrate Analyze Panel into Component Grid

**Files:**
- Modify: `components/builder/component-grid.tsx`

**Step 1: Read the current file**

Read `components/builder/component-grid.tsx` to understand the current structure.

**Step 2: Add imports and state**

At the top of the file, add the new imports:

```typescript
import { AnalyzePanel } from "./analyze-panel";
import { SavePresetsModal } from "./save-presets-modal";
```

**Step 3: Add state for the modal**

Inside the component, add state for analysis data and modal:

```typescript
const [analysis_data, set_analysis_data] = useState<Record<string, unknown> | null>(null);
const [save_presets_open, set_save_presets_open] = useState(false);
```

**Step 4: Replace the analyze placeholder**

Replace the existing analyze category placeholder (the block that starts with `if (active_category === "analyze")`) with:

```typescript
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

**Step 5: Verify the build compiles**

Run:
```bash
bun run build 2>&1 | tail -30
```

Expected: Build succeeds

**Step 6: Commit**

```bash
git add components/builder/component-grid.tsx
git commit -m "feat: integrate analyze panel into builder component grid"
```

---

## Task 7: Add Environment Variable

**Files:**
- Modify: `.env.local` (if exists) or `.env`

**Step 1: Check for existing env file**

Run:
```bash
ls -la .env* 2>/dev/null || echo "No .env files"
```

**Step 2: Add the GEMINI_ANALYSIS_MODEL variable**

Add to the env file:
```
GEMINI_ANALYSIS_MODEL=gemini-2.5-pro-preview-05-06
```

Note: Do NOT commit .env files to git.

---

## Task 8: Test the Implementation

**Step 1: Start the dev server**

Run:
```bash
bun run dev
```

**Step 2: Manual testing checklist**

1. Navigate to /builder
2. Click "Analyze Image" in the sidebar
3. Verify the upload dropzone appears
4. Test drag and drop an image
5. Test clicking to select an image
6. Click "Analyze" and verify loading state
7. Verify JSON result appears
8. Click "Copy JSON" and verify clipboard
9. Click "Save as Presets"
10. Verify modal shows correct options
11. Enter a name and save
12. Verify new components appear in their categories

**Step 3: Test error cases**

1. Try uploading a file > 10MB
2. Try uploading a non-image file
3. Test with an image that has no people (partial analysis)

---

## Task 9: Final Commit

**Step 1: Check status**

Run:
```bash
git status
```

**Step 2: Create final commit if needed**

If there are any remaining changes:

```bash
git add -A
git commit -m "feat: implement image analysis system (spec 05)"
```

---

## Summary

This plan implements the image analysis feature with:

1. **Dependencies**: react-dropzone for drag-and-drop, checkbox component for preset selection
2. **Backend**: `lib/analyze.ts` for Gemini vision API, `/api/analyze` endpoint
3. **Frontend**: `AnalyzePanel` for upload UI, `SavePresetsModal` for creating presets
4. **Integration**: Replaces placeholder in `component-grid.tsx` with functional analyze UI

The feature allows users to:
- Upload images via drag-and-drop
- Analyze images using Gemini's vision capabilities
- Extract structured JSON prompts
- Save analysis results as reusable component presets
