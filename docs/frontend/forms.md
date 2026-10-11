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
  validators: { onBlur: schema, onSubmit: schema },
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
- **Validation timing**: `onBlur` + `onSubmit`. `TanStack Form v1.33` marks all fields touched on submit, so `isTouched && !isValid` displays errors on submit too.
- **`aria-invalid` + `data-invalid`** on the field (`Field data-invalid`, input `aria-invalid`) for a11y + styling.
- **Submit button** uses `form.Subscribe` on `isSubmitting` for loading UI (ready for backend integration).
- Standard Schema issues carry `{ message }` so `FieldError errors={field.state.meta.errors}` maps to readable text; multiple failures render as a list.

## Password policy (login form)

`z.string()` → min 12 / max 64 chars, must include at least one uppercase, one lowercase, one number, and one special character (`/[^A-Za-z0-9]/`).

## Status

**UI-only.** `onSubmit` is a stub with a `TODO` for the authentication API call (no fake submit, no toasts/redirects). Note for later: strong-password rules belong on signup/password-change; login should likely stay permissive when the real backend lands.