# Forms — TanStack Form + Zod (shadcn docs pattern)

Reference: https://ui.shadcn.com/docs/forms/tanstack-form

The login form (`apps/web/app/(login)/login/login-form.tsx`) implements the shadcn TanStack Form pattern against the registry `field`/`input`/`input-group` components.

## Stack

- `@tanstack/react-form` **1.33.5** — `useForm`, `form.Field` render props, `form.Subscribe`
- `zod` **4.6.5** — Standard Schema compatible, used as validators directly (`z.email(...)`)

## Pattern (copy for new forms)

```tsx
const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(...).regex(...),
});

const form = useForm({
  defaultValues: { email: "", password: "" },
  validators: { onSubmit: schema },
  onSubmit: () => { /* TODO: call API */ },
});

<form id="login-form" noValidate onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
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

- **`noValidate`** on the `<form>` so native `required`/`minLength` never preempt Zod — `FieldError` output drives validation display.
- **Validation timing**: form-level `onSubmit` **only**. On submit, TanStack Form v1.33 marks every field touched, so `isTouched && !isValid` displays each error; a later successful submit clears them.
  - ⚠️ **Do not add a form-level `onBlur` validator alongside `onSubmit`.** In `@tanstack/form-core` 1.33.5 it stores errors under the `blur` key, which `handleSubmit`'s `validateAllFields("submit")` pass cannot clear. Once a submit fails, `isFieldsValid` stays `false`, `handleSubmit` bails before the form-level validation that would clear the errors, and **every subsequent submit keeps showing the stale errors even after the user fixes the fields**. Keep validation at `onSubmit` (per-field validators are the alternative if blur-time feedback is ever needed).
- **`aria-invalid` + `data-invalid`** on the field (`Field data-invalid`, input `aria-invalid`) for a11y + styling.
- **Submit button** uses `form.Subscribe` on `isSubmitting` for loading UI (ready for backend integration).
- Standard Schema issues carry `{ message }` so `FieldError errors={field.state.meta.errors}` maps to readable text; multiple failures render as a list.

## Password policy (login form)

`z.string()` → min 12 / max 64 chars, must include at least one uppercase, one lowercase, one number, and one special character (`/[^A-Za-z0-9]/`).

While the user types, a live checklist (`PasswordRequirements`, see components.md) shows each rule turning **green** as it's satisfied. The red `FieldError` list only appears for the empty-password case; for partial passwords the checklist itself shows what's still missing.

## Consent (login form)

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

The rows are generated from a `consents` array (`name`/`text`/`linkLabel`/`href`/`icon`) so the two are defined in one place. Base UI's `Checkbox` overrides the root `id` with its own generated one but sets the given `id` on its hidden `<input>`, so `FieldLabel htmlFor={field.name}` still resolves correctly.

## Status

**UI-only.** `onSubmit` is a stub with a `TODO` for the authentication API call (no fake submit, no toasts/redirects). Note for later: strong-password rules belong on signup/password-change; login should likely stay permissive when the real backend lands.