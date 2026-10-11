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
- **docs/backend/api.md** — FastAPI stub status (no auth yet)
- **docs/backend/database-schema-design.md** — PostgreSQL schema design guidelines (follow before any database schema work)

## Quick context

- **Monorepo**: Turborepo 2.x + pnpm 11.25.0. Apps: `web` (Next.js 16 App Router, React 19, Tailwind v4, Biome) and `api` (FastAPI + uv stub, no endpoints).
- **Login page** (`apps/web/app/(login)/login/`): UI-complete using the shadcn TanStack Form pattern (`@tanstack/react-form` + Zod v4), `noValidate`, `aria-invalid`/`data-invalid`. `onSubmit` is a stub with a TODO for the future auth API — do not add fake backend behavior.
- **Icons**: HugeIcons only (`@hugeicons/core-free-icons` + `@hugeicons/react`). Never use lucide or other icon sets.
- **Animation**: `motion` (`motion/react`) via the shared primitives in `apps/web/components/motion/` (`Reveal`, `Stagger`/`StaggerItem`, `Collapse`) — see docs/frontend/motion.md. Reduced motion is handled globally.
- **Brand colors** (`globals.css` `@theme inline`): `brand-green` `#2d803d`, `brand-blue` `#2b66a9` — use as Tailwind utilities anywhere (`bg-brand-green`, `text-brand-blue`, opacity variants).
- **Lint/format**: Biome only (`biome.json`; override for `apps/web/components/ui/**`). Commands: `pnpm lint`, `pnpm format`, `pnpm --filter web check-types`, `pnpm --filter web build`.
- **Content rule**: keep static data out of pages — put it in `apps/web/lib/data/<domain>.ts` (see docs/frontend/data.md).
