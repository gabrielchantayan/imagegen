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
src/
  app/           # Next.js app router
  components/    # React components
  lib/           # Utilities & helpers
  types/         # Type definitions
  hooks/         # Custom hooks
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
