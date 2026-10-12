<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# rjs-accounts

Accounts management application that helps with finance.

## Project docs

Read the docs in [`docs/`](docs/README.md) before working on the project — they are the source of truth for structure and conventions:

- **docs/README.md** — index + quick commands + status
- **docs/architecture.md** — monorepo layout (Turborepo + pnpm), apps, tooling
- **docs/frontend/** — styling (Tailwind v4 tokens), components (incl. shadcn/ui registry), the TanStack Form + Zod pattern, data/content organization, HugeIcons policy, motion/animation system
- **docs/backend/api.md** — FastAPI app: endpoint surface, access rules (gates/RBAC), local dev
- **docs/backend/auth-and-tenancy-design.md** — auth + multi-tenant design: Managed Better Auth for identity, `app` schema for RBAC/tenancy (`customer → organization → membership → role`), two-step sign-in (password → email OTP), RLS. Read before touching auth/tenancy.
- **docs/backend/database-schema-design.md** — PostgreSQL schema design guidelines (follow before any database schema work)
- **docs/backend/fastapi-standards.md** — FastAPI engineering standards (structure, validation, DI, security, testing, Definition of Done) — follow when generating, reviewing, or modifying `apps/api` code

## Quick context

- **Monorepo**: Turborepo 2.x + pnpm 11.25.0. `pnpm dev` (root) runs **both** apps via turbo — web on `:3000` and api on `:8000` (`apps/api/package.json` has the `dev` script; don't start uvicorn separately while it runs). Apps: `web` (Next.js 16 App Router, React 19, Tailwind v4, Biome) and `api` (FastAPI + SQLAlchemy 2 + Alembic, auth + tenancy — see [docs/backend/api.md](docs/backend/api.md)).
- **Login page** (`apps/web/app/(login)/login/`): full two-step sign-in — email + password, then a 6-digit email OTP — using the shadcn TanStack Form pattern (`@tanstack/react-form` + Zod v4), `noValidate`, `aria-invalid`/`data-invalid`. It drives Neon Auth and the backend sign-in gate through the Server Actions in `apps/web/lib/auth/actions.ts` (see §11.5 of `docs/backend/auth-and-tenancy-design.md` for why the steps are separate calls). Password policy is **8–64** chars.
- **Sign-up & approval** (`apps/web/app/(login)/sign-up/`, `.../pending/`, `apps/web/app/(application)/admin/users/`): self-service sign-up with email-OTP verification; the account lands in `pending` (`POST /api/v1/auth/register`) until a platform admin approves it (`/admin/users` → `POST /api/v1/users/{id}/approve|reject`). Shared `AuthShell` + `FormMessage` components. The browser reaches FastAPI only through **named Server Actions** (`apps/web/lib/api/actions.ts`) — there is no generic relay.
- **Icons**: HugeIcons only (`@hugeicons/core-free-icons` + `@hugeicons/react`). Never use lucide or other icon sets.
- **Animation**: `motion` (`motion/react`) via the shared primitives in `apps/web/components/motion/` (`Reveal`, `Stagger`/`StaggerItem`, `Collapse`) — see docs/frontend/motion.md. Reduced motion is handled globally.
- **Brand colors** (`globals.css` `@theme inline`): `brand-green` `#2d803d`, `brand-blue` `#2b66a9` — use as Tailwind utilities anywhere (`bg-brand-green`, `text-brand-blue`, opacity variants).
- **Lint/format**: Biome only (`biome.json`; override for `apps/web/components/ui/**`). Commands: `pnpm lint`, `pnpm format`, `pnpm --filter web check-types`, `pnpm --filter web build`.
- **Content rule**: keep static data out of pages — put it in `apps/web/lib/data/<domain>.ts` (see docs/frontend/data.md).
- **Email design**: the branded auth emails are drafted as plain HTML in `docs/design/emails/` — regenerate with `uv run render-email-previews` (from `apps/api`); `apps/api/src/api/emails.py` is the source of truth.
