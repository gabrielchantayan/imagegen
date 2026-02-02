# Saved Prompts Library

## Overview

Save, organize, and reuse complete composed prompts. Shared library accessible to all users.

**Dependencies:** 00-foundation-database.md, 01-authentication.md, 03-prompt-builder-ui.md

**Dependents:** None (standalone feature)

---

## Directory Structure

```
app/
├── api/
│   └── prompts/
│       ├── route.ts              # GET (list), POST (create)
│       └── [id]/
│           └── route.ts          # GET, PUT, DELETE
└── (protected)/
    └── library/
        └── page.tsx              # Prompts library page

components/
└── library/
    ├── prompts-list.tsx          # List of saved prompts
    ├── prompt-card.tsx           # Individual prompt card
    └── save-prompt-modal.tsx     # Save prompt dialog
```

---

## Data Model

Uses `saved_prompts` table from 00-foundation-database.md.

```typescript
interface SavedPrompt {
  id: string;
  name: string;
  description: string | null;
  prompt_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

---

## Repository (`lib/repositories/prompts.ts`)

```typescript
import { getDb, generateId } from '../db';
import { now } from '../db-helpers';
import type { SavedPrompt } from '../types/database';

interface RawSavedPrompt {
  id: string;
  name: string;
  description: string | null;
  prompt_json: string;
  created_at: string;
  updated_at: string;
}

function parsePrompt(row: RawSavedPrompt): SavedPrompt {
  return {
    ...row,
    prompt_json: JSON.parse(row.prompt_json),
  };
}

// List all prompts
export function listPrompts(options: { search?: string } = {}): SavedPrompt[] {
  const db = getDb();

  let sql = 'SELECT * FROM saved_prompts';
  const params: string[] = [];

  if (options.search) {
    sql += ' WHERE name LIKE ? OR description LIKE ?';
    const pattern = `%${options.search}%`;
    params.push(pattern, pattern);
  }

  sql += ' ORDER BY updated_at DESC';

  const rows = db.prepare(sql).all(...params) as RawSavedPrompt[];
  return rows.map(parsePrompt);
}

// Get single prompt
export function getPrompt(id: string): SavedPrompt | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM saved_prompts WHERE id = ?').get(id) as RawSavedPrompt | undefined;
  return row ? parsePrompt(row) : null;
}

// Create prompt
export interface CreatePromptInput {
  name: string;
  description?: string;
  prompt_json: Record<string, unknown>;
}

export function createPrompt(input: CreatePromptInput): SavedPrompt {
  const db = getDb();
  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO saved_prompts (id, name, description, prompt_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.description || null,
    JSON.stringify(input.prompt_json),
    timestamp,
    timestamp
  );

  return getPrompt(id)!;
}

// Update prompt
export interface UpdatePromptInput {
  name?: string;
  description?: string;
  prompt_json?: Record<string, unknown>;
}

export function updatePrompt(id: string, input: UpdatePromptInput): SavedPrompt | null {
  const db = getDb();
  const existing = getPrompt(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.prompt_json !== undefined) {
    updates.push('prompt_json = ?');
    values.push(JSON.stringify(input.prompt_json));
  }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  values.push(now());
  values.push(id);

  db.prepare(`UPDATE saved_prompts SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getPrompt(id);
}

// Delete prompt
export function deletePrompt(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM saved_prompts WHERE id = ?').run(id);
  return result.changes > 0;
}
```

---

## API Endpoints

### GET /api/prompts

List all saved prompts.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Search in name/description |

**Response (200):**
```typescript
interface PromptsListResponse {
  prompts: SavedPrompt[];
}
```

### POST /api/prompts

Save a new prompt.

**Request:**
```typescript
interface CreatePromptRequest {
  name: string;
  description?: string;
  prompt_json: Record<string, unknown>;
}
```

**Response (201):**
```typescript
SavedPrompt
```

### GET /api/prompts/:id

Get single prompt.

### PUT /api/prompts/:id

Update a prompt.

### DELETE /api/prompts/:id

Delete a prompt.

**Implementation:**
```typescript
// app/api/prompts/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { listPrompts, createPrompt } from '@/lib/repositories/prompts';

export async function GET(request: Request) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;

    const prompts = listPrompts({ search });

    return NextResponse.json({ prompts });
  });
}

export async function POST(request: Request) {
  return withAuth(async () => {
    const body = await request.json();

    if (!body.name || !body.prompt_json) {
      return NextResponse.json(
        { error: 'name and prompt_json are required' },
        { status: 400 }
      );
    }

    if (typeof body.prompt_json !== 'object') {
      return NextResponse.json(
        { error: 'prompt_json must be an object' },
        { status: 400 }
      );
    }

    const prompt = createPrompt({
      name: body.name,
      description: body.description,
      prompt_json: body.prompt_json,
    });

    return NextResponse.json(prompt, { status: 201 });
  });
}

// app/api/prompts/[id]/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getPrompt, updatePrompt, deletePrompt } from '@/lib/repositories/prompts';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async () => {
    const prompt = getPrompt(params.id);

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json(prompt);
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async () => {
    const body = await request.json();

    const prompt = updatePrompt(params.id, {
      name: body.name,
      description: body.description,
      prompt_json: body.prompt_json,
    });

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json(prompt);
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async () => {
    const deleted = deletePrompt(params.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  });
}
```

---

## React Hooks

```typescript
// lib/hooks/use-prompts.ts
'use client';

import useSWR from 'swr';
import type { SavedPrompt } from '@/lib/types/database';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePrompts(search?: string) {
  const url = search ? `/api/prompts?search=${encodeURIComponent(search)}` : '/api/prompts';

  const { data, error, isLoading, mutate } = useSWR<{ prompts: SavedPrompt[] }>(
    url,
    fetcher
  );

  return {
    prompts: data?.prompts || [],
    isLoading,
    error,
    mutate,
  };
}

export function usePrompt(id: string) {
  const { data, error, isLoading, mutate } = useSWR<SavedPrompt>(
    `/api/prompts/${id}`,
    fetcher
  );

  return {
    prompt: data,
    isLoading,
    error,
    mutate,
  };
}

// Mutations
export async function savePrompt(data: {
  name: string;
  description?: string;
  prompt_json: Record<string, unknown>;
}): Promise<SavedPrompt> {
  const res = await fetch('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to save prompt');
  }

  return res.json();
}

export async function updatePrompt(
  id: string,
  data: { name?: string; description?: string; prompt_json?: Record<string, unknown> }
): Promise<SavedPrompt> {
  const res = await fetch(`/api/prompts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update prompt');
  }

  return res.json();
}

export async function deletePrompt(id: string): Promise<void> {
  const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete prompt');
  }
}
```

---

## UI Components

### Save Prompt Modal

```typescript
// components/library/save-prompt-modal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { savePrompt } from '@/lib/hooks/use-prompts';

interface SavePromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptJson: Record<string, unknown>;
  onSaved?: () => void;
}

export function SavePromptModal({
  open,
  onOpenChange,
  promptJson,
  onSaved,
}: SavePromptModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      await savePrompt({
        name: name.trim(),
        description: description.trim() || undefined,
        prompt_json: promptJson,
      });
      onOpenChange(false);
      setName('');
      setDescription('');
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome prompt"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <Textarea
              value={JSON.stringify(promptJson, null, 2)}
              readOnly
              className="font-mono text-xs h-32"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Prompts List

```typescript
// components/library/prompts-list.tsx
'use client';

import { useState } from 'react';
import { usePrompts, deletePrompt } from '@/lib/hooks/use-prompts';
import { PromptCard } from './prompt-card';
import { Input } from '@/components/ui/input';
import type { SavedPrompt } from '@/lib/types/database';

interface PromptsListProps {
  onSelect: (prompt: SavedPrompt) => void;
}

export function PromptsList({ onSelect }: PromptsListProps) {
  const [search, setSearch] = useState('');
  const { prompts, isLoading, mutate } = usePrompts(search);

  async function handleDelete(id: string) {
    if (!confirm('Delete this prompt?')) return;
    await deletePrompt(id);
    mutate();
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Input
        placeholder="Search prompts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-xs"
      />

      {prompts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'No prompts match your search.' : 'No saved prompts yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onSelect={() => onSelect(prompt)}
              onDelete={() => handleDelete(prompt.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Prompt Card

```typescript
// components/library/prompt-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { SavedPrompt } from '@/lib/types/database';

interface PromptCardProps {
  prompt: SavedPrompt;
  onSelect: () => void;
  onDelete: () => void;
}

export function PromptCard({ prompt, onSelect, onDelete }: PromptCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{prompt.name}</CardTitle>
            {prompt.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {prompt.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(prompt.updated_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
```

### Library Page

```typescript
// app/(protected)/library/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { PromptsList } from '@/components/library/prompts-list';
import { useBuilderStore } from '@/lib/stores/builder-store';
import type { SavedPrompt } from '@/lib/types/database';

export default function LibraryPage() {
  const router = useRouter();
  const loadPrompt = useBuilderStore((s) => s.loadPrompt);

  function handleSelect(prompt: SavedPrompt) {
    loadPrompt(prompt.prompt_json);
    router.push('/builder');
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Saved Prompts</h1>
      <PromptsList onSelect={handleSelect} />
    </div>
  );
}
```

---

## Integration with Builder Toolbar

```typescript
// In components/builder/builder-toolbar.tsx

const [saveModalOpen, setSaveModalOpen] = useState(false);
const composedPrompt = useBuilderStore((s) => s.composedPrompt);

// In JSX:
<Button
  variant="outline"
  onClick={() => setSaveModalOpen(true)}
  disabled={!composedPrompt}
>
  Save Prompt
</Button>

<SavePromptModal
  open={saveModalOpen}
  onOpenChange={setSaveModalOpen}
  promptJson={composedPrompt || {}}
/>
```

---

## Implementation Checklist

- [x] Create `lib/repositories/prompts.ts`
- [x] Create `app/api/prompts/route.ts`
- [x] Create `app/api/prompts/[id]/route.ts`
- [x] Create `lib/hooks/use-prompts.ts`
- [x] Create `components/library/save-prompt-modal.tsx`
- [x] Create `components/library/prompts-list.tsx`
- [x] Create `components/library/prompt-card.tsx`
- [x] Create `app/(protected)/library/page.tsx`
- [x] Integrate save modal with builder toolbar
- [x] Add navigation link to library page
- [ ] Test save prompt flow
- [ ] Test load prompt into builder
- [ ] Test search
- [ ] Test delete

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Save with empty name | Blocked (validation) |
| Save empty prompt | Allowed (valid JSON) |
| Duplicate names | Allowed (no unique constraint) |
| Delete while viewing | Redirect to list |
| Load prompt with missing components | Load JSON as-is |
| Very long prompt JSON | Scrollable preview |
