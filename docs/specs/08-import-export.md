# Import/Export System

## Overview

Import and export components and prompts as JSON files. Also supports importing from the hi.md format for preset definitions.

**Dependencies:** 00-foundation-database.md, 01-authentication.md, 02-components-system.md, 07-saved-prompts.md

**Dependents:** None (standalone feature)

---

## Directory Structure

```
app/
└── api/
    ├── import/
    │   └── route.ts              # POST (import)
    └── export/
        └── route.ts              # GET (export)

lib/
└── parser.ts                     # hi.md parser
```

---

## Export Format

```typescript
interface ExportData {
  version: '1.0';
  exported_at: string;
  components: Component[];
  prompts: SavedPrompt[];
  categories: Category[];  // For reference
}
```

---

## API Endpoints

### GET /api/export

Export all data as JSON.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| components | boolean | Include components (default: true) |
| prompts | boolean | Include prompts (default: true) |
| category | string | Filter components by category |

**Response (200):**
```typescript
ExportData
```

**Implementation:**
```typescript
// app/api/export/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getAllComponents, getComponentsByCategory, getCategories } from '@/lib/repositories/components';
import { listPrompts } from '@/lib/repositories/prompts';

export async function GET(request: Request) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const includeComponents = searchParams.get('components') !== 'false';
    const includePrompts = searchParams.get('prompts') !== 'false';
    const categoryFilter = searchParams.get('category');

    const exportData: Record<string, unknown> = {
      version: '1.0',
      exported_at: new Date().toISOString(),
    };

    if (includeComponents) {
      exportData.components = categoryFilter
        ? getComponentsByCategory(categoryFilter)
        : getAllComponents();
      exportData.categories = getCategories();
    }

    if (includePrompts) {
      exportData.prompts = listPrompts();
    }

    const response = NextResponse.json(exportData);

    // Set download headers
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="prompt-builder-export-${Date.now()}.json"`
    );

    return response;
  });
}
```

### POST /api/import

Import data from JSON or hi.md format.

**Request:**
```typescript
interface ImportRequest {
  content: string;          // File content
  format: 'json' | 'himd';
  mode: 'merge' | 'replace';  // merge adds, replace clears first
}
```

**Response (200):**
```typescript
interface ImportResponse {
  success: true;
  imported: {
    components: number;
    prompts: number;
  };
  errors: string[];
}
```

**Implementation:**
```typescript
// app/api/import/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { createComponent, getAllComponents } from '@/lib/repositories/components';
import { createPrompt } from '@/lib/repositories/prompts';
import { parseHiMd } from '@/lib/parser';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  return withAuth(async () => {
    const body = await request.json();
    const { content, format, mode } = body;

    if (!content || !format) {
      return NextResponse.json(
        { error: 'content and format are required' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let importedComponents = 0;
    let importedPrompts = 0;

    // Replace mode: clear existing data
    if (mode === 'replace') {
      const db = getDb();
      db.prepare('DELETE FROM components').run();
      db.prepare('DELETE FROM saved_prompts').run();
    }

    if (format === 'json') {
      try {
        const data = JSON.parse(content);

        // Import components
        if (data.components && Array.isArray(data.components)) {
          for (const component of data.components) {
            try {
              createComponent({
                category_id: component.category_id,
                name: component.name,
                description: component.description,
                data: component.data,
              });
              importedComponents++;
            } catch (err) {
              errors.push(`Component "${component.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }
        }

        // Import prompts
        if (data.prompts && Array.isArray(data.prompts)) {
          for (const prompt of data.prompts) {
            try {
              createPrompt({
                name: prompt.name,
                description: prompt.description,
                prompt_json: prompt.prompt_json,
              });
              importedPrompts++;
            } catch (err) {
              errors.push(`Prompt "${prompt.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON format' },
          { status: 400 }
        );
      }
    } else if (format === 'himd') {
      try {
        const components = parseHiMd(content);

        for (const component of components) {
          try {
            createComponent(component);
            importedComponents++;
          } catch (err) {
            errors.push(`Component "${component.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      } catch (err) {
        return NextResponse.json(
          { error: `Failed to parse hi.md: ${err instanceof Error ? err.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use "json" or "himd"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: {
        components: importedComponents,
        prompts: importedPrompts,
      },
      errors,
    });
  });
}
```

---

## hi.md Parser (`lib/parser.ts`)

The hi.md format uses markdown-like structure with headers and code blocks for component definitions.

```typescript
// lib/parser.ts

export interface ParsedComponent {
  category_id: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
}

// Category mapping from hi.md headers
const CATEGORY_MAPPING: Record<string, string> = {
  'characters': 'characters',
  'character': 'characters',
  'physical traits': 'physical_traits',
  'physical': 'physical_traits',
  'traits': 'physical_traits',
  'jewelry': 'jewelry',
  'accessories': 'jewelry',
  'wardrobe': 'wardrobe',
  'outfit': 'wardrobe',
  'outfits': 'wardrobe',
  'tops': 'wardrobe_tops',
  'top': 'wardrobe_tops',
  'bottoms': 'wardrobe_bottoms',
  'bottom': 'wardrobe_bottoms',
  'footwear': 'wardrobe_footwear',
  'shoes': 'wardrobe_footwear',
  'poses': 'poses',
  'pose': 'poses',
  'scenes': 'scenes',
  'scene': 'scenes',
  'backgrounds': 'backgrounds',
  'background': 'backgrounds',
  'camera': 'camera',
  'camera settings': 'camera',
  'ban': 'ban_lists',
  'ban list': 'ban_lists',
  'ban lists': 'ban_lists',
};

export function parseHiMd(content: string): ParsedComponent[] {
  const components: ParsedComponent[] = [];
  const lines = content.split('\n');

  let currentCategory: string | null = null;
  let currentName: string | null = null;
  let currentDescription: string | null = null;
  let inCodeBlock = false;
  let codeContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for category header (## Category)
    const categoryMatch = line.match(/^##\s+(.+)$/);
    if (categoryMatch) {
      const headerText = categoryMatch[1].toLowerCase().trim();
      const mappedCategory = CATEGORY_MAPPING[headerText];
      if (mappedCategory) {
        currentCategory = mappedCategory;
      }
      continue;
    }

    // Check for component name (### Name)
    const nameMatch = line.match(/^###\s+(.+)$/);
    if (nameMatch) {
      currentName = nameMatch[1].trim();
      currentDescription = null;
      continue;
    }

    // Check for code block start/end
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block - save component
        if (currentCategory && currentName && codeContent.trim()) {
          try {
            const data = JSON.parse(codeContent);
            components.push({
              category_id: currentCategory,
              name: currentName,
              description: currentDescription || undefined,
              data,
            });
          } catch {
            // Invalid JSON, skip
            console.warn(`Invalid JSON for component "${currentName}"`);
          }
        }
        inCodeBlock = false;
        codeContent = '';
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    // Collect code content
    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    // Check for description (text after name, before code block)
    if (currentName && !inCodeBlock && line.trim() && !line.startsWith('#')) {
      if (!currentDescription) {
        currentDescription = line.trim();
      }
    }
  }

  return components;
}
```

---

## UI Components

### Import/Export Page

```typescript
// app/(protected)/library/import-export/page.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Upload } from 'lucide-react';

export default function ImportExportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  async function handleExport() {
    const response = await fetch('/api/export');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-builder-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportResult(null);

    try {
      const content = await file.text();
      const format = file.name.endsWith('.md') ? 'himd' : 'json';

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, format, mode: importMode }),
      });

      const data = await response.json();

      if (data.success) {
        setImportResult({
          success: true,
          message: `Imported ${data.imported.components} components and ${data.imported.prompts} prompts.${
            data.errors.length > 0 ? ` ${data.errors.length} errors.` : ''
          }`,
        });
      } else {
        setImportResult({
          success: false,
          message: data.error || 'Import failed',
        });
      }
    } catch {
      setImportResult({
        success: false,
        message: 'Failed to read file',
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Import / Export</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Download all components and saved prompts as a JSON file.
            </p>
            <Button onClick={handleExport}>
              Export All Data
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Import components from JSON or hi.md files.
            </p>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Import Mode</Label>
                <RadioGroup
                  value={importMode}
                  onValueChange={(v) => setImportMode(v as 'merge' | 'replace')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="font-normal">
                      Merge (add to existing)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="font-normal">
                      Replace (clear existing first)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.md"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Select File'}
              </Button>

              {importResult && (
                <p
                  className={`text-sm ${
                    importResult.success ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {importResult.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## hi.md Format Example

```markdown
## Characters

### Miku

Hatsune Miku character preset

```json
{
  "subject": {
    "description": "Hatsune Miku, iconic vocaloid",
    "hair": "long turquoise twintails",
    "eyes": "cyan eyes"
  }
}
```

### Luka

Megurine Luka character

```json
{
  "subject": {
    "description": "Megurine Luka",
    "hair": "long pink hair",
    "eyes": "blue eyes"
  }
}
```

## Poses

### Standing

Standard standing pose

```json
{
  "pose": {
    "body": "standing straight",
    "hands": "hands at sides"
  }
}
```

## Backgrounds

### Beach

```json
{
  "background": {
    "setting": "tropical beach",
    "props": ["palm trees", "ocean waves", "sand"]
  }
}
```
```

---

## Implementation Checklist

- [ ] Add radio-group component: `bunx shadcn@latest add radio-group`
- [ ] Create `lib/parser.ts` for hi.md parsing
- [ ] Create `app/api/export/route.ts`
- [ ] Create `app/api/import/route.ts`
- [ ] Create `app/(protected)/library/import-export/page.tsx`
- [ ] Add navigation link
- [ ] Test JSON export
- [ ] Test JSON import (merge mode)
- [ ] Test JSON import (replace mode)
- [ ] Test hi.md import
- [ ] Test error handling for invalid files

---

## Error Handling

| Error | Cause | User Message |
|-------|-------|--------------|
| Invalid JSON | Malformed file | "Invalid JSON format" |
| Missing category | Unknown category in hi.md | "Unknown category: X" |
| FK constraint | Invalid category_id | Component skipped, logged in errors |
| Duplicate import | Same data imported twice | Allowed (new IDs generated) |
| Large file | Very big export | May timeout - consider streaming |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty file | Success with 0 imported |
| JSON with extra fields | Ignored, only known fields used |
| hi.md with invalid JSON | Skip component, continue |
| Replace with empty file | Clears all data |
| Mixed valid/invalid | Import valid, report errors |
| Categories not in db | Use default categories |
