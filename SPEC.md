# Prompt Builder - Technical Specification

## Overview

Prompt Builder is a web application for composing and generating images using the Google Gemini API. It provides a visual interface for building structured JSON prompts by selecting and combining component presets (characters, wardrobes, poses, scenes, etc.), with real-time preview and direct generation capabilities.

### Goals
- Enable rapid prompt composition through visual component selection
- Maintain a shared library of reusable presets for team collaboration
- Provide full CRUD capabilities for component management
- Support image-to-prompt analysis for creating presets from reference images
- Track generation history with search/filter capabilities

### Non-Goals
- Image editing or post-processing (beyond regeneration)
- Multi-user accounts (single shared password auth)
- Cloud deployment (local development only for now)

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Database | SQLite via better-sqlite3 |
| Styling | Tailwind CSS + shadcn/ui |
| API | Google Gemini API (@google/genai) |
| Theme | Dark mode default |

### Environment Variables
```env
GEMINI_API_KEY=<api-key>
GEMINI_MODEL=gemini-3-pro-image-preview
GEMINI_ANALYSIS_MODEL=gemini-3-pro-preview
APP_PASSWORD=<shared-password>
```

---

## Architecture

### Directory Structure
```
/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── generate/
│   │   ├── analyze/
│   │   ├── components/
│   │   ├── prompts/
│   │   ├── history/
│   │   └── stats/
│   ├── (protected)/
│   │   ├── builder/
│   │   ├── history/
│   │   ├── library/
│   │   └── analyze/
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── ui/                 # shadcn components
│   ├── builder/
│   ├── library/
│   └── shared/
├── lib/
│   ├── db.ts
│   ├── gemini.ts
│   ├── queue.ts
│   └── parser.ts          # hi.md parser
├── data/
│   └── prompt-builder.db
└── public/
    └── images/            # Generated images
```

---

## Data Model

### Database Schema

```sql
-- Component categories
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Component presets (characters, wardrobes, poses, etc.)
CREATE TABLE components (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  data JSON NOT NULL,           -- The component's JSON content
  thumbnail_path TEXT,          -- Path to auto-generated thumbnail
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Saved complete prompts (shared library)
CREATE TABLE saved_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt_json JSON NOT NULL,    -- Complete composed prompt
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generation history
CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  prompt_json JSON NOT NULL,
  image_path TEXT,              -- Path to saved image
  status TEXT NOT NULL,         -- pending, generating, completed, failed
  error_message TEXT,
  api_response_text TEXT,       -- Logged text from API for debugging
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Favorites (for history)
CREATE TABLE favorites (
  generation_id TEXT PRIMARY KEY REFERENCES generations(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generation queue
CREATE TABLE generation_queue (
  id TEXT PRIMARY KEY,
  prompt_json JSON NOT NULL,
  status TEXT NOT NULL,         -- queued, processing, completed, failed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME
);

-- User session state (for remembering last state)
CREATE TABLE session_state (
  id TEXT PRIMARY KEY DEFAULT 'current',
  builder_state JSON,           -- Current prompt builder configuration
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics/stats
CREATE TABLE usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,     -- generation, component_use, etc.
  component_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Component Categories

The following categories are pre-seeded:

| ID | Name | Description |
|----|------|-------------|
| `characters` | Characters | Complete character presets (subject section) |
| `physical_traits` | Physical Traits | Hair, skin, body type, ethnicity |
| `jewelry` | Jewelry | Accessories, metals, chains, earrings |
| `wardrobe` | Wardrobe | Complete outfit (top + bottom + footwear) |
| `wardrobe_tops` | Tops | Upper body garments |
| `wardrobe_bottoms` | Bottoms | Lower body garments |
| `wardrobe_footwear` | Footwear | Shoes, boots, barefoot |
| `poses` | Poses | Body position, hands, framing |
| `scenes` | Scenes | Overall scene description |
| `backgrounds` | Backgrounds | Environment and props |
| `camera` | Camera/Look | Device, flash, texture, color settings |
| `ban_lists` | Ban Lists | Items to exclude from generation |

---

## UI/UX Specification

### Layout

The main builder uses a three-panel layout:

```
┌──────────────────────────────────────────────────────────────────┐
│  Toolbar: [Generate] [Save Prompt] [Clear] │ Queue: 2/5 │ ⌘Enter │
├────────┬─────────────────────────────────────────────────────────┤
│        │                                                          │
│  Tabs  │          Component Selection Area                       │
│        │          (Cards/lists for current category)              │
│ Char   │                                                          │
│ Traits │                                                          │
│ Jewelry│                                                          │
│ Outfit │                                                          │
│ Pose   │                                                          │
│ Scene  │                                                          │
│ Bkgnd  │                                                          │
│ Camera ├──────────────────────────────────────────────────────────┤
│ Bans   │   JSON Preview | Generated Image                        │
│ ────── │   ┌─────────────────────────────────────────────┐        │
│ Analyze│   │ {                                           │        │
│        │   │   "scene": "...",                           │        │
│        │   │   "subject": { ... },                       │ ◄──────┤
│        │   │   ...                                       │ Resize │
│        │   │ }                                           │        │
│        │   └─────────────────────────────────────────────┘        │
│        │   [Edit JSON directly] or [View Generated Image]         │
└────────┴──────────────────────────────────────────────────────────┘
```

### Key UI Elements

#### Sidebar Tabs (Left)
- Vertical tabs for each component category
- "Analyze" tab at bottom for image-to-prompt feature
- Visual indicator when a category has selections

#### Component Selection Area (Top Right)
- Shows components for the selected category
- Card layout with:
  - Thumbnail (auto-generated)
  - Name
  - Brief description
  - Quick-edit button
  - Select/deselect toggle
- Search/filter within category
- "Add New" button for creating components inline

#### JSON Preview Panel (Bottom Right)
- Resizable divider between selection area and preview
- Tabbed interface: "JSON Preview" | "Generated Image"
- JSON is editable (CodeMirror or Monaco editor)
- Syntax highlighting
- Inline conflict warnings (highlighted fields with tooltip explanations)

#### Generated Image Tab
- Shows generated image after completion
- Status messages during generation:
  - "Queued (position 3 of 5)"
  - "Connecting to Gemini API..."
  - "Generating image..."
  - "Processing response..."
- "Regenerate" button to re-run with same prompt
- "Download" button

#### Toolbar
- **Generate** button (primary action)
- **Save Prompt** button (saves to shared library)
- **Clear** button (reset builder)
- Queue status indicator
- Settings dropdown:
  - Aspect ratio selector (default 3:4)
  - Resolution selector (default 4K)
  - Image count (1-4, default 1)
  - Safety setting override
  - Google Search toggle (optional for generation)

### Responsive Design
- Fully responsive, works on mobile
- Mobile: Stacked layout (tabs collapse to dropdown)
- Tablet: Side-by-side with smaller panels
- Desktop: Full three-panel layout

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + Enter` | Generate image |
| `⌘/Ctrl + S` | Save current prompt |
| `⌘/Ctrl + K` | Open component search |
| `⌘/Ctrl + Z` | Undo last change |
| `⌘/Ctrl + Shift + Z` | Redo |
| `Escape` | Close modals/deselect |

---

## Feature Specifications

### 1. Component Management

#### Creating Components
- Click "Add New" in any category
- Form with:
  - Name (required)
  - Description (optional)
  - JSON data editor
- Validates JSON structure before saving

#### Editing Components
- Click edit button on component card
- Inline editing in a modal/drawer
- Changes saved immediately

#### Deleting Components
- Confirmation dialog
- Soft delete (can be restored)

#### Import/Export
- Export: Download all components as JSON file
- Import: Upload JSON file, merge or replace

### 2. Prompt Composition

#### Selection Behavior
- Single selection per category (except where noted)
- Selecting a component merges its data into the prompt
- Character selection can provide defaults for other categories
- Override with specific selections in other categories

#### Conflict Detection
- When selections conflict (e.g., character has "blue hair" but physical trait says "red hair")
- Show inline warning with both values
- User's most recent selection takes precedence
- Warning is informational, doesn't block generation

#### Multi-Subject Support
- "Add Subject" button in Characters tab
- Each subject has its own component selections
- Subjects can share scene/background/camera settings
- Remove subject button on each subject panel

### 3. Image Generation

#### Queue System
- Maximum 5 concurrent generations
- New requests queued if limit reached
- Each user sees only their queue position
- Queue persists across page refreshes

#### Generation Flow
1. User clicks Generate
2. Validate prompt JSON
3. Add to queue
4. When slot available:
   - Update status: "Connecting..."
   - Call Gemini API with streaming
   - Update status: "Generating..."
   - Receive response chunks
   - Save image to `/public/images/{id}.{ext}`
   - Update status: "Complete"
5. Show image in Generated tab
6. Save to history

#### Error Handling
- Show detailed error information:
  - API error message
  - Request/response details
  - Timestamp
- "Retry" button
- Log errors for debugging

### 4. Image Analysis (Image-to-Prompt)

#### Flow
1. User clicks "Analyze" tab
2. Upload image (drag-drop or file picker)
3. Click "Analyze"
4. System calls Gemini with prompt.txt instructions
5. Display extracted JSON
6. "Save as Presets" button:
   - Creates Character preset from subject section
   - Creates Wardrobe preset from wardrobe section
   - Auto-generates names or prompts for custom names

### 5. History & Gallery

#### History View
- Grid of generated images
- Each card shows:
  - Thumbnail
  - Generation date
  - Favorite star toggle
- Click to view full image + prompt used
- Download button

#### Search & Filter
- Text search in prompts
- Filter by:
  - Date range
  - Favorites only
  - Character preset used (if tracked)

### 6. Saved Prompts Library

#### Saving Prompts
- Name the prompt
- Optional description
- Saved with current JSON state

#### Using Saved Prompts
- Browse saved prompts
- Click to load into builder
- Shows preview of JSON

#### Organization
- Flat list with search
- Sort by: name, date created, date modified

### 7. Admin Dashboard

#### Statistics View
- Total generations (all time, today, this week)
- Popular presets (most used)
- Generation success/failure rate
- Queue status

#### Component Library Management
- Browse all components
- Bulk edit/delete
- Import from file (including hi.md parsing)

---

## API Endpoints

### Authentication
```
POST /api/auth/login
  Body: { password: string }
  Response: { success: boolean, token: string }

POST /api/auth/logout
  Response: { success: boolean }
```

### Components
```
GET /api/components
  Query: { category?: string }
  Response: Component[]

GET /api/components/:id
  Response: Component

POST /api/components
  Body: { category_id, name, description?, data }
  Response: Component

PUT /api/components/:id
  Body: { name?, description?, data? }
  Response: Component

DELETE /api/components/:id
  Response: { success: boolean }
```

### Prompts
```
GET /api/prompts
  Response: SavedPrompt[]

GET /api/prompts/:id
  Response: SavedPrompt

POST /api/prompts
  Body: { name, description?, prompt_json }
  Response: SavedPrompt

DELETE /api/prompts/:id
  Response: { success: boolean }
```

### Generation
```
POST /api/generate
  Body: { prompt_json, options: { aspectRatio, resolution, count, safety, googleSearch } }
  Response: { queue_id: string, position: number }

GET /api/generate/:id/status
  Response: { status, image_path?, error? }

GET /api/generate/queue
  Response: { active: number, queued: number, items: QueueItem[] }
```

### Analysis
```
POST /api/analyze
  Body: FormData with image file
  Response: { subject: {...}, wardrobe: {...} }
```

### History
```
GET /api/history
  Query: { search?, favorites?, page?, limit? }
  Response: { items: Generation[], total: number }

POST /api/history/:id/favorite
  Response: { favorited: boolean }

DELETE /api/history/:id
  Response: { success: boolean }
```

### Stats
```
GET /api/stats
  Response: {
    totalGenerations: number,
    todayGenerations: number,
    popularComponents: { id, name, count }[],
    successRate: number
  }
```

### Import
```
POST /api/import
  Body: { content: string, format: 'json' | 'himd' }
  Response: { imported: number, categories: string[] }

GET /api/export
  Response: { components: Component[], prompts: SavedPrompt[] }
```

### Session
```
GET /api/session/state
  Response: { builder_state: object }

PUT /api/session/state
  Body: { builder_state: object }
  Response: { success: boolean }
```

---

## Edge Cases & Error Handling

### Component Conflicts
- When character preset defines hair color and user also selects a physical trait with different hair color
- Resolution: Last selection wins, inline warning shown
- Warning text: "Conflict: Character 'Miku' has 'blue twintail hair' but Physical Trait 'Red Hair' selected. 'Red Hair' will be used."

### API Failures
- Network timeout: Show error, offer retry
- Rate limit: Queue and retry with backoff
- Invalid response: Log full response, show user-friendly error
- Partial response (streaming cut off): Save what was received, show warning

### Large Files
- Uploaded images for analysis: Limit to 10MB
- Generated images: Store at full resolution
- Thumbnails: Generate 200x200 versions for UI

### Concurrent Access
- Multiple users editing same component: Last write wins
- Queue fairness: FIFO ordering

### Empty States
- No components in category: "No presets yet. Create one or import from file."
- No history: "Generate your first image to see it here."
- Empty search results: "No matches found."

---

## Security Considerations

### Authentication
- Single shared password stored hashed in env
- Session token in HTTP-only cookie
- Token expiration: none (persistent)
- CSRF protection via SameSite cookies

### API Key Protection
- Gemini API key only on server-side
- Never exposed to client
- Rate limiting on generation endpoint

### Input Validation
- Sanitize component names/descriptions
- Validate JSON structure before storing
- Limit file upload sizes

### File System
- Generated images stored with UUID names
- No user-controlled paths
- Images served through Next.js static files

---

## Testing Considerations

### Unit Tests
- JSON prompt composition logic
- Conflict detection
- Queue management
- hi.md parser

### Integration Tests
- Component CRUD operations
- Generation flow (mock Gemini API)
- Import/export

### E2E Tests
- Full prompt building workflow
- Authentication flow
- History browsing

---

## Open Questions

None remaining - all requirements clarified through interview.

---

## Implementation Priority

### Phase 1: Core Builder
1. Database setup and schema
2. Authentication (password)
3. Component CRUD API
4. Basic UI layout with shadcn
5. Component selection and JSON preview
6. JSON editing

### Phase 2: Generation
1. Gemini API integration
2. Queue system
3. Generation history
4. Image display and download

### Phase 3: Advanced Features
1. Image analysis (image-to-prompt)
2. Import from hi.md
3. Export/import JSON
4. Search and filtering
5. Favorites

### Phase 4: Polish
1. Admin dashboard with stats
2. Conflict warnings
3. Keyboard shortcuts
4. Session state persistence
5. Thumbnails auto-generation
6. Mobile responsiveness
