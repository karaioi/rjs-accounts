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
│       └── 0003_user_approval.py
├── .env.example
├── pyproject.toml
└── src/api/
    ├── main.py                    # FastAPI app + routers
    ├── config.py                  # pydantic-settings
    ├── db.py                      # engine, sessions, RLS GUCs
    ├── schemas.py                 # request/response models
    ├── mailer.py                  # provider-agnostic SMTP
    ├── auth/                      # JWT verification + RBAC dependencies
    ├── models/                    # `app` tables + read-only neon_auth mapping
    ├── routers/                   # me, reference, auth_gate, registration,
    │                              #   users, customers, organizations,
    │                              #   members, audit
    ├── services/                  # permissions, audit, verification
    └── scripts/seed_admin.py
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

All routes are under `/api/v1` and require `Authorization: Bearer <JWT>`.

| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/me` | authenticated | identity, platform role, `account_status`, memberships, gate state |
| `GET` | `/auth/login/verification` | authenticated | current sign-in gate state |
| `POST` | `/auth/login/verification/start` | authenticated | record that an OTP was requested |
| `POST` | `/auth/login/verification/complete` | authenticated | confirm the OTP step |
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

Every route except `/me`, `/auth/register`, and the `auth/login/verification`
routes requires the sign-in gate to be satisfied — a password-only session gets
`403 {"detail": "Email verification required"}` (header
`X-Login-Verification: required`). The gate additionally requires the account to
be `active`; a pending/rejected/suspended account gets
`403 {"detail": "Your account is awaiting administrator approval"}` (header
`X-Account-Status: pending`). Platform admins must pass the OTP gate but skip the
approval check.

## Local development

The API runs as part of the monorepo dev stack — from the repo root, `pnpm dev`
starts web (`:3000`) **and** this API (`:8000`) together via turbo
(`apps/api/package.json` runs `uv run uvicorn api.main:app --reload`). To run it
in isolation:

```sh
cd apps/api
cp .env.example .env            # then fill in the Neon values
uv sync
uv run alembic upgrade head     # creates/populates the `app` schema
uv run uvicorn api.main:app --reload
```

- Interactive docs: <http://127.0.0.1:8000/docs>.
- Grant the platform-admin flag: `uv run seed-admin admin@example.com`.

## Conventions

- **`neon_auth` is read-only.** It is mapped in `models/external.py` for reads and
  foreign keys, and is excluded from Alembic autogenerate. Never migrate it.
- Migrations are **additive** and target the `app` schema only.
- Static data and schemas stay out of route bodies where practical; keep validation
  close to the endpoint and business rules in `services/`.
