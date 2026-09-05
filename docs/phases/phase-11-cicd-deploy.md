# Phase 11 — CI/CD & Deployment

## Goals
First project of the curriculum with a **CI pipeline**: every push is linted, type-checked, tested, and built before deploy.

## Steps

### 11.1 GitHub Actions (.github/workflows/ci.yml)
```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build
        env:
          DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci"   # build-time placeholder
          NEXTAUTH_SECRET: "ci-placeholder"
          STRIPE_SECRET_KEY: "sk_test_placeholder"
```
Notes:
- `next build` doesn't touch the DB (all pages dynamic), so a placeholder URL is enough — if any page tries to prerender with DB access, mark it `force-dynamic` (Project 6 convention).
- Optional: add a `postgres` service container + `prisma migrate deploy` job for true integration CI.

### 11.2 Repo hygiene
- README CI badge (`https://github.com/<user>/ecommerce-store/actions/workflows/ci.yml/badge.svg`)
- Branch protection on `main`: require the `verify` check
- `.env*` git-ignored except `.env.example` (Project 6 pattern)

### 11.3 Docker (optional)
- `Dockerfile` — multi-stage (deps → build → runner on `node:20-alpine`, `next start`)
- `docker-compose.yml` — app + `postgres:16` for fully-local dev (`DATABASE_URL` points at the service)
- Verify `docker compose up` boots the app against the local DB with migrations applied

### 11.4 Deploy (Vercel)
1. `gh repo create ecommerce-store --public --source=. --remote=origin --push`
2. Import at https://vercel.com/new
3. Env vars (production values): `DATABASE_URL` (pooled), `DIRECT_URL`, `NEXTAUTH_SECRET` (rotated), `NEXTAUTH_URL` (prod domain), `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (from step 4), `RESEND_API_KEY`, `EMAIL_FROM`, storage provider keys
4. Stripe Dashboard → Developers → Webhooks → **Add endpoint** `https://<prod>/api/webhooks/stripe` with events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded` → copy signing secret to Vercel
5. `npx prisma migrate deploy` against prod (or a release step in the Vercel build)
6. Resend: verify the sending domain for `EMAIL_FROM`

### 11.5 Production smoke
- Browse → add to cart → checkout with test card → success page flips to PAID
- Confirmation email received (or EmailLog SKIPPED if intentionally disabled)
- Admin dashboard KPIs reflect the order
- Vercel function logs show the webhook 200 (no duplicate processing on Stripe retries)

## Done When
- CI green on a PR and on `main`
- Production URL live; webhook endpoint shows healthy deliveries in Stripe
- Secrets only in Vercel/GitHub — nothing committed
- (Stretch) Docker compose demo works locally