# Backend — apps/api

## Status: Phase A implemented (auth + tenancy)

`apps/api` is a **FastAPI + SQLAlchemy 2 + Alembic** app on Python 3.14 (`uv`).

```
apps/api/
├── alembic.ini
├── alembic/
│   ├── env.py                     # targets the `app` schema only
│   └── versions/
│       ├── 0001_auth_tenancy_schema.py
│       ├── 0002_seed_rbac.py
│       ├── 0003_user_approval.py
│       └── 0004_rate_limit.py
├── .env.example
├── pyproject.toml
└── src/api/
    ├── main.py                    # FastAPI app + routers
    ├── config.py                  # pydantic-settings
    ├── db.py                      # engine, sessions, RLS GUCs
    ├── schemas.py                 # request/response models
    ├── mailer.py                  # provider-agnostic mailer (Resend / SMTP)
    ├── emails.py                  # branded HTML/text transactional templates
    ├── auth/                      # JWT + webhook-signature verification, RBAC deps
    ├── models/                    # `app` tables + read-only neon_auth mapping
    ├── routers/                   # me, reference, auth_gate, auth_webhooks,
    │                              #   registration, users, customers,
    │                              #   organizations, members, audit
    ├── services/                  # permissions, audit, verification, rate_limit
    └── scripts/                   # seed_admin, render_email_previews
```

## What it does

Authentication is **Neon Auth (Managed Better Auth)**; authorization, tenants, and
roles are **ours**, in the `app` schema. FastAPI is the single data-access layer:
it verifies the Neon Auth JWT via JWKS (EdDSA), applies the two-step sign-in gate,
and enforces RBAC + tenant scoping.

See **[auth-and-tenancy-design.md](auth-and-tenancy-design.md)** for the full spec:
data model, roles/permissions, the password → email-OTP flow, RLS, and the
migration plan. Follow [database-schema-design.md](database-schema-design.md) for
any schema work.

## API surface

All routes are under `/api/v1` and require `Authorization: Bearer <JWT>` — except the Neon Auth webhook, which is authenticated by its Ed25519 signature.

| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/me` | authenticated | identity, `platform_role` (raw `neon_auth.user.role`) + `is_platform_admin`, `account_status`, `email_verified`, memberships |
| `GET` | `/auth/login/verification` | authenticated | current sign-in gate state |
| `POST` | `/auth/login/verification/start` | authenticated | open (or reopen) the 15-minute code window |
| `POST` | `/auth/login/verification/complete` | authenticated | confirm the OTP step |
| `POST` | `/auth/webhooks/neon` | **public — signature** | Neon Auth `send.otp` / `send.magic_link` delivery (see below) |
| `POST` | `/auth/register` | authenticated | create own `user_profile` in `pending` (idempotent) |
| `GET` | `/users` | platform admin | approval queue, `?status=pending\|active\|suspended\|rejected` |
| `POST` | `/users/{id}/approve` | platform admin | activate an account |
| `POST` | `/users/{id}/reject` | platform admin | decline an account |
| `GET` | `/roles` · `/permissions` | authenticated + verified | reference data |
| `GET` · `POST` | `/customers` | platform admin | list / create+activate a customer |
| `GET` | `/organizations` | verified | admin sees all; others see their orgs |
| `POST` | `/organizations` | owner/admin of the customer; or admin | creates `pending` (or active for admin) |
| `POST` | `/organizations/{id}/approve` | platform admin | `pending → active` |
| `GET` · `POST` | `/organizations/{id}/members` | `member:read` / `member:invite` | |
| `PATCH` · `DELETE` | `/organizations/{id}/members/{user_id}` | `member:role_manage` / `member:remove` | last-owner protected |
| `GET` | `/audit-logs` | `audit:read` | org-scoped |

Tenant-scoped requests send `X-Organization-Id: <org uuid>`.

Every route except `/me`, `/auth/register`, the `auth/login/verification`
routes, and `/auth/webhooks/neon` requires the sign-in gate to be satisfied — a
password-only session gets
`403 {"detail": "Email verification required"}` (header
`X-Login-Verification: required`). The gate additionally requires the account to
be `active`; a pending/rejected/suspended account gets
`403 {"detail": "Your account is awaiting administrator approval"}` (header
`X-Account-Status: pending`). Platform admins must pass the OTP gate but skip the
approval check. A confirmed OTP stays valid for the life of the session; the
15-minute `expires_at` bounds only an *unconfirmed* code, and `/start` reopens it
for a resend or an expired code.

## Rate limiting

The sign-in gate and registration are rate limited **in FastAPI**
(`services/rate_limit.py`, counters in `app.rate_limit`); the Managed Auth OTP
calls are rate limited by the **web layer** — the auth proxy and the sign-in
Server Actions share one limiter (`lib/auth/rate-limit.ts`). A limited request
gets `429 {"detail": "Too many attempts. Please wait before trying again."}`
with `Retry-After` and `X-RateLimit-*` headers, which the proxy and actions pass
through to the browser. The routes, windows, and why the policy is split across
two layers are in [auth-and-tenancy-design.md §13.5](auth-and-tenancy-design.md#135-rate-limiting).

## Email (OTP + branded templates)

Neon Auth no longer sends the verification code itself — the branch's webhook
posts `send.otp` / `send.magic_link` to `POST /api/v1/auth/webhooks/neon`, and
this app renders and sends the mail through `mailer.py`, so it leaves from
`MAIL_FROM` with our template (`emails.py`).

- **Verification** is an Ed25519 detached JWS (`X-Neon-Signature`,
  `X-Neon-Signature-Kid`, `X-Neon-Timestamp`) checked against the Neon Auth JWKS;
  deliveries older than 5 minutes and replays of the same event id are rejected.
  Raw-body handling matters — never re-serialize before verifying.
- **No transport configured → `503`; a transport failure → `502`** (auth,
  connection, provider rejection), so a code is never silently dropped and never
  surfaces as an unhandled 500. Both are 5xx on purpose: Neon retries the same
  event id, and the dedup keeps a retry from sending a second code.
  Set `RESEND_API_KEY` + `MAIL_FROM` (or `SMTP_*`) before registering the webhook.
- **Smoke-testing delivery:** the caller-side call
  (`POST /email-otp/send-verification-otp`) returns `{"success": true}` even when
  the webhook is unreachable, so check the tunnel/webhook before blaming the
  mailer. See [§14.2](auth-and-tenancy-design.md#142-registering-the-webhook).
- Because the endpoint must be reachable from Neon, local development needs a
  tunnel: `cloudflared tunnel --url http://localhost:8000` (or `ngrok http 8000`),
  then point the webhook at `https://<public-host>/api/v1/auth/webhooks/neon`.
  A quick tunnel gets a **new** hostname on every restart — re-register it.
- Register it per branch in the Console (Project → Settings → Auth → Webhooks) or
  with `neon neon-auth config webhook update`; the MCP server cannot do it.
- **Designing the template:** editable HTML snapshots of every message type live
  in [docs/design/emails/](../../docs/design/emails/README.md) — edit those, then
  port the result back into `emails.py`. Regenerate with
  `cd apps/api && uv run render-email-previews`.
- Full rationale and the exact commands: [auth-and-tenancy-design.md §14](auth-and-tenancy-design.md#14-email-strategy).

## Local development

The API runs as part of the monorepo dev stack — from the repo root, `pnpm dev`
starts web (`:3000`) **and** this API (`:8000`) together via turbo
`apps/api/package.json` runs `uv run api`, which reads `HOST`/`PORT` from `.env`).
To run it in isolation:

```sh
cd apps/api
cp .env.example .env            # then fill in the Neon values
uv sync
uv run alembic upgrade head     # creates/populates the `app` schema
uv run api
```

- Interactive docs: <http://127.0.0.1:8000/docs>.
- Grant the platform-admin flag: `uv run seed-admin admin@example.com`.

## Conventions

- **`neon_auth` is read-only.** It is mapped in `models/external.py` for reads and
  foreign keys, and is excluded from Alembic autogenerate. Never migrate it.
- Migrations are **additive** and target the `app` schema only.
- Static data and schemas stay out of route bodies where practical; keep validation
  close to the endpoint and business rules in `services/`.
