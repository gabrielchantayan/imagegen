# History & Gallery

## Overview

Browse, search, and manage past image generations. Includes favorites functionality and the ability to reuse prompts.

**Dependencies:** 00-foundation-database.md, 01-authentication.md, 04-generation-system.md

**Dependents:** None (standalone feature)

---

## Directory Structure

```
app/
├── api/
│   └── history/
│       ├── route.ts              # GET (list), DELETE (bulk)
│       └── [id]/
│           ├── route.ts          # GET, DELETE
│           └── favorite/
│               └── route.ts      # POST (toggle)
└── (protected)/
    └── history/
        └── page.tsx

components/
└── history/
    ├── history-grid.tsx          # Image grid
    ├── history-card.tsx          # Individual image card
    ├── history-filters.tsx       # Search/filter controls
    └── history-detail-modal.tsx  # Full image view
```

---

## Data Model

Uses the `generations` and `favorites` tables from 00-foundation-database.md.

```typescript
interface Generation {
  id: string;
  prompt_json: Record<string, unknown>;
  image_path: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error_message: string | null;
  api_response_text: string | null;
  created_at: string;
  completed_at: string | null;
}

interface GenerationWithFavorite extends Generation {
  is_favorite: boolean;
}
```

---

## Repository Extensions

```typescript
// lib/repositories/generations.ts (additions)

// Get generation with favorite status
export function getGenerationWithFavorite(id: string): GenerationWithFavorite | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT g.*,
           CASE WHEN f.generation_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
    FROM generations g
    LEFT JOIN favorites f ON g.id = f.generation_id
    WHERE g.id = ?
  `).get(id) as (RawGeneration & { is_favorite: number }) | undefined;

  if (!row) return null;

  return {
    ...parseGeneration(row),
    is_favorite: row.is_favorite === 1,
  };
}

// List with favorites
export function listGenerationsWithFavorites(
  options: ListGenerationsOptions = {}
): PaginatedResult<GenerationWithFavorite> {
  const db = getDb();
  let whereClause = 'g.status = \'completed\'';  // Only show completed
  const params: unknown[] = [];

  if (options.favoritesOnly) {
    whereClause += ' AND f.generation_id IS NOT NULL';
  }

  if (options.search) {
    whereClause += ' AND g.prompt_json LIKE ?';
    params.push(`%${options.search}%`);
  }

  const query = `
    SELECT g.*,
           CASE WHEN f.generation_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
    FROM generations g
    LEFT JOIN favorites f ON g.id = f.generation_id
    WHERE ${whereClause}
    ORDER BY g.created_at DESC
  `;

  const countQuery = `
    SELECT COUNT(*) as count
    FROM generations g
    LEFT JOIN favorites f ON g.id = f.generation_id
    WHERE ${whereClause}
  `;

  const result = paginate<RawGeneration & { is_favorite: number }>(
    query,
    countQuery,
    params,
    { page: options.page, limit: options.limit || 24 }
  );

  return {
    ...result,
    items: result.items.map((row) => ({
      ...parseGeneration(row),
      is_favorite: row.is_favorite === 1,
    })),
  };
}

// Toggle favorite
export function toggleFavorite(generationId: string): boolean {
  const db = getDb();

  const existing = db.prepare(
    'SELECT 1 FROM favorites WHERE generation_id = ?'
  ).get(generationId);

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE generation_id = ?').run(generationId);
    return false;
  } else {
    db.prepare(
      'INSERT INTO favorites (generation_id, created_at) VALUES (?, ?)'
    ).run(generationId, now());
    return true;
  }
}

// Delete generation (also deletes image file)
export async function deleteGeneration(id: string): Promise<boolean> {
  const db = getDb();
  const generation = getGeneration(id);

  if (!generation) return false;

  // Delete image file if exists
  if (generation.image_path) {
    const filePath = path.join(process.cwd(), 'public', generation.image_path);
    try {
      await unlink(filePath);
    } catch {
      // File may not exist, continue
    }
  }

  // Delete from favorites first (FK constraint)
  db.prepare('DELETE FROM favorites WHERE generation_id = ?').run(id);

  // Delete generation
  const result = db.prepare('DELETE FROM generations WHERE id = ?').run(id);

  return result.changes > 0;
}
```

---

## API Endpoints

### GET /api/history

List generation history with pagination and filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 24) |
| favorites | boolean | Only show favorites |
| search | string | Search in prompt JSON |

**Response (200):**
```typescript
interface HistoryListResponse {
  items: GenerationWithFavorite[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**Implementation:**
```typescript
// app/api/history/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { listGenerationsWithFavorites } from '@/lib/repositories/generations';

export async function GET(request: Request) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);

    const result = listGenerationsWithFavorites({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '24'),
      favoritesOnly: searchParams.get('favorites') === 'true',
      search: searchParams.get('search') || undefined,
    });

    return NextResponse.json(result);
  });
}
```

### GET /api/history/:id

Get single generation details.

**Response (200):**
```typescript
GenerationWithFavorite
```

### DELETE /api/history/:id

Delete a generation and its image.

**Response (200):**
```typescript
{ success: true }
```

### POST /api/history/:id/favorite

Toggle favorite status.

**Response (200):**
```typescript
{ favorited: boolean }
```

**Implementation:**
```typescript
// app/api/history/[id]/favorite/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { toggleFavorite, getGeneration } from '@/lib/repositories/generations';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async () => {
    const generation = getGeneration(params.id);

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    const favorited = toggleFavorite(params.id);

    return NextResponse.json({ favorited });
  });
}
```

---

## React Hooks

```typescript
// lib/hooks/use-history.ts
'use client';

import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import type { GenerationWithFavorite } from '@/lib/types/database';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface HistoryResponse {
  items: GenerationWithFavorite[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useHistory(options: {
  favoritesOnly?: boolean;
  search?: string;
} = {}) {
  const getKey = (pageIndex: number) => {
    const params = new URLSearchParams();
    params.set('page', String(pageIndex + 1));
    params.set('limit', '24');
    if (options.favoritesOnly) params.set('favorites', 'true');
    if (options.search) params.set('search', options.search);
    return `/api/history?${params}`;
  };

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite<HistoryResponse>(
    getKey,
    fetcher
  );

  const items = data?.flatMap((page) => page.items) || [];
  const total = data?.[0]?.total || 0;
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');
  const isEmpty = data?.[0]?.items.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.items.length < 24);

  return {
    items,
    total,
    isLoading,
    isLoadingMore,
    isEmpty,
    isReachingEnd,
    loadMore: () => setSize(size + 1),
    mutate,
    error,
  };
}

// Toggle favorite
export async function toggleFavorite(id: string): Promise<boolean> {
  const res = await fetch(`/api/history/${id}/favorite`, { method: 'POST' });
  const data = await res.json();
  return data.favorited;
}

// Delete generation
export async function deleteGeneration(id: string): Promise<void> {
  const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete');
  }
}
```

---

## UI Components

### History Page

```typescript
// app/(protected)/history/page.tsx
'use client';

import { useState } from 'react';
import { HistoryGrid } from '@/components/history/history-grid';
import { HistoryFilters } from '@/components/history/history-filters';
import { HistoryDetailModal } from '@/components/history/history-detail-modal';
import { useHistory, toggleFavorite, deleteGeneration } from '@/lib/hooks/use-history';
import type { GenerationWithFavorite } from '@/lib/types/database';

export default function HistoryPage() {
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<GenerationWithFavorite | null>(null);

  const { items, total, isLoading, isLoadingMore, isReachingEnd, loadMore, mutate } = useHistory({
    favoritesOnly,
    search,
  });

  async function handleToggleFavorite(id: string) {
    await toggleFavorite(id);
    mutate();
  }

  async function handleDelete(id: string) {
    await deleteGeneration(id);
    mutate();
    setSelectedItem(null);
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">History</h1>
        <span className="text-muted-foreground">{total} generations</span>
      </div>

      <HistoryFilters
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
        search={search}
        onSearchChange={setSearch}
      />

      <HistoryGrid
        items={items}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        isReachingEnd={isReachingEnd}
        onLoadMore={loadMore}
        onSelect={setSelectedItem}
        onToggleFavorite={handleToggleFavorite}
      />

      <HistoryDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDelete}
        onUsePrompt={(prompt) => {
          // Navigate to builder with prompt loaded
        }}
      />
    </div>
  );
}
```

### History Grid

```typescript
// components/history/history-grid.tsx
'use client';

import { useEffect, useRef } from 'react';
import { HistoryCard } from './history-card';
import type { GenerationWithFavorite } from '@/lib/types/database';

interface HistoryGridProps {
  items: GenerationWithFavorite[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isReachingEnd: boolean;
  onLoadMore: () => void;
  onSelect: (item: GenerationWithFavorite) => void;
  onToggleFavorite: (id: string) => void;
}

export function HistoryGrid({
  items,
  isLoading,
  isLoadingMore,
  isReachingEnd,
  onLoadMore,
  onSelect,
  onToggleFavorite,
}: HistoryGridProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isReachingEnd) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMore, isReachingEnd, onLoadMore]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No generations found. Create your first image to see it here.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <HistoryCard
            key={item.id}
            item={item}
            onClick={() => onSelect(item)}
            onToggleFavorite={() => onToggleFavorite(item.id)}
          />
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-10 mt-8">
        {isLoadingMore && (
          <div className="flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </>
  );
}
```

### History Card

```typescript
// components/history/history-card.tsx
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import type { GenerationWithFavorite } from '@/lib/types/database';

interface HistoryCardProps {
  item: GenerationWithFavorite;
  onClick: () => void;
  onToggleFavorite: () => void;
}

export function HistoryCard({ item, onClick, onToggleFavorite }: HistoryCardProps) {
  return (
    <div
      className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer bg-muted"
      onClick={onClick}
    >
      {item.image_path && (
        <Image
          src={item.image_path}
          alt=""
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Favorite button */}
      <Button
        variant="ghost"
        size="icon"
        className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${
          item.is_favorite ? 'opacity-100' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
      >
        <Star
          className={`w-5 h-5 ${
            item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'
          }`}
        />
      </Button>

      {/* Date */}
      <div className="absolute bottom-2 left-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
        {new Date(item.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
```

### History Filters

```typescript
// components/history/history-filters.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

interface HistoryFiltersProps {
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (value: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function HistoryFilters({
  favoritesOnly,
  onFavoritesOnlyChange,
  search,
  onSearchChange,
}: HistoryFiltersProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Input
        placeholder="Search prompts..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs"
      />

      <Button
        variant={favoritesOnly ? 'default' : 'outline'}
        onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
      >
        <Star className={`w-4 h-4 mr-2 ${favoritesOnly ? 'fill-current' : ''}`} />
        Favorites
      </Button>
    </div>
  );
}
```

### History Detail Modal

```typescript
// components/history/history-detail-modal.tsx
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Star, Download, Trash2, Copy } from 'lucide-react';
import type { GenerationWithFavorite } from '@/lib/types/database';

interface HistoryDetailModalProps {
  item: GenerationWithFavorite | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onUsePrompt: (prompt: Record<string, unknown>) => void;
}

export function HistoryDetailModal({
  item,
  onClose,
  onToggleFavorite,
  onDelete,
  onUsePrompt,
}: HistoryDetailModalProps) {
  if (!item) return null;

  return (
    <AlertDialog open={!!item} onOpenChange={() => onClose()}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center justify-between">
            <span>{new Date(item.created_at).toLocaleString()}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite(item.id)}
              >
                <Star
                  className={`w-5 h-5 ${
                    item.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''
                  }`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm('Delete this generation?')) {
                    onDelete(item.id);
                  }
                }}
              >
                <Trash2 className="w-5 h-5 text-destructive" />
              </Button>
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex gap-4 overflow-hidden">
          {/* Image */}
          <div className="w-1/2 relative aspect-[3/4]">
            {item.image_path && (
              <Image
                src={item.image_path}
                alt=""
                fill
                className="object-contain"
              />
            )}
          </div>

          {/* Prompt */}
          <div className="w-1/2 flex flex-col">
            <Textarea
              value={JSON.stringify(item.prompt_json, null, 2)}
              readOnly
              className="flex-1 font-mono text-xs"
            />

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => onUsePrompt(item.prompt_json)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Use Prompt
              </Button>
              {item.image_path && (
                <Button variant="outline" asChild>
                  <a href={item.image_path} download>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Implementation Checklist

- [ ] Install lucide-react (if not already): icons are used
- [ ] Extend `lib/repositories/generations.ts` with favorite functions
- [ ] Create `app/api/history/route.ts`
- [ ] Create `app/api/history/[id]/route.ts`
- [ ] Create `app/api/history/[id]/favorite/route.ts`
- [ ] Create `lib/hooks/use-history.ts`
- [ ] Create `app/(protected)/history/page.tsx`
- [ ] Create `components/history/history-grid.tsx`
- [ ] Create `components/history/history-card.tsx`
- [ ] Create `components/history/history-filters.tsx`
- [ ] Create `components/history/history-detail-modal.tsx`
- [ ] Add navigation link to history page
- [ ] Test infinite scroll
- [ ] Test favorites toggle
- [ ] Test search
- [ ] Test delete with confirmation
- [ ] Test "Use Prompt" navigation to builder

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No completed generations | Show empty state |
| Image file deleted | Show placeholder |
| Very long prompt | Scrollable JSON view |
| Delete favorited item | Remove from favorites first |
| Search with no results | Show "No matches" message |
| Concurrent favorite toggles | Last write wins |
