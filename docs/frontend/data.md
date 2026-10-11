# Data & content

## Rule

**Keep static content/data out of page files.** Pages are composition only; content lives in `apps/web/lib/data/`.

## Layout

```
apps/web/lib/
├── utils.ts
├── data/
│   ├── consents.ts   # login consent checkboxes
│   └── promo.ts      # login promo content
└── validations/
    └── login.ts      # login form Zod schema (see forms.md)
```

## `lib/data/promo.ts`

Exports:

- `promoFeatures: Feature[]` — the three feature cards (icon, title, description). Types come from `@/components/feature-card` (`Feature` type) — a type-only import, so there's no runtime dependency from data → component.
- `promo` — `{ title, description, features }`, spread into `<PromoPanel {...promo} />` (the page additionally passes a `logo` image node directly to `PromoPanel`).

## `lib/data/consents.ts`

Exports the login form's required consent checkboxes as one source of truth:

- `Consent` — interface: `name` (a key of `LoginValues`, so it can't drift from the schema), `text`, `linkLabel`, `href`, `icon` (`IconSvgElement`).
- `consents` — `as const satisfies readonly Consent[]`; the form maps over it to render a `Checkbox` per row. The `as const` keeps `name` a literal union so it stays assignable to TanStack Form's typed `name` prop.

Adding a consent here without adding it to `loginSchema` (or vice versa) is a type error, because `name` is `keyof LoginValues`.


## Convention for new content

1. Create `<domain>.ts` under `lib/data/` (e.g. `invoices.ts`, `dashboard.ts`).
2. Export typed, immutable const arrays/objects.
3. Pages import from `@/lib/data/<domain>` and pass down — never inline content in `page.tsx`.