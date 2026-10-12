# Architecture

## Stack

- **Monorepo**: Turborepo `2.x` + pnpm `11.25.0` (`pnpm-workspace.yaml` covers `apps/*`, `packages/*`). `apps/api` is a workspace too (has a `package.json` with a `dev` script that runs uvicorn via `uv`), so `pnpm dev` starts **web + api together**.
- **Node**: >= 24 (see `engines` in root `package.json`)
- **Apps / packages**:
  - `apps/web` — Next.js **16.3.8** (App Router), React **19.2.8**, TypeScript 7, Tailwind CSS **v4**, Biome. The main application.
  - `apps/api` — **FastAPI + SQLAlchemy 2 + Alembic** (Python via `uv`). Auth (Neon Auth JWT verification), the two-step sign-in gate, account approval, RBAC, and multi-tenant scoping over the `app` schema. See [backend/api.md](backend/api.md).
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
  page.tsx                  # `/` → redirects to /dashboard
  (login)/login/            # two-step sign-in (password → email OTP)
  (login)/sign-up/          # self-service sign-up (email-verified → pending)
  (login)/pending/          # "awaiting approval" screen
  (application)/layout.tsx  # signed-in shell (header + sign out)
  (application)/dashboard/  # "Your access" summary (identity + roles) + admin link
  (application)/admin/users/  # platform-admin approval queue
  api/auth/[...path]/       # Neon Auth proxy route (+ rate limiting for auth calls)
  api/verification/         # sign-in gate read, used by proxy.ts
  layout.tsx, globals.css, shadcn.css
proxy.ts                    # route protection + auth-page redirects (Next 16 middleware)
components/
  Beams.tsx          # animated beams background (client)
  access-summary.tsx # <AccessSummary /> — identity, platform role, memberships
  auth-message.tsx   # shared <FormMessage /> (shadcn Alert; error/success)
  auth-shell.tsx     # shared split layout (PromoPanel + form column)
  error-dialog.tsx   # <ErrorDialog /> (shadcn Dialog) for auth failures
  feature-card.tsx   # <FeatureCard /> + Feature type
  otp-field.tsx      # <OtpField /> (shadcn InputOTP, 6-digit code as 2–2–2)
  password-requirements.tsx  # live password-rule checklist
  promo-panel.tsx    # <PromoPanel /> (Beams + hero content)
  sign-out-button.tsx  # <SignOutButton /> — ends the session, back to /login
  motion/            # Reveal, Stagger/StaggerItem, Collapse + variants
  ui/                # shadcn registry components (base-ui)
lib/
  api/server.ts      # server-side fetch → FastAPI (attaches bearer token)
  api/actions.ts     # Server Actions for browser-driven backend calls
  api/types.ts       # response shapes consumed from FastAPI (e.g. MeResponse)
  auth/              # Neon Auth server + browser clients, sign-in actions, rate limits
  data/              # static content (promo, consents, roles)
  rate-limit.ts      # in-process fixed-window limiter
  utils.ts
  validations/       # Zod schemas (login, sign-up, otp, password)
```

## Dev server

`pnpm dev` (root) runs every workspace's `dev` task via turbo:

- `apps/web` → **port 3000** (`next dev`)
- `apps/api` → **port 8000** (`uv run api`, host/port from `HOST`/`PORT` in `.env`)

The API must not be started separately while `pnpm dev` is running — the second
listener fails with `EADDRINUSE`. To run only the API: `cd apps/api && uv run api`.

## Neon configuration

- **`.neon`** — the project link (`neon link`) that pins the branch; `neon` commands run against it.
- **`neon.ts`** (root) — declarative Neon policy via `@neon/config/v1`: `auth: true` (Managed Better Auth) and two object-storage buckets — `uploads` (`access: "private"`, for user content) and `public-assets` (`access: "public_read"`, for branding assets that load without a credential, e.g. the email logo). Edit this file, then reconcile a branch:

  ```sh
  neon config plan     # dry run: show the diff for the linked branch
  neon config apply    # apply the policy (alias: neon deploy)
  ```

  Uploading an object: `neon buckets object put public-assets/brand/<name> --file <path> --content-type image/png`.
  A `public_read` object is served anonymously at `${AWS_ENDPOINT_URL_S3}/<bucket>/<key>` (the endpoint is branch-scoped — see the production URL in [design/emails/README.md](design/emails/README.md#hosted-assets)).
- The **Neon CLI** (`neon@8.x`) is installed globally with pnpm. `pnpm setup` (once per machine) puts `PNPM_HOME` (`~/Library/pnpm` on macOS) on `PATH` so the `neon` command resolves in new shells; reload with `source ~/.zshrc`.