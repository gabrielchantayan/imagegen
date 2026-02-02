# Implementation Specs

This directory contains detailed implementation specifications for the Prompt Builder application. Each spec is designed to be self-contained and can be implemented independently by an agent.

## Spec Overview

| # | Spec | Description | Dependencies |
|---|------|-------------|--------------|
| 00 | [Foundation Database](./00-foundation-database.md) | SQLite schema, migrations, db helpers | None |
| 01 | [Authentication](./01-authentication.md) | Login, sessions, route protection | 00 |
| 02 | [Components System](./02-components-system.md) | CRUD for component presets | 00, 01 |
| 03 | [Prompt Builder UI](./03-prompt-builder-ui.md) | Main builder interface | 00, 01, 02 |
| 04 | [Generation System](./04-generation-system.md) | Queue, Gemini API, images | 00, 01, 03 |
| 05 | [Image Analysis](./05-image-analysis.md) | Image-to-prompt feature | 00, 01, 02 |
| 06 | [History Gallery](./06-history-gallery.md) | Browse past generations | 00, 01, 04 |
| 07 | [Saved Prompts](./07-saved-prompts.md) | Prompt library | 00, 01, 03 |
| 08 | [Import/Export](./08-import-export.md) | JSON/hi.md import, export | 00, 01, 02, 07 |
| 09 | [Admin Dashboard](./09-admin-dashboard.md) | Statistics and monitoring | 00, 01, 04 |

## Dependency Graph

```
00-foundation-database
         │
         ▼
01-authentication
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
02-components 03-builder  (other features)
    │         │
    │    ┌────┴────┐
    │    ▼         ▼
    │  04-gen    07-prompts
    │    │         │
    │    ▼         │
    │  06-history  │
    │              │
    └──────┬───────┘
           ▼
      08-import-export

05-analysis ─── (uses 02-components)
09-admin ────── (uses 04-generation)
```

## Implementation Order

**Recommended sequence:**

1. **00-foundation-database** - Must be first, everything depends on it
2. **01-authentication** - Required for all protected routes
3. **02-components-system** - Core data CRUD
4. **03-prompt-builder-ui** - Main interface
5. **04-generation-system** - Connect to Gemini API

After core is complete, these can be done in parallel:
- **05-image-analysis**
- **06-history-gallery**
- **07-saved-prompts**
- **08-import-export**
- **09-admin-dashboard**

## Spec Structure

Each spec follows this structure:

1. **Overview** - What it does, dependencies
2. **Directory Structure** - Files to create
3. **Data Model** - Database tables, TypeScript types
4. **API Endpoints** - REST API with request/response shapes
5. **Repository Layer** - Database operations
6. **React Hooks** - Client-side data fetching
7. **UI Components** - React component implementations
8. **Implementation Checklist** - Step-by-step tasks
9. **Edge Cases** - Error handling and special scenarios

## Using These Specs

### For Agents

Each spec contains everything needed to implement that feature:
- Code snippets are complete and can be copied directly
- Implementation checklists track progress
- Edge cases document expected behavior

### For Humans

Use these as detailed technical references:
- Cross-reference the main SPEC.md for business requirements
- Checklists can be used for code review
- Edge cases help with testing

## Environment Setup

Before implementing, ensure:

```bash
# Dependencies listed across specs
bun add better-sqlite3 @types/better-sqlite3
bun add jose
bun add swr
bun add zustand
bun add @google/genai
bun add react-dropzone

# shadcn/ui components
bunx shadcn@latest add resizable tabs checkbox radio-group
```

## Environment Variables

```env
# Required
GEMINI_API_KEY=<your-api-key>
APP_PASSWORD=<shared-password>

# Optional
GEMINI_MODEL=gemini-3-pro-image-preview
GEMINI_ANALYSIS_MODEL=gemini-3-pro-preview
JWT_SECRET=<random-32-char-string>
```
