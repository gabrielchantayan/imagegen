# Authentication System

## Overview

Simple shared-password authentication using HTTP-only cookies. Single password for all users, no user accounts.

**Dependencies:** 00-foundation-database.md

**Dependents:** All protected routes and API endpoints

---

## Technical Approach

| Aspect | Implementation |
|--------|----------------|
| Auth Method | Shared password |
| Session Storage | HTTP-only cookie |
| Token Format | Signed JWT (jose library) |
| Password Storage | Environment variable (hashed at runtime) |

---

## Environment Variables

```env
APP_PASSWORD=<shared-password>
JWT_SECRET=<random-32-char-string>  # Auto-generated if not provided
```

---

## Directory Structure

```
app/
├── api/
│   └── auth/
│       ├── login/route.ts
│       └── logout/route.ts
├── login/
│   └── page.tsx
└── (protected)/
    └── layout.tsx          # Auth middleware wrapper

lib/
├── auth.ts                 # Auth utilities
└── middleware.ts           # Route protection
```

---

## Auth Utilities (`lib/auth.ts`)

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'pb_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Get or generate JWT secret
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.APP_PASSWORD;
  return new TextEncoder().encode(secret);
}

// Verify password against env
export function verifyPassword(password: string): boolean {
  return password === process.env.APP_PASSWORD;
}

// Create session token
export async function createSession(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(getJwtSecret());

  return token;
}

// Verify session token
export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

// Get session from cookies
export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return false;
  return verifySession(token);
}

// Set session cookie
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

---

## API Endpoints

### POST /api/auth/login

Authenticate with shared password.

**Request:**
```typescript
interface LoginRequest {
  password: string;
}
```

**Response (Success - 200):**
```typescript
interface LoginResponse {
  success: true;
}
```

**Response (Failure - 401):**
```typescript
interface LoginErrorResponse {
  success: false;
  error: string;
}
```

**Implementation:**
```typescript
// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (!password || typeof password !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Password required' },
      { status: 400 }
    );
  }

  if (!verifyPassword(password)) {
    return NextResponse.json(
      { success: false, error: 'Invalid password' },
      { status: 401 }
    );
  }

  const token = await createSession();
  await setSessionCookie(token);

  return NextResponse.json({ success: true });
}
```

### POST /api/auth/logout

Clear session and log out.

**Response (200):**
```typescript
interface LogoutResponse {
  success: true;
}
```

**Implementation:**
```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
```

---

## Route Protection

### Protected Layout

```typescript
// app/(protected)/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await getSession();

  if (!isAuthenticated) {
    redirect('/login');
  }

  return <>{children}</>;
}
```

### API Route Helper

```typescript
// lib/api-auth.ts
import { NextResponse } from 'next/server';
import { getSession } from './auth';

export async function withAuth<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | { error: string }>> {
  const isAuthenticated = await getSession();

  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return handler();
}

// Usage in API routes:
// export async function GET() {
//   return withAuth(async () => {
//     // Protected logic here
//     return NextResponse.json({ data: 'secret' });
//   });
// }
```

---

## Login Page UI

```typescript
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/builder');
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Prompt Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Auth Context (Optional Client-Side State)

```typescript
// lib/auth-context.tsx
'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Password in transit | HTTPS in production |
| Cookie theft | HTTP-only, Secure, SameSite |
| CSRF | SameSite=Lax cookie attribute |
| Brute force | Rate limiting (see below) |
| Token tampering | JWT signature verification |

### Rate Limiting

```typescript
// lib/rate-limit.ts
const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

export function resetRateLimit(ip: string): void {
  attempts.delete(ip);
}
```

---

## Implementation Checklist

- [ ] Install jose: `bun add jose`
- [ ] Add APP_PASSWORD to .env.local
- [ ] Create `lib/auth.ts` with session utilities
- [ ] Create `lib/api-auth.ts` with route protection helper
- [ ] Create `app/api/auth/login/route.ts`
- [ ] Create `app/api/auth/logout/route.ts`
- [ ] Create `app/login/page.tsx`
- [ ] Create `app/(protected)/layout.tsx`
- [ ] Add rate limiting to login endpoint
- [ ] Test login flow end-to-end
- [ ] Test protected route redirects
- [ ] Test logout clears session
- [ ] Verify cookies are HTTP-only in browser devtools

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No APP_PASSWORD set | Server error on startup |
| Empty password submitted | 400 Bad Request |
| Wrong password | 401 Unauthorized |
| Expired/invalid token | Redirect to login |
| Already logged in, visit /login | Could redirect to /builder (optional) |
| Logout when not logged in | Success (idempotent) |

---

## Testing

```typescript
// __tests__/auth.test.ts
import { verifyPassword, createSession, verifySession } from '@/lib/auth';

describe('Auth', () => {
  beforeAll(() => {
    process.env.APP_PASSWORD = 'test-password';
  });

  test('verifyPassword returns true for correct password', () => {
    expect(verifyPassword('test-password')).toBe(true);
  });

  test('verifyPassword returns false for wrong password', () => {
    expect(verifyPassword('wrong')).toBe(false);
  });

  test('session token can be created and verified', async () => {
    const token = await createSession();
    expect(await verifySession(token)).toBe(true);
  });

  test('invalid token fails verification', async () => {
    expect(await verifySession('invalid')).toBe(false);
  });
});
```
