# Foundation: Database & Schema

## Overview

This spec covers the SQLite database setup using better-sqlite3, schema definition, and seed data. This is the foundation layer that all other features depend on.

**Dependencies:** None (this is the base layer)

**Dependents:** All other specs

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Database | SQLite |
| Driver | better-sqlite3 |
| Location | `data/prompt-builder.db` |

---

## Directory Structure

```
lib/
├── db.ts                 # Database connection & helpers
├── schema.ts             # Schema definitions (for reference)
└── migrations/
    └── 001-initial.sql   # Initial schema migration

data/
└── prompt-builder.db     # SQLite database file (gitignored)
```

---

## Database Connection (`lib/db.ts`)

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'prompt-builder.db');

// Singleton connection
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// Helper for transactions
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  return db.transaction(fn)();
}

// Helper for generating UUIDs
export function generateId(): string {
  return crypto.randomUUID();
}
```

---

## Schema

### Categories Table

Stores component category definitions.

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique identifier (slug format) |
| name | TEXT | NOT NULL | Display name |
| description | TEXT | - | Category description |
| sort_order | INTEGER | DEFAULT 0 | Order in UI |

### Components Table

Stores component presets (characters, wardrobes, poses, etc.).

```sql
CREATE TABLE components (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  data JSON NOT NULL,
  thumbnail_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_components_category ON components(category_id);
CREATE INDEX idx_components_updated ON components(updated_at DESC);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| category_id | TEXT | FK → categories | Parent category |
| name | TEXT | NOT NULL | Display name |
| description | TEXT | - | Brief description |
| data | JSON | NOT NULL | Component's JSON content |
| thumbnail_path | TEXT | - | Path to auto-generated thumbnail |
| created_at | DATETIME | DEFAULT NOW | Creation timestamp |
| updated_at | DATETIME | DEFAULT NOW | Last update timestamp |

### Saved Prompts Table

Stores complete composed prompts in the shared library.

```sql
CREATE TABLE saved_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt_json JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_prompts_updated ON saved_prompts(updated_at DESC);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| name | TEXT | NOT NULL | Prompt name |
| description | TEXT | - | Optional description |
| prompt_json | JSON | NOT NULL | Complete composed prompt |
| created_at | DATETIME | DEFAULT NOW | Creation timestamp |
| updated_at | DATETIME | DEFAULT NOW | Last update timestamp |

### Generations Table

Stores generation history.

```sql
CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  prompt_json JSON NOT NULL,
  image_path TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  api_response_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE INDEX idx_generations_status ON generations(status);
CREATE INDEX idx_generations_created ON generations(created_at DESC);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| prompt_json | JSON | NOT NULL | Prompt used for generation |
| image_path | TEXT | - | Path to saved image |
| status | TEXT | NOT NULL, CHECK | pending/generating/completed/failed |
| error_message | TEXT | - | Error details if failed |
| api_response_text | TEXT | - | API response for debugging |
| created_at | DATETIME | DEFAULT NOW | Request timestamp |
| completed_at | DATETIME | - | Completion timestamp |

### Favorites Table

Tracks favorited generations.

```sql
CREATE TABLE favorites (
  generation_id TEXT PRIMARY KEY REFERENCES generations(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Generation Queue Table

Manages the generation queue.

```sql
CREATE TABLE generation_queue (
  id TEXT PRIMARY KEY,
  prompt_json JSON NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued', 'processing', 'completed', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME
);

CREATE INDEX idx_queue_status ON generation_queue(status, created_at);
```

### Session State Table

Persists builder state across sessions.

```sql
CREATE TABLE session_state (
  id TEXT PRIMARY KEY DEFAULT 'current',
  builder_state JSON,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Usage Stats Table

Tracks usage analytics.

```sql
CREATE TABLE usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  component_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_stats_type ON usage_stats(event_type, created_at);
CREATE INDEX idx_usage_stats_component ON usage_stats(component_id);
```

---

## Seed Data

### Categories

```typescript
const SEED_CATEGORIES = [
  { id: 'characters', name: 'Characters', description: 'Complete character presets (subject section)', sort_order: 0 },
  { id: 'physical_traits', name: 'Physical Traits', description: 'Hair, skin, body type, ethnicity', sort_order: 1 },
  { id: 'jewelry', name: 'Jewelry', description: 'Accessories, metals, chains, earrings', sort_order: 2 },
  { id: 'wardrobe', name: 'Wardrobe', description: 'Complete outfit (top + bottom + footwear)', sort_order: 3 },
  { id: 'wardrobe_tops', name: 'Tops', description: 'Upper body garments', sort_order: 4 },
  { id: 'wardrobe_bottoms', name: 'Bottoms', description: 'Lower body garments', sort_order: 5 },
  { id: 'wardrobe_footwear', name: 'Footwear', description: 'Shoes, boots, barefoot', sort_order: 6 },
  { id: 'poses', name: 'Poses', description: 'Body position, hands, framing', sort_order: 7 },
  { id: 'scenes', name: 'Scenes', description: 'Overall scene description', sort_order: 8 },
  { id: 'backgrounds', name: 'Backgrounds', description: 'Environment and props', sort_order: 9 },
  { id: 'camera', name: 'Camera/Look', description: 'Device, flash, texture, color settings', sort_order: 10 },
  { id: 'ban_lists', name: 'Ban Lists', description: 'Items to exclude from generation', sort_order: 11 },
];
```

---

## TypeScript Types

```typescript
// lib/types/database.ts

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface Component {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  data: Record<string, unknown>;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedPrompt {
  id: string;
  name: string;
  description: string | null;
  prompt_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface Generation {
  id: string;
  prompt_json: Record<string, unknown>;
  image_path: string | null;
  status: GenerationStatus;
  error_message: string | null;
  api_response_text: string | null;
  created_at: string;
  completed_at: string | null;
}

export type QueueStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface QueueItem {
  id: string;
  prompt_json: Record<string, unknown>;
  status: QueueStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface SessionState {
  id: string;
  builder_state: Record<string, unknown> | null;
  updated_at: string;
}

export interface UsageStat {
  id: number;
  event_type: string;
  component_id: string | null;
  created_at: string;
}
```

---

## Database Helpers

```typescript
// lib/db-helpers.ts

import { getDb, generateId } from './db';

// JSON parsing helper (better-sqlite3 returns JSON as strings)
export function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  return JSON.parse(value) as T;
}

// Timestamp helpers
export function now(): string {
  return new Date().toISOString();
}

// Pagination helper
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  query: string,
  countQuery: string,
  params: unknown[],
  options: PaginationOptions
): PaginatedResult<T> {
  const db = getDb();
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  const total = (db.prepare(countQuery).get(...params) as { count: number }).count;
  const items = db.prepare(`${query} LIMIT ? OFFSET ?`).all(...params, limit, offset) as T[];

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

---

## Migration System

```typescript
// lib/migrations/index.ts

import { getDb } from '../db';
import fs from 'fs';
import path from 'path';

export function runMigrations() {
  const db = getDb();

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get applied migrations
  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as { name: string }[])
      .map(r => r.name)
  );

  // Get migration files
  const migrationsDir = path.join(process.cwd(), 'lib', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Apply pending migrations
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    })();

    console.log(`Applied migration: ${file}`);
  }
}
```

---

## Implementation Checklist

- [ ] Install better-sqlite3: `bun add better-sqlite3 @types/better-sqlite3`
- [ ] Create `data/` directory (add to .gitignore)
- [ ] Create `lib/db.ts` with connection singleton
- [ ] Create `lib/types/database.ts` with TypeScript types
- [ ] Create `lib/db-helpers.ts` with utility functions
- [ ] Create `lib/migrations/index.ts` with migration runner
- [ ] Create `lib/migrations/001-initial.sql` with full schema
- [ ] Create `lib/seed.ts` with category seed data
- [ ] Add npm script: `"db:migrate": "bun run lib/migrations/index.ts"`
- [ ] Add npm script: `"db:seed": "bun run lib/seed.ts"`
- [ ] Test database creation and migrations
- [ ] Verify foreign key constraints work

---

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| SQLITE_CANTOPEN | Database file path doesn't exist | Create `data/` directory |
| SQLITE_CONSTRAINT_FOREIGNKEY | FK violation | Check category_id exists |
| SQLITE_CONSTRAINT_CHECK | Invalid status value | Use allowed enum values |
| SQLITE_BUSY | Database locked | Ensure single connection or use WAL mode |

---

## Notes

- WAL mode enables concurrent reads during writes
- Foreign keys must be explicitly enabled per connection
- JSON columns store stringified JSON; parse on read
- UUIDs generated via `crypto.randomUUID()` (Node 19+)
- Timestamps stored as ISO 8601 strings
