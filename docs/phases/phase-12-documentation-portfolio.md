# Phase 12 — Documentation & Portfolio

## Goals
Turn the build into a portfolio piece: the 17-section README, diagrams, a demo GIF, and a written trade-off record — the difference between "I built a shop" and "I understand commerce systems".

## Steps

### 12.1 README.md — 17-section template (same as Projects 5/6)
1. **Problem** — first commercial-grade app: payments, inventory integrity, order history
2. **Features** — customer storefront + admin back office, grouped by role
3. **Tech Stack** — table (link the Project 6 reuse explicitly: storage, auth, providers)
4. **Architecture** — link `docs/architecture.svg`; show the three trees (public/admin/api)
5. **Database Schema** — link `prisma/schema.prisma` + ER diagram; call out snapshots & denormalized counters
6. **API Documentation** — the PLAN.md API table
7. **Authentication Strategy** — NextAuth JWT + CUSTOMER/ADMIN, server guards as source of truth
8. **Security Considerations** — webhook signatures, idempotency, server-computed totals, conditional stock updates, RBAC, sanitization
9. **Testing Strategy** — Vitest unit suite + oversell concurrency test + smoke script
10. **Performance Considerations** — denormalized rating/counters, composite indexes, cursor pagination, skeletons, parallel fetches
11. **Deployment Architecture** — Vercel + Supabase + Stripe webhooks + Resend diagram
12. **Screenshots** — home, listing, detail, cart, checkout, order confirmation email, admin dashboard, inventory
13. **Demo** — live URL + GIF
14. **What I Learned** — e.g. transactions + conditional updates beat read-then-write; webhooks must be idempotent; cents-only money
15. **Future Improvements** — search service, Stripe Payment Element, multi-currency, discount codes, order emails for ship/deliver, S3 image pipeline
16. **Trade-offs & Design Decisions** — table (below)
17. **Scaling Strategy** — read replicas, queue for emails/webhooks, Redis cart/session, full-text search

### 12.2 Diagrams
- `docs/architecture.svg` — browser → Next.js (public/admin) → Prisma → Supabase; Stripe hosted page; Stripe → webhook → email; draw.io/excalidraw export
- `docs/ER-diagram.svg` — dbdiagram.io export of the 14 models

### 12.3 Demo GIF
30 seconds: browse → filter → add to cart → checkout (Stripe test card) → success page → confirmation email → admin dashboard KPI update. `screen-to-gif` (Windows) → embed at the top of the README; regenerate via a `npm run demo:gif` script if the Project 6 tooling is ported.

### 12.4 tasks-progress.md
- Mirror `docs/TASKS.md` at the repo root
- Tick as phases complete; final line: `Status: BUILD PASSING — next build clean, tsc clean, Vitest N/N, oversell test green`

### 12.5 Trade-offs table (draft)
| Decision | Trade-off | Why |
|---|---|---|
| Stripe Checkout (hosted) | No in-page card form, less UI control | Minimal PCI scope, tiny webhook surface, fastest to production |
| Price/name snapshots on OrderItem | Duplicate data | Order history is immutable under product edits |
| Conditional `updateMany` stock decrement | Slightly gnarly Prisma code | Correct under concurrency without SELECT FOR UPDATE |
| WebhookEvent claim table | Extra table | Idempotency with zero external deps; auditable |
| Guest cart in localStorage | Client-only until sign-in | No anon sessions; merge covers the hand-off |
| Separate `Inventory` model | Extra join | Room for per-variant stock, reservations, audit later |
| Integer cents everywhere | Manual formatting at the edge | No float money bugs, Stripe-native |
| ARCHIVE instead of hard delete products | Stale listings need cleanup | OrderItem/Review FK integrity preserved |

## Done When
- README complete with live demo + screenshots + badge
- Both diagrams committed under `docs/`
- Demo GIF embedded
- `tasks-progress.md` fully ticked with a final status line
- GitHub repo public, pinned on the profile, CI green