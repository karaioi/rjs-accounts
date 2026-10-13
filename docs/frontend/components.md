# Components

## App components (`apps/web/components/`)

### `Beams.tsx` — animated beams background (client)

Canvas-based animated background. Exposes `BeamsProps` (extends `HTMLAttributes`): `color`, `beamWidth`, `rotation`, `speed`, `glow`, `waveLength`, `depth`, `sharpness`, `twist`, `fillLight`, `brightness`, `grain`, `variation`, `mouseInteraction`, `mouseStrength`, `fade`, `opacity`, `intro`, `lightMode`, `className`, and more. Wrapped by `PromoPanel`.

### `promo-panel.tsx` — `<PromoPanel />`

The dark animated hero panel (Beams + centered content). Props:

```ts
interface PromoPanelProps extends ComponentPropsWithoutRef<"div"> {
  logo?: ReactNode;      // shown centered above the title (e.g. logo Image)
  title: string;         // h1
  description?: string;  // supporting copy
  features?: Feature[];  // rendered as <FeatureCard /> grid
  beams?: Partial<BeamsProps>;  // override any Beams setting
  className?: string;    // merged via cn (e.g. width)
}
```

Sections render only when provided; `features` defaults to `[]` and the grid is skipped when empty. Client component (`"use client"`) — it staggers its content on mount and drives `FeatureCard`'s hover animations; see [motion.md](motion.md). The server `page.tsx` still passes the `logo` element (an `<Image />`) as a prop.

### `feature-card.tsx` — `<FeatureCard />` + `Feature` type

```ts
export interface Feature {
  icon: IconSvgElement;   // from @hugeicons/core-free-icons
  title: string;
  description: string;
}
```

Glass card (`bg-white/10 backdrop-blur-sm rounded-3xl`) with a brand-blue icon chip. Accepts `feature` + optional `className`. Client component: springs upward with a slight scale on hover and rotates its icon chip (`whileHover`/`whileTap` variants) — see [motion.md](motion.md).

### `auth-shell.tsx` — `<AuthShell />`

Shared split layout for the unauthenticated screens (`/login`, `/sign-up`, `/pending`): `<PromoPanel>` branded panel on the left (`w-[60%]`) and a centered form column on the right (logo + `children`), so every auth screen stays visually identical. Server component.

### `auth-message.tsx` — `<FormMessage />`

Shared inline form feedback used by the auth forms, built on the shadcn `Alert`. `tone="error"` renders `role="alert"` with `variant="destructive"`; `tone="success"` renders `role="status"` in brand-green. Wrapped in `<Reveal variant="fade-in">`.

### `error-dialog.tsx` — `<ErrorDialog />`

Modal (shadcn `Dialog`) that surfaces auth failures. Props: `title`, `message` (also drives visibility — `null` closes), `onClose`. The login and sign-up forms feed it their `error` state and close it on "Try again". Errors are shown here rather than inline so the reason can't be missed; success/status notices still use `<FormMessage />`.

### `otp-field.tsx` — `<OtpField />`

The 6-digit verification-code input, built on the shadcn `InputOTP` (grouped slots with an animated caret). The six slots are split into three pairs (2–2–2) with an `InputOTPSeparator` between them, so the code is easier to read back than one unbroken row. Props: `id`, `name`, `value`, `invalid`, `onChange`, `onBlur` (+ optional `className` applied to the input container). Reused by the login and sign-up OTP steps so both render identical UI.

### `access-summary.tsx` — `<AccessSummary />`

The dashboard's "Your access" card. Server component that takes the `GET /api/v1/me` payload (`MeResponse` from `lib/api/types.ts`) and renders what the API resolved: name/email, **platform role** (label + the raw `platform_role` slug in mono, so the claim can be checked against `neon_auth.user.role`), **account status**, **email verification**, and the caller's **organization memberships** (organization name, `role_slug` badge, status) — or an empty state when there are none. The "Review pending accounts" link renders only for `is_platform_admin`. All labels/tones come from `lib/data/roles.ts`.

### `sign-out-button.tsx` — `<SignOutButton />`

Outline `Button` that ends the session (`authClient.signOut()`) and returns to `/login`. Client component; shows "Signing out…" while the request is in flight. Rendered in the signed-in shell (`app/(application)/layout.tsx`) and on `/pending` — it is the **only** way back to `/login`, because the Proxy hides the sign-in/sign-up pages for as long as a session exists.

### `password-requirements.tsx` — `<PasswordRequirements />`

Live password-strength checklist. Props: `value: string` (+ optional `className`). Renders each rule with a green checkmark (`CheckmarkCircle01Icon`) when satisfied and a muted circle otherwise:

- At least 8 characters
- At least one uppercase / lowercase letter
- At least one number
- At least one special character

Reusable for any password field (login, signup, change password). The rules live here in one place — keep in sync with the shared `passwordSchema` in `lib/validations/password.ts` (both auth forms use it). Client component: each rule's icon pops/cross-fades between circle and checkmark (`AnimatePresence` + `SPRING_POP`).

## shadcn/ui registry components (`apps/web/components/ui/`)

Generated by the shadcn CLI, built on **@base-ui/react**. Includes: `alert`, `badge`, `button`, `card`, `checkbox`, `dialog`, `field`, `input`, `input-group`, `input-otp`, `label`, `select`, `separator`, `sheet`, `table`, `tabs`, `textarea`.

### Adding a new shadcn component

```sh
pnpm dlx shadcn@latest add <component>
```

- The CLI may overwrite existing files (e.g. `button.tsx`, which carries our brand variants): snapshot `components/ui/` first (`--dry-run`/`--diff` show what will change), then restore any pre-existing file that changed. Only the genuinely new file should land.
- The generated output can import icons from `lucide-react`. This project is **HugeIcons only** — swap any generated icon for its `@hugeicons/core-free-icons` equivalent (e.g. `MinusIcon` → `MinusSignIcon`, `XIcon` → `Cancel01Icon`).
- Regulatory a11y lint rules are disabled for this folder via the `biome.json` override; do not move app code here.

## Form components (field, input-group)

Used by the login and sign-up forms — full pattern in [forms.md](forms.md).