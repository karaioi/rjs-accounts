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

- **UI**: Login page has the full two-step sign-in flow (password → email OTP), wired to Neon Auth. Sign-up (`/sign-up`) is self-service with email-OTP verification, landing in a `pending` state; platform admins approve/decline accounts at `/admin/users`. Dashboard route is a stub.
- **Backend**: `apps/api` is a FastAPI + SQLAlchemy 2 + Alembic app. It verifies Neon Auth JWTs (EdDSA/JWKS), enforces the sign-in gate, **account approval**, RBAC, and tenant scoping. The `app` schema is migrated and seeded (6 roles, 41 permissions, approval workflow).
- **Email**: our mailer sends the auth OTP — a Neon Auth `send.otp`/`send.magic_link` webhook (`POST /api/v1/auth/webhooks/neon`, Ed25519-verified) hands delivery to `apps/api`, which renders a branded template (`emails.py`) and sends via `MAIL_FROM`. Neon's shared `auth@mail.myneon.app` sender is what it uses only until the webhook is registered; see [backend/auth-and-tenancy-design.md §14](backend/auth-and-tenancy-design.md#14-email-strategy).
- **Auth & tenancy**: identity via Neon Auth (Managed Better Auth), authorization + tenancy via our own `app` schema. Self-service sign-up is admin-approved. Spec + Phase A implementation live in [backend/auth-and-tenancy-design.md](backend/auth-and-tenancy-design.md).