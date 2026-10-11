# Motion & animation

The app animates with [`motion`](https://motion.dev) (the `motion/react` package, v14+). Animation is treated as part of the design system: shared easing, durations, and variants live in one place so everything feels like the same product.

## Setup

- `motion` is a dependency of `apps/web`.
- `apps/web/components/motion/motion-provider.tsx` wraps the whole app in `<MotionConfig reducedMotion="user">` — mounted once in `app/layout.tsx`. This makes every transform/opacity animation respect the OS "reduce motion" setting with no per-component work.
- Any component that renders a `motion.*` element must be a client component (`"use client"`).

## Primitives (`apps/web/components/motion/`)

| File | Exports | Use |
| --- | --- | --- |
| `variants.ts` | `EASE_OUT`, `ENTER_TRANSITION`, `SWIFT_TRANSITION`, `SPRING_SOFT`, `SPRING_POP`, `fadeUp`, `fadeIn`, `scaleIn`, `staggerContainer()` | Shared tokens + variant definitions. |
| `reveal.tsx` | `Reveal`, `Stagger`, `StaggerItem`, `RevealVariant` | Entrances. |
| `collapse.tsx` | `Collapse` | Animated show/hide by height (errors, helper text). |
| `motion-provider.tsx` | `MotionProvider` | App-wide `MotionConfig` defaults. |

### `Reveal`

Animates a single element in on mount.

```tsx
<Reveal variant="fade-up" delay={0.12}>…</Reveal>
```

`variant`: `"fade-up" | "fade-in" | "scale-in"` (default `"fade-up"`).

### `Stagger` / `StaggerItem`

For a group of siblings that should animate in sequence. Wrap the group in `Stagger`, each child in `StaggerItem`.

```tsx
<Stagger stagger={0.12} delay={0.1}>
  <StaggerItem>…</StaggerItem>
  <StaggerItem>…</StaggerItem>
</Stagger>
```

- `stagger` = seconds between children; `delay` = seconds before the first.
- Nesting: pass `inherit` to a nested `Stagger` so it follows the outer sequence (it becomes one item of the parent and then staggers its own children). `PromoPanel` uses this so the feature cards stagger *after* the title/description.

### `Collapse`

Animates content in/out by height, so validation errors and the password checklist don't pop the layout.

```tsx
<Collapse show={isInvalid}>
  <FieldError errors={field.state.meta.errors} />
</Collapse>
```

Note: `StaggerItem`/`Stagger` are plain `motion.div`s, so wrapping a flex child in them makes the wrapper the flex item — keep gap/padding classes on the wrapper or the child as before (the promo panel and login form do this deliberately).

## Where it's used

- `PromoPanel` — staggered logo → title → description → feature cards; feature cards have a spring hover-lift and a rotating icon chip (`FeatureCard`).
- `login-form.tsx` — card `scale-in`, each field fades up with a small delay, the eye toggle and password-rule checks pop with `SPRING_POP`, errors/checklist via `Collapse`, and the submit button has a subtle press/scale.
- `login/page.tsx` — the right-panel logo fades in (`Reveal`); `page.tsx` stays a server component and simply renders the client `Reveal`.
- `PasswordRequirements` — each rule's icon cross-fades/scales between circle and checkmark via `AnimatePresence`.

## Rules of thumb

- Use the shared tokens in `variants.ts`; don't hand-roll easing/durations in components.
- Prefer opacity + small transforms; avoid animating layout properties (width/height/top/left) except through `Collapse`.
- Never animate on every render — entrances run on mount; use `whileHover`/`whileTap` for interaction.
- Keep the entrance short (≤ ~0.6s) and staggers small (≤ ~0.12s).
- Reduced motion is handled globally — don't add `prefers-reduced-motion` checks by hand.

## Verification

- `pnpm lint`, `pnpm --filter web check-types`, `pnpm --filter web build`.
- In the browser, after a reload `document.getAnimations().length` should be non-zero (entrances are running) and settle to `opacity: 1` / `transform: none`. Console should be free of motion warnings.
