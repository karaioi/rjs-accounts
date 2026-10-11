# Architecture

## Stack

- **Monorepo**: Turborepo `2.x` + pnpm `11.25.0` (`pnpm-workspace.yaml` covers `apps/*`, `packages/*`)
- **Node**: >= 24 (see `engines` in root `package.json`)
- **Apps / packages**:
  - `apps/web` — Next.js **16.3.8** (App Router), React **19.2.8**, TypeScript 7, Tailwind CSS **v4**, Biome. The main application.
  - `apps/api` — FastAPI + uv stub (Python). No endpoints yet.
  - `packages/ui` — stub React component library (`@repo/ui`): `card.tsx`, `code.tsx`, `button.tsx` stubs.
  - `packages/typescript-config` — shared TypeScript configs.

## Root scripts (`package.json`)

| Script | Runs |
| --- | --- |
| `pnpm build` | `turbo run build` |
| `pnpm dev` | `turbo run dev` |
| `pnpm lint` | `biome lint .` |
| `pnpm format` | `biome format --write .` |
| `pnpm check-types` | `turbo run check-types` |

## Linting / formatting

- **Biome 2.5.15** (`biome.json` at root): recommended preset, double quotes, 2-space indent, `organizeImports` assist enabled.
- Overrides scoped to `apps/web/components/ui/**` disable certain a11y/suspicious rules — these are shadcn **registry** components and intentionally trip them. Do not move app code into that folder to dodge linting.
- Do not add ESLint; Biome is the only linter/formatter.

## Web app layout (`apps/web`)

```
app/
  (login)/login/page.tsx        # composition only (no data, see lib/data)
  (login)/login/login-form.tsx  # TanStack Form login (UI-only)
  (application)/dashboard/page.tsx  # stub
  layout.tsx, globals.css, shadcn.css
components/
  Beams.tsx          # animated beams background (client)
  feature-card.tsx   # <FeatureCard /> + Feature type
  promo-panel.tsx    # <PromoPanel /> (Beams + hero content)
  ui/                # shadcn registry components (base-ui)
lib/
  utils.ts
  data/promo.ts      # static promo content
```

## Dev server

`apps/web` dev runs on **port 3000**. A dev server may already be running (user-run) — starting another one fails with `EADDRINUSE`; reuse the existing one for browser checks (it HMR-serves changes).