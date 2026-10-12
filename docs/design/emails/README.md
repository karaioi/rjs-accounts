# Email design previews

Editable HTML snapshots of the transactional emails in
[`apps/api/src/api/emails.py`](../../../apps/api/src/api/emails.py). They exist so
the email can be designed by hand in a browser instead of by editing Python
strings.

**`emails.py` is the source of truth.** These files are a design surface, not a
runtime asset — nothing imports them and they are not shipped. They are
generated from the real templates with realistic sample data, so what you see is
what a recipient currently gets.

## Files

| File | When it is sent | Subject (sample) |
| --- | --- | --- |
| [`otp-sign-in.html`](otp-sign-in.html) | After the password step of sign-in | `123456 is your RJS Accounts sign-in code` |
| [`otp-verify-email.html`](otp-verify-email.html) | Sign-up email verification | `123456 is your RJS Accounts verification code` |
| [`otp-reset-password.html`](otp-reset-password.html) | Password reset | `123456 is your RJS Accounts password reset code` |
| [`magic-link-sign-in.html`](magic-link-sign-in.html) | Magic-link sign-in | `Your RJS Accounts sign-in link` |
| [`magic-link-reset-password.html`](magic-link-reset-password.html) | Password reset by link | `Your RJS Accounts password reset link` |

Open any file directly in a browser to see it. The `.html` extension is what
makes that work — this folder is deliberately not a Next.js route.

## Regenerating

```sh
cd apps/api
uv run render-email-previews
```

The script lives at
[`apps/api/src/api/scripts/render_email_previews.py`](../../../apps/api/src/api/scripts/render_email_previews.py).
It accepts `--code`, `--name`, `--to`, `--app-name` and `--out` if you want
other sample data or a scratch directory:

```sh
uv run render-email-previews --name "Ada Lovelace" --code "998877" --out /tmp/preview
```

> Regenerating **overwrites** every file in this folder. If you have been
> hand-editing here, copy your version aside first.

## Workflow

1. Open a file here (or `index.html` for the palette) and reshape the markup.
2. Keep it email-safe: **nested `<table>`s and inline `style=` only** — no
   classes, no `<style>` block, no external CSS, no flex/grid. That is what
   renders reliably in Gmail, Outlook and Apple Mail. Preview in more than one
   client before calling it done.
3. When you are happy, the same design is ported back into `emails.py`
   (`_layout()` for the shared shell, `render_otp_email()` /
   `render_magic_link_email()` for the bodies) and re-rendered to confirm it
   matches.

Stay close to the app palette so the email and the product agree — the tokens
mirror [`apps/web/app/globals.css`](../../../apps/web/app/globals.css):

| Token | Value |
| --- | --- |
| Brand green | `#2d803d` |
| Brand blue | `#2b66a9` |
| Ink | `#0b0f14` |
| Muted | `#5b6470` |
| Faint | `#8a929c` |
| Card | `#fffafa` |
| Page | `#eef0f3` |

## Related

- [`docs/backend/api.md` § Email](../../backend/api.md#email-otp--branded-templates) —
  how delivery works (Neon Auth webhook → `mailer.py`).
- [`docs/backend/auth-and-tenancy-design.md` § 14](../../backend/auth-and-tenancy-design.md#14-email-strategy) —
  full rationale, transport hardening, webhook registration.
