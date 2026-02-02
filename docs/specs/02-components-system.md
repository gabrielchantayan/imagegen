# Components System

## Overview

CRUD system for managing component presets (characters, wardrobes, poses, scenes, etc.). Components are reusable JSON snippets that get composed into prompts.

**Dependencies:** 00-foundation-database.md, 01-authentication.md

**Dependents:** 03-prompt-builder-ui.md, 08-import-export.md

---

## Data Model

### Component Structure

Each component has:
- Metadata (id, name, description, category)
- JSON data payload (the actual prompt content)
- Optional thumbnail for visual identification

```typescript
interface Component {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  data: Record<string, unknown>;  // The JSON content
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
}
```

### Category Reference

| Category ID | Purpose | Example Data Shape |
|-------------|---------|-------------------|
| characters | Complete character preset | `{ subject: { ... } }` |
| physical_traits | Hair, skin, body | `{ hair: "...", skin: "..." }` |
| jewelry | Accessories | `{ jewelry: "..." }` |
| wardrobe | Complete outfit | `{ top: "...", bottom: "...", footwear: "..." }` |
| wardrobe_tops | Upper garments | `{ top: "..." }` |
| wardrobe_bottoms | Lower garments | `{ bottom: "..." }` |
| wardrobe_footwear | Shoes | `{ footwear: "..." }` |
| poses | Body position | `{ pose: "...", hands: "..." }` |
| scenes | Scene description | `{ scene: "..." }` |
| backgrounds | Environment | `{ background: "...", props: [...] }` |
| camera | Camera settings | `{ device: "...", flash: "...", color: "..." }` |
| ban_lists | Exclusions | `{ ban: [...] }` |

---

## Directory Structure

```
app/
└── api/
    └── components/
        ├── route.ts              # GET (list), POST (create)
        └── [id]/
            └── route.ts          # GET, PUT, DELETE

lib/
└── repositories/
    └── components.ts             # Database operations
```

---

## Repository Layer (`lib/repositories/components.ts`)

```typescript
import { getDb, generateId } from '../db';
import { parseJson, now } from '../db-helpers';
import type { Component, Category } from '../types/database';

// Get all categories
export function getCategories(): Category[] {
  const db = getDb();
  return db.prepare('SELECT * FROM categories ORDER BY sort_order').all() as Category[];
}

// Get components by category
export function getComponentsByCategory(categoryId: string): Component[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM components
    WHERE category_id = ?
    ORDER BY updated_at DESC
  `).all(categoryId) as RawComponent[];

  return rows.map(parseComponent);
}

// Get all components
export function getAllComponents(): Component[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM components ORDER BY category_id, updated_at DESC
  `).all() as RawComponent[];

  return rows.map(parseComponent);
}

// Get single component
export function getComponent(id: string): Component | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(id) as RawComponent | undefined;
  return row ? parseComponent(row) : null;
}

// Create component
export interface CreateComponentInput {
  category_id: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
}

export function createComponent(input: CreateComponentInput): Component {
  const db = getDb();
  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO components (id, category_id, name, description, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.category_id, input.name, input.description || null, JSON.stringify(input.data), timestamp, timestamp);

  return getComponent(id)!;
}

// Update component
export interface UpdateComponentInput {
  name?: string;
  description?: string;
  data?: Record<string, unknown>;
  thumbnail_path?: string;
}

export function updateComponent(id: string, input: UpdateComponentInput): Component | null {
  const db = getDb();
  const existing = getComponent(id);
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
  if (input.data !== undefined) {
    updates.push('data = ?');
    values.push(JSON.stringify(input.data));
  }
  if (input.thumbnail_path !== undefined) {
    updates.push('thumbnail_path = ?');
    values.push(input.thumbnail_path);
  }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  values.push(now());
  values.push(id);

  db.prepare(`UPDATE components SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getComponent(id);
}

// Delete component
export function deleteComponent(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM components WHERE id = ?').run(id);
  return result.changes > 0;
}

// Search components
export function searchComponents(query: string, categoryId?: string): Component[] {
  const db = getDb();
  const pattern = `%${query}%`;

  let sql = `
    SELECT * FROM components
    WHERE (name LIKE ? OR description LIKE ?)
  `;
  const params: string[] = [pattern, pattern];

  if (categoryId) {
    sql += ' AND category_id = ?';
    params.push(categoryId);
  }

  sql += ' ORDER BY updated_at DESC LIMIT 50';

  const rows = db.prepare(sql).all(...params) as RawComponent[];
  return rows.map(parseComponent);
}

// Internal helpers
interface RawComponent {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  data: string;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
}

function parseComponent(row: RawComponent): Component {
  return {
    ...row,
    data: JSON.parse(row.data),
  };
}
```

---

## API Endpoints

### GET /api/components

List all components, optionally filtered by category.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| category | string | Filter by category_id |
| search | string | Search in name/description |

**Response (200):**
```typescript
interface ComponentsListResponse {
  components: Component[];
  categories: Category[];
}
```

**Implementation:**
```typescript
// app/api/components/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import {
  getAllComponents,
  getComponentsByCategory,
  searchComponents,
  getCategories,
  createComponent
} from '@/lib/repositories/components';

export async function GET(request: Request) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let components;
    if (search) {
      components = searchComponents(search, category || undefined);
    } else if (category) {
      components = getComponentsByCategory(category);
    } else {
      components = getAllComponents();
    }

    const categories = getCategories();

    return NextResponse.json({ components, categories });
  });
}

export async function POST(request: Request) {
  return withAuth(async () => {
    const body = await request.json();

    // Validate required fields
    if (!body.category_id || !body.name || !body.data) {
      return NextResponse.json(
        { error: 'category_id, name, and data are required' },
        { status: 400 }
      );
    }

    // Validate data is an object
    if (typeof body.data !== 'object' || Array.isArray(body.data)) {
      return NextResponse.json(
        { error: 'data must be a JSON object' },
        { status: 400 }
      );
    }

    const component = createComponent({
      category_id: body.category_id,
      name: body.name,
      description: body.description,
      data: body.data,
    });

    return NextResponse.json(component, { status: 201 });
  });
}
```

### GET /api/components/:id

Get a single component.

**Response (200):**
```typescript
Component
```

**Response (404):**
```typescript
{ error: "Component not found" }
```

### PUT /api/components/:id

Update a component.

**Request:**
```typescript
interface UpdateComponentRequest {
  name?: string;
  description?: string;
  data?: Record<string, unknown>;
}
```

**Response (200):**
```typescript
Component
```

### DELETE /api/components/:id

Delete a component.

**Response (200):**
```typescript
{ success: true }
```

**Implementation:**
```typescript
// app/api/components/[id]/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getComponent, updateComponent, deleteComponent } from '@/lib/repositories/components';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async () => {
    const component = getComponent(params.id);

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(component);
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async () => {
    const body = await request.json();

    // Validate data if provided
    if (body.data !== undefined) {
      if (typeof body.data !== 'object' || Array.isArray(body.data)) {
        return NextResponse.json(
          { error: 'data must be a JSON object' },
          { status: 400 }
        );
      }
    }

    const component = updateComponent(params.id, {
      name: body.name,
      description: body.description,
      data: body.data,
    });

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(component);
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async () => {
    const deleted = deleteComponent(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  });
}
```

---

## React Hooks

```typescript
// lib/hooks/use-components.ts
'use client';

import useSWR from 'swr';
import type { Component, Category } from '@/lib/types/database';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ComponentsData {
  components: Component[];
  categories: Category[];
}

export function useComponents(category?: string) {
  const url = category
    ? `/api/components?category=${category}`
    : '/api/components';

  const { data, error, isLoading, mutate } = useSWR<ComponentsData>(url, fetcher);

  return {
    components: data?.components || [],
    categories: data?.categories || [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useComponent(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Component>(
    `/api/components/${id}`,
    fetcher
  );

  return {
    component: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}

// Mutation helpers
export async function createComponent(data: {
  category_id: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
}): Promise<Component> {
  const res = await fetch('/api/components', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create component');
  }

  return res.json();
}

export async function updateComponent(
  id: string,
  data: { name?: string; description?: string; data?: Record<string, unknown> }
): Promise<Component> {
  const res = await fetch(`/api/components/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update component');
  }

  return res.json();
}

export async function deleteComponent(id: string): Promise<void> {
  const res = await fetch(`/api/components/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete component');
  }
}
```

---

## UI Components

### Component Card

```typescript
// components/library/component-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Component } from '@/lib/types/database';

interface ComponentCardProps {
  component: Component;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
}

export function ComponentCard({
  component,
  selected,
  onSelect,
  onEdit
}: ComponentCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">
            {component.name}
          </CardTitle>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      {component.description && (
        <CardContent className="p-4 pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {component.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
```

### Component Editor Modal

```typescript
// components/library/component-editor.tsx
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
import type { Component, Category } from '@/lib/types/database';

interface ComponentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component?: Component;  // If editing existing
  category?: Category;     // If creating new
  onSave: (data: {
    name: string;
    description: string;
    data: Record<string, unknown>;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function ComponentEditor({
  open,
  onOpenChange,
  component,
  category,
  onSave,
  onDelete,
}: ComponentEditorProps) {
  const [name, setName] = useState(component?.name || '');
  const [description, setDescription] = useState(component?.description || '');
  const [jsonData, setJsonData] = useState(
    component ? JSON.stringify(component.data, null, 2) : '{}'
  );
  const [jsonError, setJsonError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = !!component;
  const title = isEditing ? `Edit ${component.name}` : `New ${category?.name}`;

  async function handleSave() {
    // Validate JSON
    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(jsonData);
    } catch {
      setJsonError('Invalid JSON');
      return;
    }

    setSaving(true);
    try {
      await onSave({ name, description, data: parsedData });
      onOpenChange(false);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Component name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">JSON Data</Label>
            <Textarea
              id="data"
              value={jsonData}
              onChange={(e) => {
                setJsonData(e.target.value);
                setJsonError('');
              }}
              className="font-mono text-sm min-h-[200px]"
              placeholder="{}"
            />
            {jsonError && (
              <p className="text-sm text-destructive">{jsonError}</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Implementation Checklist

- [ ] Install SWR: `bun add swr`
- [ ] Create `lib/repositories/components.ts`
- [ ] Create `app/api/components/route.ts` (GET, POST)
- [ ] Create `app/api/components/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Create `lib/hooks/use-components.ts`
- [ ] Create `components/library/component-card.tsx`
- [ ] Create `components/library/component-editor.tsx`
- [ ] Add JSON validation on create/update
- [ ] Test CRUD operations via API
- [ ] Test filtering by category
- [ ] Test search functionality
- [ ] Verify auth protection on all endpoints

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Create with invalid category_id | 400 error (FK constraint) |
| Create with invalid JSON in data | 400 error |
| Update non-existent component | 404 error |
| Delete non-existent component | 404 error |
| Search with empty query | Return all (no filter) |
| Component with empty data object | Allowed (valid JSON) |

---

## Validation Rules

| Field | Rules |
|-------|-------|
| name | Required, non-empty string |
| category_id | Required, must exist in categories |
| description | Optional string |
| data | Required, must be valid JSON object (not array) |
