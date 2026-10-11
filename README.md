# rjs-accounts

Accounts management application that helps with finance.

A Turborepo + pnpm monorepo: a Next.js web app, a FastAPI backend, and shared
packages. Authentication uses **Neon Auth (Managed Better Auth)** for identity;
authorization, tenancy, and roles are owned by the app in a Postgres `app` schema,
served through **FastAPI as the single data-access layer**.

> **Status:** Phase A implemented — sign-in (password → email OTP), self-service
> sign-up with admin approval, RBAC, and multi-tenant scoping. No finance tables
> yet. See [docs/](docs/README.md) for details.

## What's inside

### Apps and packages

- `apps/web` — the application: [Next.js](https://nextjs.org) 16 (App Router),
  React 19, Tailwind CSS v4, Biome.
- `apps/api` — FastAPI + SQLAlchemy 2 + Alembic (Python via [`uv`](https://docs.astral.sh/uv/)):
  verifies Neon Auth JWTs, enforces the sign-in/approval gates, RBAC, and tenancy.
- `packages/ui` — stub React component library (`@repo/ui`).
- `packages/typescript-config` — shared `tsconfig.json`s.

### Tooling

- **Turborepo** + **pnpm** for the monorepo; **Biome** for linting and formatting
  (there is **no** ESLint or Prettier here).
- **uv** for the Python backend; **Alembic** for migrations.

## Prerequisites

- Node >= 24, pnpm `11.25.0`
- Python + [`uv`](https://docs.astral.sh/uv/)
- A Neon project with **Auth enabled** (the `.neon` link supplies the branches)

## Getting started

```sh
pnpm install
```

Fill in the environment files:

- `apps/web/.env.local` — copy `apps/web/.env.example` (`NEON_AUTH_*`, `API_BASE_URL`).
- `apps/api/.env` — copy `apps/api/.env.example` (`DATABASE_URL*`, `NEON_AUTH_*`, SMTP).

Then, from the root:

```sh
pnpm dev                 # turbo: web on :3000 + api on :8000
```

Apply migrations (first run / after pulling schema changes):

```sh
cd apps/api && uv run alembic upgrade head
```

Bootstrap the first platform admin (they approve everyone else):

```sh
cd apps/api && uv run seed-admin you@example.com
```

## Scripts

Run from the repo root:

| Script | Does |
|---|---|
| `pnpm dev` | `turbo run dev` — web (`:3000`) + api (`:8000`) |
| `pnpm build` | `turbo run build` |
| `pnpm lint` | `biome lint .` |
| `pnpm format` | `biome format --write .` |
| `pnpm check-types` | `turbo run check-types` |
| `pnpm --filter web build` | production build of the web app |

## Documentation

The docs in [`docs/`](docs/README.md) are the source of truth:

- [docs/architecture.md](docs/architecture.md) — monorepo layout, apps, tooling
- [docs/frontend/](docs/frontend) — styling, components, forms, data, icons, motion
- [docs/backend/api.md](docs/backend/api.md) — FastAPI endpoints, access rules, local dev
- [docs/backend/auth-and-tenancy-design.md](docs/backend/auth-and-tenancy-design.md) — auth + multi-tenant spec
- [docs/backend/database-schema-design.md](docs/backend/database-schema-design.md) — schema guidelines

Contributing or using an AI agent? Start with [`AGENTS.md`](AGENTS.md).
