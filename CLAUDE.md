# Prompt Builder

## Project Overview

A web application for composing and generating images using the Google Gemini API. Users select component presets (characters, wardrobes, poses, scenes) to build structured JSON prompts, then generate images directly.

**Key features:** Component CRUD, prompt composition, image generation queue, image-to-prompt analysis, generation history.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Database | SQLite via better-sqlite3 |
| State | Zustand |
| Data fetching | SWR |
| Styling | Tailwind + shadcn/ui |
| AI | Google Gemini API (@google/genai) |

## Key Files

```
app/
├── api/                    # REST endpoints
│   ├── auth/               # Login/logout
│   ├── generate/           # Image generation + queue
│   ├── analyze/            # Image-to-prompt
│   ├── components/         # Preset CRUD
│   ├── prompts/            # Saved prompts
│   └── history/            # Generation history
├── (protected)/            # Auth-required pages
│   ├── builder/            # Main prompt builder
│   ├── history/            # Past generations
│   └── admin/              # Stats dashboard
└── login/

lib/
├── db.ts                   # SQLite connection + helpers
├── gemini.ts               # Gemini API client
├── queue.ts                # Generation queue
├── stores/                 # Zustand stores
│   └── builder-store.ts    # Prompt builder state
└── repositories/           # DB query functions
    ├── components.ts
    ├── prompts.ts
    ├── generations.ts
    └── stats.ts

data/
└── prompt-builder.db       # SQLite database
```

## Environment Variables

```env
GEMINI_API_KEY=<required>
GEMINI_MODEL=gemini-3-pro-image-preview
APP_PASSWORD=<shared-password>
JWT_SECRET=<random-string>
```

## Component Categories

| ID | Purpose |
|----|---------|
| characters | Full character presets |
| physical_traits | Hair, skin, body |
| jewelry | Accessories |
| wardrobe | Complete outfits |
| wardrobe_tops/bottoms/footwear | Individual pieces |
| poses | Body position |
| scenes | Scene description |
| backgrounds | Environment |
| camera | Camera/look settings |
| ban_lists | Negative prompts |

## Documentation

- `SPEC.md` - Full technical specification
- `docs/specs/` - Detailed implementation specs by feature domain

---

# Next.js/TypeScript Best Practices

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files & folders | kebab-case | `user-profile.tsx`, `api-utils.ts` |
| Types & interfaces | PascalCase | `UserProfile`, `ApiResponse` |
| React components | PascalCase | `UserCard`, `NavBar` |
| Variables | snake_case | `user_count`, `is_loading` |
| Functions | snake_case | `fetch_user()`, `handle_submit()` |
| Legacy code | camelCase | `getUserData()`, `isActive` |

## File Structure

```
app/             # Next.js app router (pages + API)
components/      # React components
lib/             # Utilities, db, stores, repositories
  hooks/         # Custom React hooks
  types/         # Type definitions
  stores/        # Zustand stores
  repositories/  # Database query functions
data/            # SQLite database
public/images/   # Generated images
```

## Code Rules

- **Exports**: Use named exports, avoid default exports
- **Types**: Prefer `type` over `interface` unless extending
- **Components**: One component per file, filename matches component name
- **Async**: Use async/await, never raw promises
- **Errors**: Handle errors explicitly, no silent catches

## ES6+ Standards

- **Arrow functions**: Always use `const fn = () => {}` over `function fn() {}`
- **Destructuring**: Use for objects and arrays `const { name } = user`
- **Spread operator**: Prefer `{ ...obj }` over `Object.assign()`
- **Template literals**: Use `` `Hello ${name}` `` over string concatenation
- **Optional chaining**: Use `user?.profile?.name`
- **Nullish coalescing**: Use `value ?? default` over `value || default`
- **Array methods**: Prefer `map`, `filter`, `reduce` over loops

## React Practices

- **Functional components only**: No class components
- **Hooks**: Use hooks for state and effects
- **Memoization**: Use `useMemo`/`useCallback` for expensive operations
- **Keys**: Always use stable, unique keys in lists
- **Fragments**: Use `<>` over unnecessary wrapper divs
- **Early returns**: Return early for loading/error states

## TypeScript Practices

- **Strict mode**: Always enabled
- **No `any`**: Use `unknown` if type is truly unknown
- **Const assertions**: Use `as const` for literal types
- **Generics**: Use for reusable type-safe functions
- **Discriminated unions**: Prefer over optional properties
- **Zod**: Use for runtime validation

## Imports

```ts
// Order: external → internal → types → styles
import { useState } from "react";

import { UserCard } from "@/components/user-card";
import { fetch_user } from "@/lib/api-utils";

import type { User } from "@/types/user-types";
```

## Avoid

- `var` keyword
- `function` declarations (use arrow functions)
- `any` type
- Index as key in lists
- Nested ternaries
- Magic numbers/strings (use constants)
- Mutating state directly
- `useEffect` for derived state

## Component Template

```tsx
// file: user-card.tsx
type UserCardProps = {
  user_name: string;
  is_active: boolean;
};

export function UserCard({ user_name, is_active }: UserCardProps) {
  const handle_click = () => {
    // ...
  };

  return <div onClick={handle_click}>{user_name}</div>;
}
```

## Type Template

```ts
// file: api-types.ts
export type ApiResponse<T> = {
  data: T;
  error_message: string | null;
  is_success: boolean;
};
```

## Legacy Code Marker

```ts
// @legacy - uses camelCase (do not refactor)
function getUserById(userId: string) {
  // existing code
}
```

## shadcn/ui

UI components are in `components/ui/`. Add new ones with:

```bash
bunx shadcn@latest add <component-name>
```

Already installed: button, badge, card, input, textarea, label, separator, select, dropdown-menu, alert-dialog, combobox, field, input-group

## Database

SQLite database at `data/prompt-builder.db`. Use `better-sqlite3` synchronously:

```ts
import { getDb } from '@/lib/db';
const db = getDb();
const rows = db.prepare('SELECT * FROM components WHERE category_id = ?').all(categoryId);
```

Key tables: categories, components, saved_prompts, generations, generation_queue, favorites
