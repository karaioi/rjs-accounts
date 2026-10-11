# rjs-accounts — Docs

Accounts management application that helps with finance.

This folder is the source of truth for project knowledge: architecture, conventions, and patterns. `AGENTS.md` at the repo root points here.

## Index

| Doc | What it covers |
| --- | --- |
| [architecture.md](architecture.md) | Monorepo layout, tooling, apps, scripts |
| [frontend/styling.md](frontend/styling.md) | Tailwind v4 theme, brand colors, `cn` helper |
| [frontend/components.md](frontend/components.md) | App components + shadcn/ui registry components |
| [frontend/forms.md](frontend/forms.md) | TanStack Form + Zod auth-form pattern (shadcn docs pattern) |
| [frontend/data.md](frontend/data.md) | Where static content/data lives (`lib/data/`) |
| [frontend/icons.md](frontend/icons.md) | Icon policy — **HugeIcons only** |
| [frontend/motion.md](frontend/motion.md) | Animation system (`motion/react`) — primitives, tokens, conventions |
| [backend/api.md](backend/api.md) | FastAPI app — endpoints, access rules, local dev |
| [backend/auth-and-tenancy-design.md](backend/auth-and-tenancy-design.md) | Auth + multi-tenant spec (Managed Better Auth + `app` schema RBAC) — **implemented (Phase A)** |
| [backend/database-schema-design.md](backend/database-schema-design.md) | PostgreSQL schema design guidelines (required workflow for DB work) |
| [backend/fastapi-standards.md](backend/fastapi-standards.md) | FastAPI engineering standards — follow when writing/reviewing `apps/api` code |

## Quick commands

Run from the repo root:

```sh
pnpm dev              # turbo dev — web (:3000) + api (:8000)
pnpm lint             # biome lint .
pnpm format           # biome format --write .
pnpm --filter web check-types   # next typegen + tsc --noEmit
pnpm --filter web build         # production build of the web app
```

Node >= 24, pnpm `11.25.0`, Turborepo `2.x`, Biome `2.5.15`.

## Project status

- **UI**: Login page has the full two-step sign-in flow (password → email OTP), wired to Neon Auth. Sign-up (`/sign-up`) is self-service with email-OTP verification, landing in a `pending` state; platform admins approve/decline accounts at `/admin/users`. The signed-in shell (`(application)/layout.tsx`) summarises the caller's access on `/dashboard` and offers sign out; while a session exists the Proxy redirects `/login` and `/sign-up` to the dashboard (see [frontend/forms.md](frontend/forms.md#status)). The auth proxy also rate limits the sign-in/sign-up/OTP calls it forwards.
- **Backend**: `apps/api` is a FastAPI + SQLAlchemy 2 + Alembic app. It verifies Neon Auth JWTs (EdDSA/JWKS), enforces the sign-in gate, **account approval**, RBAC, tenant scoping, and rate limiting on its auth endpoints. The `app` schema is migrated and seeded (6 roles, 41 permissions, approval workflow).
- **Email**: our mailer sends the auth OTP — a Neon Auth `send.otp`/`send.magic_link` webhook (`POST /api/v1/auth/webhooks/neon`, Ed25519-verified) hands delivery to `apps/api`, which renders a branded template (`emails.py`) and sends via `MAIL_FROM`. The `production` branch webhook is **enabled**, pointed at a Cloudflare quick tunnel to the local API, so OTP emails are delivered by our template instead of Neon's shared `auth@mail.myneon.app` sender. The mailer is configured for **Gmail SMTP** (`MAIL_PROVIDER=smtp`, `smtp.gmail.com`) and sends from `RJS Accounts <team.rjsconsultancy@gmail.com>` — it needs a Google **app password** in `SMTP_PASSWORD`. The tunnel URL is ephemeral — re-register it after restarts; see [backend/auth-and-tenancy-design.md §14](backend/auth-and-tenancy-design.md#14-email-strategy).
- **Auth & tenancy**: identity via Neon Auth (Managed Better Auth), authorization + tenancy via our own `app` schema. Self-service sign-up is admin-approved. Spec + Phase A implementation live in [backend/auth-and-tenancy-design.md](backend/auth-and-tenancy-design.md).