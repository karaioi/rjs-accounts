# Data & content

## Rule

**Keep static content/data out of page files.** Pages are composition only; content lives in `apps/web/lib/data/`.

## Layout

```
apps/web/lib/
├── api/
│   └── server.ts     # server-side fetch → FastAPI (attaches bearer token)
├── auth/             # Neon Auth server + browser clients
├── utils.ts
├── data/
│   ├── consents.ts   # shared login/sign-up consent checkboxes
│   └── promo.ts      # login promo content
└── validations/
    ├── password.ts   # shared password schema (see forms.md)
    ├── login.ts      # login form Zod schema
    └── sign-up.ts    # sign-up form Zod schema
```

## `lib/data/promo.ts`

Exports:

- `promoFeatures: Feature[]` — the three feature cards (icon, title, description). Types come from `@/components/feature-card` (`Feature` type) — a type-only import, so there's no runtime dependency from data → component.
- `promo` — `{ title, description, features }`, spread into `<PromoPanel {...promo} />` (the page additionally passes a `logo` image node directly to `PromoPanel`).

## `lib/data/consents.ts`

Exports the consent checkboxes required by **both** `loginSchema` and `signUpSchema` as one source of truth:

- `ConsentField` — `"termsAccepted" | "privacyAccepted"` literal union shared with both schemas.
- `Consent` — interface: `name` (`ConsentField`, so it can't drift from either schema), `text`, `linkLabel`, `href`, `icon` (`IconSvgElement`).
- `consents` — `as const satisfies readonly Consent[]`; the forms map over it to render a `Checkbox` per row. The `as const` keeps `name` a literal union so it stays assignable to TanStack Form's typed `name` prop.

Adding a consent here without adding it to the schemas (or vice versa) is a type error, because `name` is `ConsentField`.


## Convention for new content

1. Create `<domain>.ts` under `lib/data/` (e.g. `invoices.ts`, `dashboard.ts`).
2. Export typed, immutable const arrays/objects.
3. Pages import from `@/lib/data/<domain>` and pass down — never inline content in `page.tsx`.