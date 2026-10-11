# Backend — apps/api

## Status: skeleton only

`apps/api` is a **FastAPI + uv** stub:

```
apps/api/
├── pyproject.toml
├── uv.lock
├── README.md
└── src/api/__init__.py
```

- **No endpoints exist.**
- **No authentication.** The login page's `onSubmit` is a UI-only stub with a `TODO` pointing at where the auth API call goes once endpoints exist.

## When auth lands

- Wire `login-form.tsx` `onSubmit` to the auth endpoint (replace the current stub).
- Decide policy: enforce the strong password rules (12–64 chars + complexity) at **signup/password-change**, not login. Login should be permissive — verify against the stored hash only.