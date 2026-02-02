# Generation System

## Overview

Queue-based image generation using Google Gemini API. Handles request queuing, API communication, image storage, and status tracking.

**Dependencies:** 00-foundation-database.md, 01-authentication.md, 03-prompt-builder-ui.md

**Dependents:** 06-history-gallery.md

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| AI Provider | Google Gemini API |
| SDK | @google/genai |
| Queue | SQLite-backed FIFO |
| Images | Stored in public/images/ |

---

## Environment Variables

```env
GEMINI_API_KEY=<api-key>
GEMINI_MODEL=gemini-3-pro-image-preview
```

---

## Directory Structure

```
app/
└── api/
    └── generate/
        ├── route.ts              # POST (submit), GET (queue status)
        └── [id]/
            └── status/
                └── route.ts      # GET (poll status)

lib/
├── gemini.ts                     # Gemini API client
├── queue.ts                      # Queue management
└── repositories/
    └── generations.ts            # Generation history DB ops

public/
└── images/                       # Generated images
    └── {uuid}.{ext}
```

---

## Gemini API Client (`lib/gemini.ts`)

```typescript
import { GoogleGenerativeAI } from '@google/genai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GenerationOptions {
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  numberOfImages?: number;
  safetySettings?: 'block_none' | 'block_few' | 'block_some' | 'block_most';
  useGoogleSearch?: boolean;
}

export interface GenerationResult {
  success: boolean;
  images?: Buffer[];
  mimeType?: string;
  textResponse?: string;
  error?: string;
}

export async function generateImage(
  prompt: Record<string, unknown>,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview',
    });

    // Build generation config
    const generationConfig: Record<string, unknown> = {
      responseModalities: ['image', 'text'],
    };

    if (options.aspectRatio) {
      generationConfig.aspectRatio = options.aspectRatio;
    }

    if (options.numberOfImages) {
      generationConfig.numberOfImages = options.numberOfImages;
    }

    // Format prompt as string
    const promptText = formatPromptForGemini(prompt);

    // Generate
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig,
    });

    const response = result.response;
    const images: Buffer[] = [];
    let mimeType = 'image/png';
    let textResponse = '';

    // Extract images and text from response
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          images.push(Buffer.from(part.inlineData.data, 'base64'));
          mimeType = part.inlineData.mimeType || mimeType;
        }
        if (part.text) {
          textResponse += part.text;
        }
      }
    }

    if (images.length === 0) {
      return {
        success: false,
        textResponse,
        error: 'No images generated. API response: ' + textResponse,
      };
    }

    return {
      success: true,
      images,
      mimeType,
      textResponse,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
    };
  }
}

function formatPromptForGemini(prompt: Record<string, unknown>): string {
  // Convert JSON prompt to Gemini-friendly format
  // This may need customization based on how prompts are structured
  return JSON.stringify(prompt, null, 2);
}
```

---

## Queue Management (`lib/queue.ts`)

```typescript
import { getDb, generateId, transaction } from './db';
import { now } from './db-helpers';
import type { QueueItem, QueueStatus } from './types/database';

const MAX_CONCURRENT = 5;

interface RawQueueItem {
  id: string;
  prompt_json: string;
  status: QueueStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

function parseQueueItem(row: RawQueueItem): QueueItem {
  return {
    ...row,
    prompt_json: JSON.parse(row.prompt_json),
  };
}

// Add to queue
export function enqueue(promptJson: Record<string, unknown>): QueueItem {
  const db = getDb();
  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO generation_queue (id, prompt_json, status, created_at)
    VALUES (?, ?, 'queued', ?)
  `).run(id, JSON.stringify(promptJson), timestamp);

  return getQueueItem(id)!;
}

// Get queue item
export function getQueueItem(id: string): QueueItem | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM generation_queue WHERE id = ?').get(id) as RawQueueItem | undefined;
  return row ? parseQueueItem(row) : null;
}

// Get queue status
export interface QueueStatus {
  active: number;
  queued: number;
  position: number | null;  // Position of a specific item, if provided
}

export function getQueueStatus(itemId?: string): QueueStatus {
  const db = getDb();

  const active = (db.prepare(`
    SELECT COUNT(*) as count FROM generation_queue WHERE status = 'processing'
  `).get() as { count: number }).count;

  const queued = (db.prepare(`
    SELECT COUNT(*) as count FROM generation_queue WHERE status = 'queued'
  `).get() as { count: number }).count;

  let position: number | null = null;
  if (itemId) {
    const item = getQueueItem(itemId);
    if (item && item.status === 'queued') {
      position = (db.prepare(`
        SELECT COUNT(*) as count FROM generation_queue
        WHERE status = 'queued' AND created_at <= ?
      `).get(item.created_at) as { count: number }).count;
    } else if (item && item.status === 'processing') {
      position = 0;  // Currently processing
    }
  }

  return { active, queued, position };
}

// Get next item to process
export function getNextInQueue(): QueueItem | null {
  const db = getDb();

  // Check if we can process more
  const { active } = getQueueStatus();
  if (active >= MAX_CONCURRENT) {
    return null;
  }

  // Get oldest queued item
  const row = db.prepare(`
    SELECT * FROM generation_queue
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
  `).get() as RawQueueItem | undefined;

  return row ? parseQueueItem(row) : null;
}

// Update queue item status
export function updateQueueStatus(
  id: string,
  status: QueueStatus,
  options?: { startedAt?: boolean; completedAt?: boolean }
): void {
  const db = getDb();
  const updates: string[] = ['status = ?'];
  const values: unknown[] = [status];

  if (options?.startedAt) {
    updates.push('started_at = ?');
    values.push(now());
  }

  if (options?.completedAt) {
    updates.push('completed_at = ?');
    values.push(now());
  }

  values.push(id);

  db.prepare(`UPDATE generation_queue SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

// Clean up old completed items (keep last 100)
export function cleanupQueue(): void {
  const db = getDb();

  db.prepare(`
    DELETE FROM generation_queue
    WHERE status IN ('completed', 'failed')
    AND id NOT IN (
      SELECT id FROM generation_queue
      WHERE status IN ('completed', 'failed')
      ORDER BY completed_at DESC
      LIMIT 100
    )
  `).run();
}
```

---

## Generation Repository (`lib/repositories/generations.ts`)

```typescript
import { getDb, generateId } from '../db';
import { now, paginate, type PaginatedResult } from '../db-helpers';
import type { Generation, GenerationStatus } from '../types/database';

interface RawGeneration {
  id: string;
  prompt_json: string;
  image_path: string | null;
  status: GenerationStatus;
  error_message: string | null;
  api_response_text: string | null;
  created_at: string;
  completed_at: string | null;
}

function parseGeneration(row: RawGeneration): Generation {
  return {
    ...row,
    prompt_json: JSON.parse(row.prompt_json),
  };
}

// Create generation record
export function createGeneration(promptJson: Record<string, unknown>): Generation {
  const db = getDb();
  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO generations (id, prompt_json, status, created_at)
    VALUES (?, ?, 'pending', ?)
  `).run(id, JSON.stringify(promptJson), timestamp);

  return getGeneration(id)!;
}

// Get generation
export function getGeneration(id: string): Generation | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM generations WHERE id = ?').get(id) as RawGeneration | undefined;
  return row ? parseGeneration(row) : null;
}

// Update generation
export interface UpdateGenerationInput {
  status?: GenerationStatus;
  image_path?: string;
  error_message?: string;
  api_response_text?: string;
  completed_at?: boolean;
}

export function updateGeneration(id: string, input: UpdateGenerationInput): Generation | null {
  const db = getDb();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }
  if (input.image_path !== undefined) {
    updates.push('image_path = ?');
    values.push(input.image_path);
  }
  if (input.error_message !== undefined) {
    updates.push('error_message = ?');
    values.push(input.error_message);
  }
  if (input.api_response_text !== undefined) {
    updates.push('api_response_text = ?');
    values.push(input.api_response_text);
  }
  if (input.completed_at) {
    updates.push('completed_at = ?');
    values.push(now());
  }

  if (updates.length === 0) return getGeneration(id);

  values.push(id);
  db.prepare(`UPDATE generations SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getGeneration(id);
}

// List generations with pagination
export interface ListGenerationsOptions {
  page?: number;
  limit?: number;
  favoritesOnly?: boolean;
  search?: string;
}

export function listGenerations(options: ListGenerationsOptions = {}): PaginatedResult<Generation> {
  const db = getDb();
  let whereClause = '1=1';
  const params: unknown[] = [];

  if (options.favoritesOnly) {
    whereClause += ' AND g.id IN (SELECT generation_id FROM favorites)';
  }

  if (options.search) {
    whereClause += ' AND g.prompt_json LIKE ?';
    params.push(`%${options.search}%`);
  }

  const query = `
    SELECT g.* FROM generations g
    WHERE ${whereClause}
    ORDER BY g.created_at DESC
  `;

  const countQuery = `
    SELECT COUNT(*) as count FROM generations g
    WHERE ${whereClause}
  `;

  const result = paginate<RawGeneration>(query, countQuery, params, {
    page: options.page,
    limit: options.limit,
  });

  return {
    ...result,
    items: result.items.map(parseGeneration),
  };
}
```

---

## API Endpoints

### POST /api/generate

Submit a generation request.

**Request:**
```typescript
interface GenerateRequest {
  prompt_json: Record<string, unknown>;
  options?: {
    aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
    resolution?: '1080p' | '4K';
    count?: 1 | 2 | 3 | 4;
    safetyOverride?: boolean;
    googleSearch?: boolean;
  };
}
```

**Response (202 Accepted):**
```typescript
interface GenerateResponse {
  queue_id: string;
  generation_id: string;
  position: number;
  status: 'queued' | 'processing';
}
```

**Implementation:**
```typescript
// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { enqueue, getQueueStatus } from '@/lib/queue';
import { createGeneration } from '@/lib/repositories/generations';
import { processQueue } from '@/lib/generation-processor';

export async function POST(request: Request) {
  return withAuth(async () => {
    const body = await request.json();

    if (!body.prompt_json || typeof body.prompt_json !== 'object') {
      return NextResponse.json(
        { error: 'prompt_json is required' },
        { status: 400 }
      );
    }

    // Create generation record
    const generation = createGeneration(body.prompt_json);

    // Add to queue
    const queueItem = enqueue(body.prompt_json);

    // Store link between queue item and generation
    // (Could add queue_item_id to generations table)

    // Get queue position
    const { position } = getQueueStatus(queueItem.id);

    // Trigger queue processing (non-blocking)
    processQueue().catch(console.error);

    return NextResponse.json({
      queue_id: queueItem.id,
      generation_id: generation.id,
      position: position || 1,
      status: queueItem.status,
    }, { status: 202 });
  });
}

export async function GET(request: Request) {
  return withAuth(async () => {
    const status = getQueueStatus();
    return NextResponse.json(status);
  });
}
```

### GET /api/generate/:id/status

Poll generation status.

**Response (200):**
```typescript
interface GenerationStatusResponse {
  status: 'pending' | 'generating' | 'completed' | 'failed';
  image_path?: string;
  error?: string;
  queue_position?: number;
}
```

**Implementation:**
```typescript
// app/api/generate/[id]/status/route.ts
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getGeneration } from '@/lib/repositories/generations';
import { getQueueStatus } from '@/lib/queue';

export async function GET(
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

    const response: Record<string, unknown> = {
      status: generation.status,
    };

    if (generation.status === 'completed' && generation.image_path) {
      response.image_path = generation.image_path;
    }

    if (generation.status === 'failed' && generation.error_message) {
      response.error = generation.error_message;
    }

    if (generation.status === 'pending') {
      // Could track queue position if we link queue items to generations
    }

    return NextResponse.json(response);
  });
}
```

---

## Queue Processor (`lib/generation-processor.ts`)

```typescript
import { getNextInQueue, updateQueueStatus } from './queue';
import { createGeneration, updateGeneration } from './repositories/generations';
import { generateImage, type GenerationOptions } from './gemini';
import { saveImage } from './image-storage';

let processing = false;

export async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  try {
    while (true) {
      const item = getNextInQueue();
      if (!item) break;

      // Mark as processing
      updateQueueStatus(item.id, 'processing', { startedAt: true });

      // Create generation record if not exists
      // (In practice, we'd link queue items to generations)

      try {
        // Generate image
        const result = await generateImage(item.prompt_json);

        if (result.success && result.images && result.images.length > 0) {
          // Save first image
          const imagePath = await saveImage(result.images[0], result.mimeType!);

          // Update generation record
          // updateGeneration(generationId, {
          //   status: 'completed',
          //   image_path: imagePath,
          //   api_response_text: result.textResponse,
          //   completed_at: true,
          // });

          updateQueueStatus(item.id, 'completed', { completedAt: true });
        } else {
          // updateGeneration(generationId, {
          //   status: 'failed',
          //   error_message: result.error,
          //   api_response_text: result.textResponse,
          //   completed_at: true,
          // });

          updateQueueStatus(item.id, 'failed', { completedAt: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        // updateGeneration(generationId, {
        //   status: 'failed',
        //   error_message: message,
        //   completed_at: true,
        // });

        updateQueueStatus(item.id, 'failed', { completedAt: true });
      }
    }
  } finally {
    processing = false;
  }
}
```

---

## Image Storage (`lib/image-storage.ts`)

```typescript
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { generateId } from './db';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

export async function saveImage(buffer: Buffer, mimeType: string): Promise<string> {
  // Ensure directory exists
  await mkdir(IMAGES_DIR, { recursive: true });

  // Determine extension
  const ext = mimeType.split('/')[1] || 'png';

  // Generate unique filename
  const filename = `${generateId()}.${ext}`;
  const filePath = path.join(IMAGES_DIR, filename);

  // Write file
  await writeFile(filePath, buffer);

  // Return public path
  return `/images/${filename}`;
}
```

---

## Client-Side Status Polling

```typescript
// lib/hooks/use-generation.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface GenerationStatus {
  status: 'pending' | 'generating' | 'completed' | 'failed';
  image_path?: string;
  error?: string;
  queue_position?: number;
}

export function useGeneration(generationId: string | null) {
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const poll = useCallback(async () => {
    if (!generationId) return;

    try {
      const res = await fetch(`/api/generate/${generationId}/status`);
      const data = await res.json();
      setStatus(data);

      // Stop polling if terminal state
      if (data.status === 'completed' || data.status === 'failed') {
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
    }
  }, [generationId]);

  useEffect(() => {
    if (!generationId || !isPolling) return;

    // Initial poll
    poll();

    // Poll every 2 seconds
    const interval = setInterval(poll, 2000);

    return () => clearInterval(interval);
  }, [generationId, isPolling, poll]);

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  return { status, isPolling, startPolling };
}

// Submit generation
export async function submitGeneration(
  promptJson: Record<string, unknown>,
  options?: {
    aspectRatio?: string;
    count?: number;
  }
): Promise<{ queue_id: string; generation_id: string; position: number }> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt_json: promptJson, options }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Generation failed');
  }

  return res.json();
}
```

---

## Image Preview Component

```typescript
// components/builder/image-preview.tsx
'use client';

import { useBuilderStore } from '@/lib/stores/builder-store';
import { useGeneration } from '@/lib/hooks/use-generation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export function ImagePreview() {
  const lastGeneratedImage = useBuilderStore((s) => s.lastGeneratedImage);
  const generationStatus = useBuilderStore((s) => s.generationStatus);
  const generationError = useBuilderStore((s) => s.generationError);
  const queuePosition = useBuilderStore((s) => s.queuePosition);

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      {generationStatus === 'idle' && !lastGeneratedImage && (
        <p className="text-muted-foreground">
          Generate an image to see it here
        </p>
      )}

      {generationStatus === 'queued' && (
        <div className="text-center">
          <div className="animate-pulse mb-2">Queued</div>
          {queuePosition && (
            <p className="text-sm text-muted-foreground">
              Position {queuePosition} in queue
            </p>
          )}
        </div>
      )}

      {generationStatus === 'generating' && (
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-2" />
          <p>Generating image...</p>
        </div>
      )}

      {generationStatus === 'failed' && (
        <div className="text-center text-destructive">
          <p className="font-medium">Generation failed</p>
          {generationError && (
            <p className="text-sm mt-1">{generationError}</p>
          )}
        </div>
      )}

      {generationStatus === 'completed' && lastGeneratedImage && (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 relative">
            <Image
              src={lastGeneratedImage}
              alt="Generated image"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" asChild>
              <a href={lastGeneratedImage} download>
                Download
              </a>
            </Button>
            <Button variant="outline">
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] Install Gemini SDK: `bun add @google/genai`
- [ ] Add GEMINI_API_KEY to .env.local
- [ ] Add GEMINI_MODEL to .env.local
- [ ] Create `public/images/` directory (add `.gitkeep`)
- [ ] Create `lib/gemini.ts`
- [ ] Create `lib/queue.ts`
- [ ] Create `lib/generation-processor.ts`
- [ ] Create `lib/image-storage.ts`
- [ ] Create `lib/repositories/generations.ts`
- [ ] Create `app/api/generate/route.ts`
- [ ] Create `app/api/generate/[id]/status/route.ts`
- [ ] Create `lib/hooks/use-generation.ts`
- [ ] Update `components/builder/image-preview.tsx`
- [ ] Connect builder toolbar Generate button
- [ ] Test queue with multiple concurrent requests
- [ ] Test error handling (invalid prompts, API failures)
- [ ] Test image download

---

## Error Handling

| Error | Cause | User Message |
|-------|-------|--------------|
| PERMISSION_DENIED | Invalid API key | "API configuration error. Contact admin." |
| RESOURCE_EXHAUSTED | Rate limited | "Too many requests. Please wait." |
| INVALID_ARGUMENT | Bad prompt | "Invalid prompt format." |
| INTERNAL | API error | "Generation failed. Try again." |
| Network timeout | Connection issue | "Connection timeout. Retrying..." |

---

## Queue Behavior

| Scenario | Behavior |
|----------|----------|
| Queue full (5 active) | New requests wait in queue |
| User submits while queued | Gets new position |
| Server restart | Queue persists, processing resumes |
| Generation fails | Marked failed, slot freed |
| Duplicate prompt | Allowed (no deduplication) |
