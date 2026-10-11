# rjs-accounts API

FastAPI + SQLAlchemy 2 + Alembic backend for `rjs-accounts`. It verifies Neon
Auth (Managed Better Auth) JWTs, enforces the two-step sign-in gate, and applies
RBAC + multi-tenant scoping over the `app` schema.

See [`docs/backend/api.md`](../../docs/backend/api.md) for the API surface and
[`docs/backend/auth-and-tenancy-design.md`](../../docs/backend/auth-and-tenancy-design.md)
for the design.

## Quick start

```sh
cp .env.example .env    # fill in the Neon values
uv sync
uv run alembic upgrade head
```

Run the API:

```sh
uv run api                                    # from apps/api
pnpm dev                                      # or: from the repo root, starts
                                              #     web (:3000) + api (:8000) together
```

Docs at <http://127.0.0.1:8000/docs>.
