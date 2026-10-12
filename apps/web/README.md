# rjs-accounts web

Next.js (App Router, React 19, Tailwind v4, Biome) frontend for `rjs-accounts`.
It owns the unauthenticated surfaces — sign-in, self-service sign-up, and the
pending/approval screens — and talks to Neon Auth (Managed Better Auth) for
identity, relaying backend calls to the FastAPI app in `apps/api`.

See [`docs/frontend/`](../../docs/frontend) for styling, components, forms, data,
icons, and motion conventions, and
[`docs/backend/auth-and-tenancy-design.md`](../../docs/backend/auth-and-tenancy-design.md)
for the auth + tenancy model.

## Getting started

From the repo **root**:

```sh
pnpm dev          # turbo: web (:3000) + api (:8000) together
```

Open <http://localhost:3000>. To run just this app:
`pnpm --filter web dev`.

## Environment

Copy `.env.example` to `.env.local` and fill it in (`NEON_AUTH_BASE_URL` comes
from `neon neon-auth status`):

```sh
NEON_AUTH_BASE_URL=        # Neon Auth origin
NEON_AUTH_COOKIE_SECRET=   # openssl rand -base64 32
API_BASE_URL=http://127.0.0.1:8000   # server-side only
```

The web app holds **auth values + the API base URL only** — never database or
storage credentials (those belong to `apps/api`).

## Layout

```
app/
  (login)/login/        # two-step sign-in (password → email OTP)
  (login)/sign-up/      # self-service sign-up (email-verified → pending)
  (login)/pending/      # "awaiting approval" screen
  (application)/dashboard/     # stub (guards approval + admin link)
  (application)/admin/users/   # platform-admin approval queue
  api/auth/[...path]/   # Neon Auth proxy
  api/verification/     # sign-in gate read (used by proxy.ts)
components/             # app components (auth shell/message, motion, …) + ui/
lib/                    # api client + Server Actions, auth clients/actions, data, validations
```

Route protection lives in `proxy.ts` (Next 16 middleware).

## Scripts

```sh
pnpm --filter web dev          # next dev --port 3000
pnpm --filter web build        # production build
pnpm --filter web check-types  # next typegen + tsc --noEmit
pnpm lint                      # biome (repo root)
```
