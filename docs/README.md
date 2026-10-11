# rjs-accounts — Docs

Accounts management application that helps with finance.

This folder is the source of truth for project knowledge: architecture, conventions, and patterns. `AGENTS.md` at the repo root points here.

## Index

| Doc | What it covers |
| --- | --- |
| [architecture.md](architecture.md) | Monorepo layout, tooling, apps, scripts |
| [frontend/styling.md](frontend/styling.md) | Tailwind v4 theme, brand colors, `cn` helper |
| [frontend/components.md](frontend/components.md) | App components + shadcn/ui registry components |
| [frontend/forms.md](frontend/forms.md) | TanStack Form + Zod login pattern (shadcn docs pattern) |
| [frontend/data.md](frontend/data.md) | Where static content/data lives (`lib/data/`) |
| [frontend/icons.md](frontend/icons.md) | Icon policy — **HugeIcons only** |
| [backend/api.md](backend/api.md) | FastAPI stub, auth status (deferred) |

## Quick commands

Run from the repo root:

```sh
pnpm dev              # turbo dev (web on :3000, api)
pnpm lint             # biome lint .
pnpm format           # biome format --write .
pnpm --filter web check-types   # next typegen + tsc --noEmit
pnpm --filter web build         # production build of the web app
```

Node >= 24, pnpm `11.25.0`, Turborepo `2.x`, Biome `2.5.15`.

## Project status

- **UI**: Login page is complete (UI-only — no backend calls). Dashboard route is a stub.
- **Backend**: `apps/api` is an empty FastAPI skeleton. **No auth endpoints exist yet.** The login form's `onSubmit` has a `TODO` marking where the auth API call goes once it exists.