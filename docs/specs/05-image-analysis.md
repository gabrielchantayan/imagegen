# Image Analysis (Image-to-Prompt)

## Overview

Analyze uploaded images to extract structured JSON prompts using Gemini's vision capabilities. Allows users to create presets from reference images.

**Dependencies:** 00-foundation-database.md, 01-authentication.md, 02-components-system.md

**Dependents:** None (standalone feature)

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| AI Provider | Google Gemini API |
| Model | gemini-3-pro-preview (vision-capable) |
| File Upload | FormData via fetch |
| Max File Size | 10MB |

---

## Environment Variables

```env
GEMINI_ANALYSIS_MODEL=gemini-3-pro-preview
```

---

## Directory Structure

```
app/
├── api/
│   └── analyze/
│       └── route.ts              # POST (analyze image)
└── (protected)/
    └── builder/
        └── page.tsx              # Analyze tab integrated here

components/
└── builder/
    └── analyze-panel.tsx         # Image upload and analysis UI

lib/
└── analyze.ts                    # Analysis logic
```

---

## Analysis Prompt Template

The analysis uses a system prompt to extract structured data. Reference the `prompt.txt` file for the expected JSON structure.

```typescript
// lib/analyze.ts

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
```

---

## Gemini Analysis Client

```typescript
// lib/analyze.ts
import { GoogleGenerativeAI } from '@google/genai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface AnalysisResult {
  success: boolean;
  data?: Record<string, unknown>;
  rawText?: string;
  error?: string;
}

export async function analyzeImage(imageBuffer: Buffer, mimeType: string): Promise<AnalysisResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3-pro-preview',
    });

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType,
      },
    };

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: ANALYSIS_PROMPT },
            imagePart,
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,  // Lower temperature for more consistent output
        maxOutputTokens: 4096,
      },
    });

    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        rawText: text,
        error: 'No JSON found in response',
      };
    }

    try {
      const data = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        data,
        rawText: text,
      };
    } catch {
      return {
        success: false,
        rawText: text,
        error: 'Failed to parse JSON from response',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
    };
  }
}
```

---

## API Endpoint

### POST /api/analyze

Analyze an uploaded image.

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `image` file

**Response (200):**
```typescript
interface AnalyzeResponse {
  success: true;
  data: {
    subject?: { ... };
    wardrobe?: { ... };
    jewelry?: { ... };
    pose?: { ... };
    scene?: string;
    background?: { ... };
    camera?: { ... };
  };
}
```

**Response (400):**
```typescript
interface AnalyzeErrorResponse {
  success: false;
  error: string;
}
```

**Implementation:**
```typescript
// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { analyzeImage } from '@/lib/analyze';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: Request) {
  return withAuth(async () => {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size: 10MB' },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Analyze
    const result = await analyzeImage(buffer, file.type);

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
}
```

---

## UI Components

### Analyze Panel

```typescript
// components/builder/analyze-panel.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

interface AnalyzePanelProps {
  onSaveAsPresets: (data: Record<string, unknown>) => void;
}

export function AnalyzePanel({ onSaveAsPresets }: AnalyzePanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  async function handleAnalyze() {
    if (!file) return;

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleClear() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="h-full flex gap-4 p-4">
      {/* Left: Upload area */}
      <div className="w-1/2 flex flex-col">
        <div
          {...getRootProps()}
          className={`flex-1 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
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
              <p className="text-muted-foreground">
                {isDragActive
                  ? 'Drop the image here...'
                  : 'Drag and drop an image, or click to select'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Max 10MB. JPEG, PNG, WebP, GIF
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="flex-1"
          >
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={!file}>
            Clear
          </Button>
        </div>
      </div>

      {/* Right: Results */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm">Analysis Result</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {error && (
              <p className="text-destructive mb-4">{error}</p>
            )}

            {result ? (
              <>
                <Textarea
                  value={JSON.stringify(result, null, 2)}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => onSaveAsPresets(result)}
                    className="flex-1"
                  >
                    Save as Presets
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                    }}
                  >
                    Copy JSON
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {analyzing ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
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
}
```

### Save as Presets Modal

```typescript
// components/builder/save-presets-modal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { createComponent } from '@/lib/hooks/use-components';

interface SavePresetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisData: Record<string, unknown>;
}

export function SavePresetsModal({
  open,
  onOpenChange,
  analysisData,
}: SavePresetsModalProps) {
  const [saving, setSaving] = useState(false);
  const [baseName, setBaseName] = useState('');

  // Determine what presets can be created
  const hasSubject = !!analysisData.subject;
  const hasWardrobe = !!analysisData.wardrobe;
  const hasPose = !!analysisData.pose;
  const hasScene = !!analysisData.scene || !!analysisData.background;

  const [saveSubject, setSaveSubject] = useState(hasSubject);
  const [saveWardrobe, setSaveWardrobe] = useState(hasWardrobe);
  const [savePose, setSavePose] = useState(hasPose);
  const [saveScene, setSaveScene] = useState(hasScene);

  async function handleSave() {
    if (!baseName.trim()) return;

    setSaving(true);

    try {
      const promises: Promise<unknown>[] = [];

      if (saveSubject && analysisData.subject) {
        promises.push(
          createComponent({
            category_id: 'characters',
            name: `${baseName} - Character`,
            description: 'Created from image analysis',
            data: { subject: analysisData.subject },
          })
        );
      }

      if (saveWardrobe && analysisData.wardrobe) {
        promises.push(
          createComponent({
            category_id: 'wardrobe',
            name: `${baseName} - Wardrobe`,
            description: 'Created from image analysis',
            data: analysisData.wardrobe as Record<string, unknown>,
          })
        );
      }

      if (savePose && analysisData.pose) {
        promises.push(
          createComponent({
            category_id: 'poses',
            name: `${baseName} - Pose`,
            description: 'Created from image analysis',
            data: analysisData.pose as Record<string, unknown>,
          })
        );
      }

      if (saveScene) {
        const sceneData: Record<string, unknown> = {};
        if (analysisData.scene) sceneData.scene = analysisData.scene;
        if (analysisData.background) sceneData.background = analysisData.background;

        promises.push(
          createComponent({
            category_id: 'scenes',
            name: `${baseName} - Scene`,
            description: 'Created from image analysis',
            data: sceneData,
          })
        );
      }

      await Promise.all(promises);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save presets:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save as Presets</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseName">Base Name</Label>
            <Input
              id="baseName"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="e.g., Beach Photo Reference"
            />
          </div>

          <div className="space-y-2">
            <Label>Create Presets</Label>
            <div className="space-y-2">
              {hasSubject && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="subject"
                    checked={saveSubject}
                    onCheckedChange={(c) => setSaveSubject(!!c)}
                  />
                  <Label htmlFor="subject" className="font-normal">
                    Character (subject details)
                  </Label>
                </div>
              )}
              {hasWardrobe && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="wardrobe"
                    checked={saveWardrobe}
                    onCheckedChange={(c) => setSaveWardrobe(!!c)}
                  />
                  <Label htmlFor="wardrobe" className="font-normal">
                    Wardrobe (clothing)
                  </Label>
                </div>
              )}
              {hasPose && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pose"
                    checked={savePose}
                    onCheckedChange={(c) => setSavePose(!!c)}
                  />
                  <Label htmlFor="pose" className="font-normal">
                    Pose (body position)
                  </Label>
                </div>
              )}
              {hasScene && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="scene"
                    checked={saveScene}
                    onCheckedChange={(c) => setSaveScene(!!c)}
                  />
                  <Label htmlFor="scene" className="font-normal">
                    Scene (background/environment)
                  </Label>
                </div>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !baseName.trim()}
          >
            {saving ? 'Saving...' : 'Save Presets'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Integration with Builder

```typescript
// In components/builder/component-grid.tsx, handle analyze category
if (activeCategory === 'analyze') {
  return (
    <AnalyzePanel
      onSaveAsPresets={(data) => {
        setAnalysisData(data);
        setSavePresetsOpen(true);
      }}
    />
  );
}
```

---

## Implementation Checklist

- [ ] Install react-dropzone: `bun add react-dropzone`
- [ ] Add GEMINI_ANALYSIS_MODEL to .env.local
- [ ] Create `lib/analyze.ts` with analysis logic
- [ ] Create `app/api/analyze/route.ts`
- [ ] Create `components/builder/analyze-panel.tsx`
- [ ] Create `components/builder/save-presets-modal.tsx`
- [ ] Integrate analyze panel into builder layout
- [ ] Add checkbox component: `bunx shadcn@latest add checkbox`
- [ ] Test image upload (various formats)
- [ ] Test file size validation
- [ ] Test analysis with different image types
- [ ] Test saving as presets

---

## Error Handling

| Error | Cause | User Message |
|-------|-------|--------------|
| File too large | >10MB | "File too large. Maximum size: 10MB" |
| Invalid type | Not an image | "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" |
| No JSON in response | Model didn't output JSON | "Analysis failed to extract structured data" |
| Parse error | Malformed JSON | "Failed to parse analysis result" |
| API error | Gemini failure | "Analysis failed. Please try again." |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Image with no people | Still extracts scene/background |
| Multiple subjects | Describes primary subject |
| Abstract image | Best-effort description |
| Text-heavy image | May focus on text content |
| Very small image | May have lower quality analysis |
| Animated GIF | Analyzes first frame |
