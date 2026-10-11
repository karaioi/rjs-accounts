# Forms — TanStack Form + Zod (shadcn docs pattern)

Reference: https://ui.shadcn.com/docs/forms/tanstack-form

The auth forms (`apps/web/app/(login)/login/login-form.tsx` and `.../sign-up/sign-up-form.tsx`) implement the shadcn TanStack Form pattern against the registry `field`/`input`/`input-group`/`checkbox` components.

## Stack

- `@tanstack/react-form` **1.33.5** — `useForm`, `form.Field` render props, `form.Subscribe`
- `zod` **4.6.5** — Standard Schema compatible, used as validators directly (`z.email(...)`)

## Pattern (copy for new forms)

```tsx
// apps/web/lib/validations/<domain>.ts  — schema lives here, not in the component
import * as z from "zod";
export const <domain>Schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(...).regex(...),
});
export type <Domain>Values = z.infer<typeof <domain>Schema>;

// apps/web/app/.../<name>-form.tsx — imports schema + content, no inline data
import { <domain>Schema } from "@/lib/validations/<domain>";

const form = useForm({
  defaultValues: { email: "", password: "" },
  validators: { onSubmit: <domain>Schema },
  // The handler owns the request + `pending`/`error` state — no fake submit,
  // no toasts; failures surface via <ErrorDialog /> (see components.md).
  onSubmit: async ({ value }) => {
    await handleSubmit(value);
  },
});

<form noValidate onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
  <FieldGroup>
    <form.Field name="email">
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>Email</FieldLabel>
            <Input
              id={field.name} name={field.name} type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={isInvalid}
            />
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        );
      }}
    </form.Field>
  </FieldGroup>
</form>
```

## Key conventions

- **Schema + content live outside the component**: the Zod schema is in `apps/web/lib/validations/<domain>.ts` (e.g. `login.ts` and `sign-up.ts`, exporting `loginSchema`/`LoginValues` and `signUpSchema`/`SignUpValues`); static content like the consent rows is in `apps/web/lib/data/<domain>.ts` (see [data.md](data.md)). The form component only imports them — no inline schema or data.
- **`noValidate`** on the `<form>` so native `required`/`minLength` never preempt Zod — `FieldError` output drives validation display.
- **Validation timing**: form-level `onSubmit` **only**. On submit, TanStack Form v1.33 marks every field touched, so `isTouched && !isValid` displays each error; a later successful submit clears them.
  - ⚠️ **Do not add a form-level `onBlur` validator alongside `onSubmit`.** In `@tanstack/form-core` 1.33.5 it stores errors under the `blur` key, which `handleSubmit`'s `validateAllFields("submit")` pass cannot clear. Once a submit fails, `isFieldsValid` stays `false`, `handleSubmit` bails before the form-level validation that would clear the errors, and **every subsequent submit keeps showing the stale errors even after the user fixes the fields**. Keep validation at `onSubmit` (per-field validators are the alternative if blur-time feedback is ever needed).
- **`aria-invalid` + `data-invalid`** on the field (`Field data-invalid`, input `aria-invalid`) for a11y + styling.
- **Submit button** is disabled while a `pending` state is set (before/after the async auth call) and shows an inline `LoaderIcon` spinner while submitting.
- Standard Schema issues carry `{ message }` so `FieldError errors={field.state.meta.errors}` maps to readable text; multiple failures render as a list.
- **Errors from the auth call** (not Zod) open the shared `<ErrorDialog />` (shadcn `Dialog` — see components.md); success/status notices use the inline `<FormMessage tone="success">`. Managed Auth errors go through `describeAuthError` (`lib/auth/errors.ts`), which compares the provider `code` case-insensitively (e.g. the API's `INVALID_EMAIL_OR_PASSWORD` vs the thrown `invalid_credentials`) and maps it to friendly copy, falling back to the provider's own message when the code is unrecognised (e.g. the generic `validation_failed`) so the user always sees the real reason. Never fall back to a bland "something went wrong".
- **Forms are `method="post"`.** React's `onSubmit` calls `preventDefault()`, but if a submit lands before hydration the browser would otherwise fall back to a native GET and leak the email/password into the URL + history. `post` keeps credentials out of the URL.
- **OTP step** uses the shared `<OtpField />` (shadcn `InputOTP`, six slots split 2–2–2 with dividers — see components.md) bound to the `otp` field; its `onChange` strips non-digits and `otpSchema` enforces exactly six.

## Password policy (shared)

`apps/web/lib/validations/password.ts` exports `passwordSchema`: `z.string()` → min 8 / max 64 chars, must include at least one uppercase, one lowercase, one number, and one special character (`/[^A-Za-z0-9]/`). Both `loginSchema` and `signUpSchema` reuse it, so the two can never drift.

While the user types, a live checklist (`PasswordRequirements`, see components.md) shows each rule turning **green** as it's satisfied. Once the field is invalid (touched on blur/submit), the red `FieldError` list replaces the checklist — so a too-short password surfaces a clear "Password must be at least 8 characters." instead of only the muted checklist. Because field state re-validates live, the red list shrinks as rules are fixed and the green checklist returns once every rule passes. The two are mutually exclusive (`value.length > 0 && !isInvalid` vs `isInvalid`), so they never render together.

## Consent (login + sign-up)

Two required checkboxes gate submission — the user must accept **both**:

- `termsAccepted` — "I agree to the [Terms & Conditions]" (`/terms`, `LegalDocument01Icon`)
- `privacyAccepted` — "I have read the [Privacy Policy]" (`/privacy`, `Shield01Icon`)

Each is a `z.boolean().refine((value) => value, "You must accept the ...")` field rendered as a shadcn `Checkbox` inside a `Field`:

```tsx
<Field data-invalid={isInvalid}>
  <div className="flex items-center gap-2.5">
    <Checkbox
      id={field.name} name={field.name}
      checked={field.state.value}
      onCheckedChange={(checked) => field.handleChange(checked === true)}
      onBlur={field.handleBlur}
      aria-invalid={isInvalid}
    />
    <FieldLabel htmlFor={field.name} className="font-normal">
      I agree to the <a href="/terms">Terms & Conditions</a>
    </FieldLabel>
  </div>
  {isInvalid && <FieldError errors={field.state.meta.errors} />}
</Field>
```

The rows are generated from the `consents` array in `apps/web/lib/data/consents.ts` (`name`/`text`/`linkLabel`/`href`/`icon`) so the two are defined in one place, and `name` is typed as the shared `ConsentField = "termsAccepted" | "privacyAccepted"` union so the rows can't drift from either `loginSchema` or `signUpSchema`. Base UI's `Checkbox` overrides the root `id` with its own generated one but sets the given `id` on its hidden `<input>`, so `FieldLabel htmlFor={field.name}` still resolves correctly.

## Status

**Wired to Neon Auth.** `login-form.tsx` signs in with `authClient.signIn.email({ email, password })` then drives the two-step gate: `emailOtp.sendVerificationOtp({ type: "sign-in" })` → user enters the code (`<OtpField />`) → `authClient.signIn.emailOtp(...)`, the app marks the login verified via `/api/verification/complete`, then `/api/backend/me` decides between `/dashboard` (approved) and `/pending` (awaiting approval). `sign-up-form.tsx` does `authClient.signUp.email(...)` → email-verification OTP (`emailOtp.verifyEmail`, `<OtpField />`) → `POST /api/backend/auth/register` to create the `pending` profile. Both keep the UI faithful: no fake submit, no toasts/redirects-on-error — auth errors open `<ErrorDialog />`, with `describeAuthError` turning provider codes into readable copy.

**Auth pages are hidden while signed in.** `apps/web/proxy.ts` (Next 16 middleware) sends a visitor who already holds a session away from `/login` and `/sign-up` to `/dashboard`, and keeps them there until they sign out (`<SignOutButton />` in the signed-in shell). The one exception is the OTP step, which lives on `/login`: while a code is pending the visitor is mid-sign-in, not signed in, so `/login` stays reachable so they can finish. `/pending` is intentionally *not* redirected — an unapproved account belongs there, and it carries its own sign-out.

**Sign-in, sign-up, and OTP calls are rate limited.** The same-origin auth proxy (`app/api/auth/[...path]/route.ts`) limits the Managed Auth calls per client IP and per email before forwarding them (`lib/auth/rate-limit.ts`), and FastAPI limits the gate/registration endpoints it owns ([backend/auth-and-tenancy-design.md §13.5](../backend/auth-and-tenancy-design.md#135-rate-limiting)). A limit hit anywhere returns `429` and shows the same inline `"Too many attempts…"` copy (`TOO_MANY_ATTEMPTS` in `lib/auth/errors.ts`), so the message does not depend on which layer blocked the request.
