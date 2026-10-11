# Data & content

## Rule

**Keep static content/data out of page files.** Pages are composition only; content lives in `apps/web/lib/data/`.

## Layout

```
apps/web/lib/
├── utils.ts
└── data/
    └── promo.ts     # login promo content
```

## `lib/data/promo.ts`

Exports:

- `promoFeatures: Feature[]` — the three feature cards (icon, title, description). Types come from `@/components/feature-card` (`Feature` type) — a type-only import, so there's no runtime dependency from data → component.
- `promo` — `{ title, description, features }`, spread into `<PromoPanel {...promo} />` (the page additionally passes a `logo` image node directly to `PromoPanel`).

## Convention for new content

1. Create `<domain>.ts` under `lib/data/` (e.g. `invoices.ts`, `dashboard.ts`).
2. Export typed, immutable const arrays/objects.
3. Pages import from `@/lib/data/<domain>` and pass down — never inline content in `page.tsx`.