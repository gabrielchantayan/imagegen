# Prompt Builder UI

## Overview

The main interface for composing prompts by selecting components. Three-panel layout with category tabs, component selection, and JSON preview.

**Dependencies:** 00-foundation-database.md, 01-authentication.md, 02-components-system.md

**Dependents:** 04-generation-system.md

---

## Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Toolbar: [Generate] [Save Prompt] [Clear] │ Queue: 2/5 │ Settings ⌄    │
├──────────┬───────────────────────────────────────────────────────────────┤
│          │                                                               │
│  Sidebar │              Component Selection Grid                        │
│          │              ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ [Char]   │              │Card │ │Card │ │Card │ │Card │               │
│ [Traits] │              └─────┘ └─────┘ └─────┘ └─────┘               │
│ [Jewel]  │              ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ [Outfit] │              │Card │ │Card │ │Card │ │Card │               │
│ [Pose]   │              └─────┘ └─────┘ └─────┘ └─────┘               │
│ [Scene]  │                                                               │
│ [Bkgnd]  │              [+ Add New Component]                            │
│ [Camera] ├───────────────────────────────────────────────────────────────┤
│ [Bans]   │   ┌─ Tabs ─────────────────────────────────────────────────┐  │
│ ──────── │   │ [JSON Preview] [Generated Image]                        │  │
│ [Analyze]│   ├─────────────────────────────────────────────────────────┤  │
│          │   │ {                                                       │  │
│          │   │   "scene": "...",                                       │  │
│          │   │   "subject": { ... }                                    │  │
│          │   │ }                                                       │  │
│          │   └─────────────────────────────────────────────────────────┘  │
└──────────┴───────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
app/
└── (protected)/
    └── builder/
        └── page.tsx

components/
└── builder/
    ├── builder-layout.tsx      # Main layout container
    ├── category-sidebar.tsx    # Left sidebar with tabs
    ├── component-grid.tsx      # Component selection area
    ├── json-preview.tsx        # JSON editor panel
    ├── image-preview.tsx       # Generated image display
    ├── builder-toolbar.tsx     # Top toolbar
    ├── settings-dropdown.tsx   # Generation settings
    └── conflict-warning.tsx    # Inline conflict alerts

lib/
├── stores/
│   └── builder-store.ts        # Zustand store for builder state
└── prompt-composer.ts          # Logic for merging components
```

---

## State Management (Zustand)

```typescript
// lib/stores/builder-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Component } from '@/lib/types/database';

interface Subject {
  id: string;
  selections: Record<string, Component | null>;  // categoryId -> component
}

interface GenerationSettings {
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  resolution: '1080p' | '4K';
  imageCount: 1 | 2 | 3 | 4;
  safetyOverride: boolean;
  googleSearch: boolean;
}

interface BuilderState {
  // Subjects (multi-subject support)
  subjects: Subject[];
  activeSubjectId: string | null;

  // Shared selections (scene, background, camera, bans)
  sharedSelections: Record<string, Component | null>;

  // Active category in UI
  activeCategory: string;

  // Composed JSON (computed)
  composedPrompt: Record<string, unknown> | null;

  // Generation
  settings: GenerationSettings;
  lastGeneratedImage: string | null;
  generationStatus: 'idle' | 'queued' | 'generating' | 'completed' | 'failed';
  generationError: string | null;
  queuePosition: number | null;

  // Conflicts
  conflicts: ConflictInfo[];

  // Actions
  setActiveCategory: (category: string) => void;
  selectComponent: (categoryId: string, component: Component | null) => void;
  addSubject: () => void;
  removeSubject: (subjectId: string) => void;
  setActiveSubject: (subjectId: string) => void;
  updateSettings: (settings: Partial<GenerationSettings>) => void;
  clearBuilder: () => void;
  loadPrompt: (prompt: Record<string, unknown>) => void;
  setGenerationStatus: (status: BuilderState['generationStatus']) => void;
  setLastGeneratedImage: (path: string | null) => void;
}

interface ConflictInfo {
  field: string;
  existingValue: string;
  newValue: string;
  source: string;  // Component name that would override
}

const SHARED_CATEGORIES = ['scenes', 'backgrounds', 'camera', 'ban_lists'];

function generateSubjectId(): string {
  return `subject-${Date.now()}`;
}

function createEmptySubject(): Subject {
  return {
    id: generateSubjectId(),
    selections: {},
  };
}

const DEFAULT_SETTINGS: GenerationSettings = {
  aspectRatio: '3:4',
  resolution: '4K',
  imageCount: 1,
  safetyOverride: false,
  googleSearch: false,
};

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      subjects: [createEmptySubject()],
      activeSubjectId: null,
      sharedSelections: {},
      activeCategory: 'characters',
      composedPrompt: null,
      settings: DEFAULT_SETTINGS,
      lastGeneratedImage: null,
      generationStatus: 'idle',
      generationError: null,
      queuePosition: null,
      conflicts: [],

      setActiveCategory: (category) => {
        set({ activeCategory: category });

        // Auto-select first subject if switching to subject-specific category
        const state = get();
        if (!SHARED_CATEGORIES.includes(category) && !state.activeSubjectId && state.subjects.length > 0) {
          set({ activeSubjectId: state.subjects[0].id });
        }
      },

      selectComponent: (categoryId, component) => {
        const state = get();

        if (SHARED_CATEGORIES.includes(categoryId)) {
          // Shared selection
          set({
            sharedSelections: {
              ...state.sharedSelections,
              [categoryId]: component,
            },
          });
        } else {
          // Subject-specific selection
          const subjectId = state.activeSubjectId || state.subjects[0]?.id;
          if (!subjectId) return;

          set({
            subjects: state.subjects.map((s) =>
              s.id === subjectId
                ? { ...s, selections: { ...s.selections, [categoryId]: component } }
                : s
            ),
          });
        }

        // Recompute prompt and conflicts
        recomputePrompt(get, set);
      },

      addSubject: () => {
        const newSubject = createEmptySubject();
        set((state) => ({
          subjects: [...state.subjects, newSubject],
          activeSubjectId: newSubject.id,
        }));
      },

      removeSubject: (subjectId) => {
        set((state) => {
          const newSubjects = state.subjects.filter((s) => s.id !== subjectId);
          if (newSubjects.length === 0) {
            newSubjects.push(createEmptySubject());
          }
          return {
            subjects: newSubjects,
            activeSubjectId: state.activeSubjectId === subjectId
              ? newSubjects[0].id
              : state.activeSubjectId,
          };
        });
        recomputePrompt(get, set);
      },

      setActiveSubject: (subjectId) => {
        set({ activeSubjectId: subjectId });
      },

      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      clearBuilder: () => {
        const newSubject = createEmptySubject();
        set({
          subjects: [newSubject],
          activeSubjectId: newSubject.id,
          sharedSelections: {},
          composedPrompt: null,
          conflicts: [],
          lastGeneratedImage: null,
          generationStatus: 'idle',
          generationError: null,
        });
      },

      loadPrompt: (prompt) => {
        // Parse prompt JSON back into selections
        // This is complex - need to reverse the composition
        // For now, just set the raw prompt
        set({ composedPrompt: prompt });
      },

      setGenerationStatus: (status) => {
        set({ generationStatus: status });
      },

      setLastGeneratedImage: (path) => {
        set({ lastGeneratedImage: path });
      },
    }),
    {
      name: 'prompt-builder-storage',
      partialize: (state) => ({
        subjects: state.subjects,
        sharedSelections: state.sharedSelections,
        settings: state.settings,
      }),
    }
  )
);

function recomputePrompt(
  get: () => BuilderState,
  set: (partial: Partial<BuilderState>) => void
) {
  const state = get();
  const { prompt, conflicts } = composePrompt(state.subjects, state.sharedSelections);
  set({ composedPrompt: prompt, conflicts });
}
```

---

## Prompt Composition Logic

```typescript
// lib/prompt-composer.ts
import type { Component } from '@/lib/types/database';

interface Subject {
  id: string;
  selections: Record<string, Component | null>;
}

interface ConflictInfo {
  field: string;
  existingValue: string;
  newValue: string;
  source: string;
}

export function composePrompt(
  subjects: Subject[],
  sharedSelections: Record<string, Component | null>
): { prompt: Record<string, unknown>; conflicts: ConflictInfo[] } {
  const conflicts: ConflictInfo[] = [];

  // Start with empty prompt
  const prompt: Record<string, unknown> = {};

  // Build subjects array
  const subjectData: Record<string, unknown>[] = [];

  for (const subject of subjects) {
    const subjectPrompt: Record<string, unknown> = {};
    const processedFields = new Map<string, { value: unknown; source: string }>();

    // Apply selections in order of category
    // Characters first (base), then specific overrides
    const categoryOrder = [
      'characters',
      'physical_traits',
      'jewelry',
      'wardrobe',
      'wardrobe_tops',
      'wardrobe_bottoms',
      'wardrobe_footwear',
      'poses',
    ];

    for (const categoryId of categoryOrder) {
      const component = subject.selections[categoryId];
      if (!component) continue;

      // Merge component data into subject prompt
      for (const [key, value] of Object.entries(component.data)) {
        const existing = processedFields.get(key);

        if (existing && JSON.stringify(existing.value) !== JSON.stringify(value)) {
          // Conflict detected
          conflicts.push({
            field: key,
            existingValue: String(existing.value),
            newValue: String(value),
            source: component.name,
          });
        }

        // Later selections override earlier ones
        subjectPrompt[key] = value;
        processedFields.set(key, { value, source: component.name });
      }
    }

    if (Object.keys(subjectPrompt).length > 0) {
      subjectData.push(subjectPrompt);
    }
  }

  // Set subject(s)
  if (subjectData.length === 1) {
    prompt.subject = subjectData[0];
  } else if (subjectData.length > 1) {
    prompt.subjects = subjectData;
  }

  // Apply shared selections
  const sharedCategoryMapping: Record<string, string> = {
    scenes: 'scene',
    backgrounds: 'background',
    camera: 'camera',
    ban_lists: 'ban',
  };

  for (const [categoryId, component] of Object.entries(sharedSelections)) {
    if (!component) continue;

    const promptKey = sharedCategoryMapping[categoryId] || categoryId;

    // Merge component data
    if (typeof component.data === 'object' && !Array.isArray(component.data)) {
      for (const [key, value] of Object.entries(component.data)) {
        prompt[key] = value;
      }
    } else {
      prompt[promptKey] = component.data;
    }
  }

  return { prompt, conflicts };
}

// Format prompt for display
export function formatPromptJson(prompt: Record<string, unknown>): string {
  return JSON.stringify(prompt, null, 2);
}

// Parse edited JSON back
export function parsePromptJson(json: string): Record<string, unknown> | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
```

---

## UI Components

### Builder Layout

```typescript
// components/builder/builder-layout.tsx
'use client';

import { useBuilderStore } from '@/lib/stores/builder-store';
import { CategorySidebar } from './category-sidebar';
import { ComponentGrid } from './component-grid';
import { JsonPreview } from './json-preview';
import { ImagePreview } from './image-preview';
import { BuilderToolbar } from './builder-toolbar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

export function BuilderLayout() {
  const [previewTab, setPreviewTab] = useState<'json' | 'image'>('json');
  const generationStatus = useBuilderStore((s) => s.generationStatus);

  // Auto-switch to image tab when generation completes
  // useEffect to handle this

  return (
    <div className="h-screen flex flex-col">
      <BuilderToolbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <CategorySidebar className="w-48 border-r" />

        {/* Main content */}
        <ResizablePanelGroup direction="vertical" className="flex-1">
          {/* Component selection */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <ComponentGrid />
          </ResizablePanel>

          <ResizableHandle />

          {/* Preview area */}
          <ResizablePanel defaultSize={40} minSize={20}>
            <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as 'json' | 'image')}>
              <TabsList className="mx-4 mt-2">
                <TabsTrigger value="json">JSON Preview</TabsTrigger>
                <TabsTrigger value="image">Generated Image</TabsTrigger>
              </TabsList>

              <TabsContent value="json" className="h-[calc(100%-48px)]">
                <JsonPreview />
              </TabsContent>

              <TabsContent value="image" className="h-[calc(100%-48px)]">
                <ImagePreview />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
```

### Category Sidebar

```typescript
// components/builder/category-sidebar.tsx
'use client';

import { useBuilderStore } from '@/lib/stores/builder-store';
import { useComponents } from '@/lib/hooks/use-components';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface CategorySidebarProps {
  className?: string;
}

export function CategorySidebar({ className }: CategorySidebarProps) {
  const { categories } = useComponents();
  const activeCategory = useBuilderStore((s) => s.activeCategory);
  const setActiveCategory = useBuilderStore((s) => s.setActiveCategory);
  const subjects = useBuilderStore((s) => s.subjects);
  const sharedSelections = useBuilderStore((s) => s.sharedSelections);

  // Check if category has selections
  function hasSelection(categoryId: string): boolean {
    const isShared = ['scenes', 'backgrounds', 'camera', 'ban_lists'].includes(categoryId);

    if (isShared) {
      return !!sharedSelections[categoryId];
    }

    return subjects.some((s) => !!s.selections[categoryId]);
  }

  return (
    <div className={cn('flex flex-col py-2', className)}>
      <div className="px-3 py-2">
        <h2 className="text-sm font-semibold">Categories</h2>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start',
              hasSelection(category.id) && 'font-medium'
            )}
            onClick={() => setActiveCategory(category.id)}
          >
            {hasSelection(category.id) && (
              <span className="w-2 h-2 rounded-full bg-primary mr-2" />
            )}
            {category.name}
          </Button>
        ))}
      </nav>

      <Separator className="my-2" />

      <div className="px-2">
        <Button
          variant={activeCategory === 'analyze' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setActiveCategory('analyze')}
        >
          Analyze Image
        </Button>
      </div>
    </div>
  );
}
```

### Component Grid

```typescript
// components/builder/component-grid.tsx
'use client';

import { useBuilderStore } from '@/lib/stores/builder-store';
import { useComponents } from '@/lib/hooks/use-components';
import { ComponentCard } from '@/components/library/component-card';
import { ComponentEditor } from '@/components/library/component-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { createComponent, updateComponent, deleteComponent } from '@/lib/hooks/use-components';
import type { Component } from '@/lib/types/database';

const SHARED_CATEGORIES = ['scenes', 'backgrounds', 'camera', 'ban_lists'];

export function ComponentGrid() {
  const activeCategory = useBuilderStore((s) => s.activeCategory);
  const selectComponent = useBuilderStore((s) => s.selectComponent);
  const subjects = useBuilderStore((s) => s.subjects);
  const activeSubjectId = useBuilderStore((s) => s.activeSubjectId);
  const sharedSelections = useBuilderStore((s) => s.sharedSelections);

  const { components, categories, mutate } = useComponents(activeCategory);
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);

  // Get current selection for this category
  const isShared = SHARED_CATEGORIES.includes(activeCategory);
  const currentSelection = isShared
    ? sharedSelections[activeCategory]
    : subjects.find((s) => s.id === activeSubjectId)?.selections[activeCategory];

  // Filter components by search
  const filteredComponents = components.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const category = categories.find((c) => c.id === activeCategory);

  function handleSelect(component: Component) {
    // Toggle selection
    if (currentSelection?.id === component.id) {
      selectComponent(activeCategory, null);
    } else {
      selectComponent(activeCategory, component);
    }
  }

  async function handleSave(data: { name: string; description: string; data: Record<string, unknown> }) {
    if (editingComponent) {
      await updateComponent(editingComponent.id, data);
    } else {
      await createComponent({
        category_id: activeCategory,
        ...data,
      });
    }
    mutate();
  }

  async function handleDelete() {
    if (editingComponent) {
      await deleteComponent(editingComponent.id);
      mutate();
      setEditorOpen(false);
      setEditingComponent(null);
    }
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Input
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={() => {
            setEditingComponent(null);
            setEditorOpen(true);
          }}
        >
          + Add New
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredComponents.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              selected={currentSelection?.id === component.id}
              onSelect={() => handleSelect(component)}
              onEdit={() => {
                setEditingComponent(component);
                setEditorOpen(true);
              }}
            />
          ))}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {search ? 'No matches found.' : 'No components yet. Create one to get started.'}
          </div>
        )}
      </div>

      {/* Editor modal */}
      <ComponentEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        component={editingComponent || undefined}
        category={category}
        onSave={handleSave}
        onDelete={editingComponent ? handleDelete : undefined}
      />
    </div>
  );
}
```

### JSON Preview

```typescript
// components/builder/json-preview.tsx
'use client';

import { useBuilderStore } from '@/lib/stores/builder-store';
import { formatPromptJson, parsePromptJson } from '@/lib/prompt-composer';
import { Textarea } from '@/components/ui/textarea';
import { ConflictWarning } from './conflict-warning';
import { useState, useEffect } from 'react';

export function JsonPreview() {
  const composedPrompt = useBuilderStore((s) => s.composedPrompt);
  const conflicts = useBuilderStore((s) => s.conflicts);

  const [editedJson, setEditedJson] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Sync composed prompt to editor
  useEffect(() => {
    if (composedPrompt) {
      setEditedJson(formatPromptJson(composedPrompt));
      setJsonError('');
    } else {
      setEditedJson('{}');
    }
  }, [composedPrompt]);

  function handleJsonChange(value: string) {
    setEditedJson(value);

    // Validate JSON
    const parsed = parsePromptJson(value);
    if (parsed === null) {
      setJsonError('Invalid JSON');
    } else {
      setJsonError('');
    }
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="mb-4 space-y-2">
          {conflicts.map((conflict, i) => (
            <ConflictWarning key={i} conflict={conflict} />
          ))}
        </div>
      )}

      {/* JSON editor */}
      <Textarea
        value={editedJson}
        onChange={(e) => handleJsonChange(e.target.value)}
        className={`flex-1 font-mono text-sm resize-none ${
          jsonError ? 'border-destructive' : ''
        }`}
        placeholder="{}"
      />

      {jsonError && (
        <p className="mt-2 text-sm text-destructive">{jsonError}</p>
      )}
    </div>
  );
}
```

### Conflict Warning

```typescript
// components/builder/conflict-warning.tsx
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConflictWarningProps {
  conflict: {
    field: string;
    existingValue: string;
    newValue: string;
    source: string;
  };
}

export function ConflictWarning({ conflict }: ConflictWarningProps) {
  return (
    <Alert variant="warning">
      <AlertDescription>
        <strong>Conflict:</strong> Field "{conflict.field}" has value "{conflict.existingValue}"
        but "{conflict.source}" sets it to "{conflict.newValue}".
        The latter will be used.
      </AlertDescription>
    </Alert>
  );
}
```

### Builder Toolbar

```typescript
// components/builder/builder-toolbar.tsx
'use client';

import { useBuilderStore } from '@/lib/stores/builder-store';
import { Button } from '@/components/ui/button';
import { SettingsDropdown } from './settings-dropdown';

export function BuilderToolbar() {
  const clearBuilder = useBuilderStore((s) => s.clearBuilder);
  const composedPrompt = useBuilderStore((s) => s.composedPrompt);
  const generationStatus = useBuilderStore((s) => s.generationStatus);
  const queuePosition = useBuilderStore((s) => s.queuePosition);

  async function handleGenerate() {
    // Will be implemented in 04-generation-system.md
  }

  async function handleSavePrompt() {
    // Will be implemented in 07-saved-prompts.md
  }

  return (
    <div className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleGenerate}
          disabled={!composedPrompt || generationStatus === 'generating'}
        >
          {generationStatus === 'generating' ? 'Generating...' : 'Generate'}
        </Button>

        <Button variant="outline" onClick={handleSavePrompt} disabled={!composedPrompt}>
          Save Prompt
        </Button>

        <Button variant="ghost" onClick={clearBuilder}>
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {queuePosition !== null && (
          <span className="text-sm text-muted-foreground">
            Queue: {queuePosition}/5
          </span>
        )}

        <span className="text-xs text-muted-foreground">
          ⌘Enter to generate
        </span>

        <SettingsDropdown />
      </div>
    </div>
  );
}
```

---

## Keyboard Shortcuts

```typescript
// lib/hooks/use-keyboard-shortcuts.ts
'use client';

import { useEffect } from 'react';
import { useBuilderStore } from '@/lib/stores/builder-store';

export function useKeyboardShortcuts() {
  const composedPrompt = useBuilderStore((s) => s.composedPrompt);
  const generationStatus = useBuilderStore((s) => s.generationStatus);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // ⌘/Ctrl + Enter: Generate
      if (isMod && e.key === 'Enter') {
        e.preventDefault();
        if (composedPrompt && generationStatus !== 'generating') {
          // Trigger generation
        }
      }

      // ⌘/Ctrl + S: Save prompt
      if (isMod && e.key === 's') {
        e.preventDefault();
        // Trigger save
      }

      // ⌘/Ctrl + K: Search
      if (isMod && e.key === 'k') {
        e.preventDefault();
        // Focus search input
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [composedPrompt, generationStatus]);
}
```

---

## Implementation Checklist

- [ ] Install zustand: `bun add zustand`
- [ ] Install resizable panels: `bunx shadcn@latest add resizable`
- [ ] Install tabs: `bunx shadcn@latest add tabs`
- [ ] Create `lib/stores/builder-store.ts`
- [ ] Create `lib/prompt-composer.ts`
- [ ] Create `components/builder/builder-layout.tsx`
- [ ] Create `components/builder/category-sidebar.tsx`
- [ ] Create `components/builder/component-grid.tsx`
- [ ] Create `components/builder/json-preview.tsx`
- [ ] Create `components/builder/image-preview.tsx` (stub for now)
- [ ] Create `components/builder/builder-toolbar.tsx`
- [ ] Create `components/builder/settings-dropdown.tsx`
- [ ] Create `components/builder/conflict-warning.tsx`
- [ ] Create `app/(protected)/builder/page.tsx`
- [ ] Implement keyboard shortcuts
- [ ] Test component selection and deselection
- [ ] Test multi-subject support
- [ ] Test conflict detection
- [ ] Test state persistence across refreshes
- [ ] Test responsive layout

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No components selected | Empty JSON `{}` |
| Same component selected twice | Toggle off (deselect) |
| Component deleted while selected | Remove from selections |
| Invalid JSON in editor | Show error, block generation |
| Multiple subjects with conflicts | Each subject resolves independently |
| Clear while generating | Cancel or allow to complete? |
