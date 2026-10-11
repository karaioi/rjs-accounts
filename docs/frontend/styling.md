# Styling (Tailwind CSS v4)

The web app uses **Tailwind CSS v4** via `@tailwindcss/postcss`. Directives live in `apps/web/app/globals.css` and `apps/web/app/shadcn.css` (both imported by `app/layout.tsx`).

## Theme tokens

`@theme inline` in `globals.css` defines design tokens as CSS variables. Custom brand colors:

```css
--color-brand-green: #2d803d;  /* primary actions */
--color-brand-blue:  #2b66a9;  /* accents / links */
```

### Using the brand colors anywhere

Tokens registered under `@theme inline` become Tailwind utilities, usable in any file — including opacity variants:

```tsx
<button className="bg-brand-green text-white hover:bg-brand-green/80">Save</button>
<p className="text-brand-blue">View report</p>
<span className="ring-1 ring-brand-blue/30 bg-brand-blue/15" />
```

Tailwind v4 only emits utilities that are actually used, so absence of a token in the compiled CSS bundle is expected until referenced.

## `cn` helper

Use `import { cn } from "cn"` (workspace dependency, Tailwind-merge compatible) to merge class names. This is what the shadcn components and `FeatureCard`/`PromoPanel` use:

```tsx
className={cn("base classes", className)}
```

It resolves conflicts (last class wins per property), so `className` props can safely override defaults.

## Buttons

`apps/web/components/ui/button.tsx` (base-ui + CVA variants):

- `default` — `bg-brand-green text-white hover:bg-brand-green/80`
- `link` — `text-brand-blue` with blue hover
- `outline`, `secondary`, `ghost`, `destructive` — unchanged neutral/semantic variants

## Notes

- Target the token first; introduce ad-hoc hardcoded colors only when a token genuinely doesn't apply.
- The `@theme inline` block references other CSS vars via `var(--...)`; literal hex values inline fine.
- **Auth / surface cards** use a shared translucent treatment — `rounded-3xl border-black/10 bg-[#fffafa]/70` (auth screens add `shadow-[0_24px_80px_-32px_rgba(8,47,73,0.4)]`): login, sign-up, pending, and the admin queue. Reuse it rather than inventing a new card shadow.
- **Text links** stay quiet until hover: `text-brand-blue underline-offset-4 hover:underline` (never underline by default).