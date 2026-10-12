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

All five share one shell — the 480px rounded card, the charcoal header with the
wordmark and the three brand marks, and the charcoal footer (`_layout()` in
`emails.py`). Only the heading, the body copy and the code/button block differ
per type.

| File | When it is sent | Subject (sample) |
| --- | --- | --- |
| [`otp-sign-in.html`](otp-sign-in.html) | After the password step of sign-in | `849201 is your RJS Accounts sign-in code` |
| [`otp-verify-email.html`](otp-verify-email.html) | Sign-up email verification | `849201 is your RJS Accounts verification code` |
| [`otp-reset-password.html`](otp-reset-password.html) | Password reset | `849201 is your RJS Accounts password reset code` |
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
It accepts `--app-name`, `--app-url`, `--code`, `--name`, `--to` and `--out` if
you want other sample data or a scratch directory:

```sh
uv run render-email-previews --name "Ada Lovelace" --code "998877" --out /tmp/preview
```

The output is the exact HTML the mailer sends — no watermark — so a preview can
be diffed against the design it came from. That is how a hand-edited file is
checked when it is ported back into `emails.py`.

> Regenerating **overwrites** every file in this folder. If you have been
> hand-editing here, copy your version aside first.

## Hosted assets

The branding images are committed in `apps/web/public/` and mirrored to the
`public-assets` bucket on Neon object storage (branch `production`), which is
**publicly readable** so email clients can fetch them with no credential. The
bucket is declared in [`neon.ts`](../../../neon.ts) — see
[architecture.md § Neon configuration](../../architecture.md#neon-configuration).

Base URL (branch-scoped):

```
https://br-weathered-river-b3chlo58.storage.c-4.ap-southeast-1.aws.neon.tech/public-assets
```

| Key | Source | Rendered size | Notes |
| --- | --- | --- | --- |
| `brand/login-logo-2x.png` | downscaled `login-logo.png` | 360×136, 50 KB | **the header wordmark** — used at `width="90"` |
| `brand/logo-2x.png` | downscaled `logo.png` | 314×320, 108 KB | square mark — spare, display at up to 160px |
| `brand/login-logo.png` | `apps/web/public/login-logo.png` | 1599×606, 563 KB | original wordmark |
| `brand/logo.png` | `apps/web/public/logo.png` | 1039×1059, 1.0 MB | original; too heavy to embed |

The header logo is emitted by `_layout()` from the `LOGO_URL` constant, so a
replacement only has to change that one line:

```html
<img src="https://br-weathered-river-b3chlo58.storage.c-4.ap-southeast-1.aws.neon.tech/public-assets/brand/login-logo-2x.png"
     alt="RJS Accounts" width="90" style="display: block; border: 0;" />
```

Upload or replace an object:

```sh
neon buckets object put public-assets/brand/<name> --file <path> --content-type image/png
```

Two things to keep in mind: the endpoint is **branch-scoped**, so an email must
point at the branch that sends it (production here); and email clients cache
images by URL, so when the logo changes, upload it under a *new* key and repoint
the template rather than overwriting in place.

## Workflow

1. Open a file here (or `index.html` for the palette) and reshape the markup.
2. Keep the shell's shape: nested `<table>`s with inline `style=` on each
   element, plus the single `<style>` block (`_STYLE` in `emails.py`) that
   carries the client resets, the webfont and the mobile media query. No
   flex/grid, and no external stylesheet beyond the Google Fonts `<link>`.
3. Two things deliberately do not render everywhere — check them before relying
   on them:
   - **Webfonts.** Most clients, Gmail included, strip the Google Fonts
     `<link>`, so JetBrains Mono is a progressive enhancement and the monospace
     fallback is what most recipients actually see.
   - **Inline `<svg>`.** Gmail, Outlook and Windows Mail drop it, so the three
     header marks simply do not appear there — the wordmark and the rest of the
     header still do. Rasterising them to PNGs in `public-assets` is the fix if
     they have to be visible on Gmail.
4. When you are happy, the same design is ported back into `emails.py`
   (`_layout()` for the shell, `render_otp_email()` / `render_magic_link_email()`
   for the bodies) and re-rendered to confirm the port matches your file.

The email has its own palette — the app's `globals.css` supplies only the two
brand colours:

| Token | Value | Used for |
| --- | --- | --- |
| page | `#f4f5f7` | page behind the card |
| card | `#ffffff` | the 480px card |
| charcoal | `#1e2025` | header + footer banner |
| ink | `#0f172a` | heading, OTP code |
| body | `#475569` | body copy |
| muted | `#64748b` | expiry + fallback lines |
| brand-green | `#2d803d` | header mark, button |
| brand-blue | `#2b66a9` | header mark, fallback URL |
| bright-green | `#3aa64f` | header mark |

## Related

- [`docs/backend/api.md` § Email](../../backend/api.md#email-otp--branded-templates) —
  how delivery works (Neon Auth webhook → `mailer.py`).
- [`docs/backend/auth-and-tenancy-design.md` § 14](../../backend/auth-and-tenancy-design.md#14-email-strategy) —
  full rationale, transport hardening, webhook registration.
