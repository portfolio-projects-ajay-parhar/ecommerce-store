# Phase 2 — Authentication & Roles

## Goals
1. NextAuth v4 Credentials auth with JWT sessions (same pattern as Project 6)
2. Two roles only: **CUSTOMER** (default) and **ADMIN**
3. Registration endpoint + auth pages
4. Server-side guards for order ownership and admin routes

## Steps

### 2.1 NextAuth options (src/lib/auth.ts)
- Credentials provider: lookup by email, `bcryptjs.compare` against `passwordHash`, reject banned users
- **Adapter**: `PrismaAdapter` but with `session: { strategy: "jwt" }` (the NextAuth v4 + credentials gotcha from Project 6)
- Callbacks:
  - `jwt` → copy `id`, `role` from the DB user onto the token
  - `session` → mirror `id`, `role` onto `session.user`

### 2.2 Type augmentation (src/types/next-auth.d.ts)
`session.user.role: "CUSTOMER" | "ADMIN"` type-safe everywhere.

### 2.3 Registration (src/app/api/auth/register/route.ts)
- Zod: email format, password ≥ 8 chars, name 1–80
- bcrypt hash (10 rounds); `409` on duplicate email
- In-memory rate limit (5/min/IP) — copy `src/lib/rate-limit.ts` from Project 6
- New users always get `role: CUSTOMER`

### 2.4 Server guards (src/lib/guards.ts)
```ts
requireUser()                 // 401 AuthError if no session
requireAdmin()                // 403 unless session.user.role === "ADMIN"
requireOrderOwner(orderId)    // 404 if not owner and not ADMIN (404, not 403 — don't leak ids)
```
Central handler converts `AuthError` → JSON `{ error }` with the right status.

### 2.5 Client providers
Copy from Project 6: `SessionProvider`, `QueryProvider` (TanStack Query), `ToastProvider`. Wrap in `src/app/layout.tsx`.

### 2.6 Auth pages
- `src/app/(auth)/signin/page.tsx` — Suspense-wrapped `useSearchParams` (callbackUrl)
- `src/app/(auth)/signup/page.tsx` — auto sign-in after register → redirect home
- Header: "Sign in" link for anon; account menu (Profile / Orders / Sign out) for signed-in; **Admin** entry visible only for ADMIN

### 2.7 Cart merge hook
On session appearance, if a guest cart exists in localStorage, `POST /api/cart/merge` (implemented in Phase 4) and clear the guest cart. Wire it now so Phase 4 only fills in the endpoint.

## Done When
- Register → auto signed-in → lands on storefront as CUSTOMER
- Seed ADMIN can sign in and sees the Admin nav entry
- `requireAdmin()` blocks a CUSTOMER session with 403 (verify with a temporary test route)
- JWT callback carries `role`; `session.user.role` typed correctly