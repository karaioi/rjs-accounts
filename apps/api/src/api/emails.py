"""Branded transactional email templates.

The OTP and magic-link emails are *ours* (see `routers/auth_webhooks.py`), so
they carry the product's identity rather than a provider's. The markup is
deliberately old-fashioned — nested tables and inline styles only, no classes,
no external CSS, no flex/grid — because that is what renders reliably in Gmail,
Outlook and Apple Mail.

The palette mirrors the app (`apps/web/app/globals.css`): brand-green `#2d803d`
and brand-blue `#2b66a9`, on the same near-white card tint the auth screens use
(`#fffafa`) over a light page.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from html import escape

BRAND_GREEN = "#2d803d"
BRAND_BLUE = "#2b66a9"
INK = "#0b0f14"
MUTED = "#5b6470"
FAINT = "#8a929c"
HAIRLINE = "rgba(11, 15, 20, 0.10)"
CARD = "#fffafa"
PAGE = "#eef0f3"

_SANS = (
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
)
_MONO = (
    "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace"
)


@dataclass(frozen=True)
class Email:
    """A rendered message: both bodies are always produced."""

    subject: str
    text: str
    html: str


def render_otp_email(
    *,
    app_name: str,
    code: str,
    otp_type: str,
    to: str,
    user_name: str | None = None,
    expires_at: str | None = None,
) -> Email:
    """Render the verification-code email for a `send.otp` webhook."""
    heading, action, noun = _otp_copy(otp_type)
    subject = f"{code} is your {app_name} {noun}"
    greeting = f"Hi {user_name}," if user_name else "Hello,"
    expiry_note = _expiry_note(expires_at)
    pairs = _pairs(code)

    text = (
        f"{heading}\n\n"
        f"{greeting} use this code to {action}:\n\n"
        f"    {' '.join(pairs)}\n\n"
        f"{expiry_note}\n"
        "If you didn't request this, you can ignore this email.\n"
    )

    body = f"""
            <h1 style="margin:0 0 12px;font-family:{_SANS};font-size:24px;line-height:1.3;font-weight:700;letter-spacing:-0.3px;color:{INK};">
              {escape(heading)}
            </h1>
            <p style="margin:0 0 28px;font-family:{_SANS};font-size:15px;line-height:1.65;color:{MUTED};">
              {escape(greeting)} use this code to {escape(action)}.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
              <tr>
                <td align="center" style="padding:24px 16px;background:#ffffff;border:1px solid {HAIRLINE};border-radius:14px;">
                  <div style="font-family:{_MONO};font-size:34px;line-height:1;font-weight:700;letter-spacing:4px;color:{INK};">{_code_html(pairs)}</div>
                </td>
              </tr>
            </table>
        """
    html = _layout(
        app_name=app_name,
        subject=subject,
        body=body,
        footnote=(
            f"{expiry_note} If you didn't request this, you can safely ignore "
            "this email."
        ),
        to=to,
    )
    return Email(subject=subject, text=text, html=html)


def render_magic_link_email(
    *,
    app_name: str,
    link_url: str,
    link_type: str,
    to: str,
    user_name: str | None = None,
    expires_at: str | None = None,
) -> Email:
    """Render the link email for a `send.magic_link` webhook."""
    heading, action, noun = _link_copy(link_type)
    subject = f"Your {app_name} {noun}"
    greeting = f"Hi {user_name}," if user_name else "Hello,"
    expiry_note = _expiry_note(expires_at)

    text = (
        f"{heading}\n\n"
        f"{greeting} open this link to {action}:\n\n"
        f"    {link_url}\n\n"
        f"{expiry_note}\n"
    )
    html = _layout(
        app_name=app_name,
        subject=subject,
        body=f"""
            <h1 style="margin:0 0 12px;font:700 24px/1.3 {_SANS};color:{INK};">{escape(heading)}</h1>
            <p style="margin:0 0 24px;font:400 15px/1.65 {_SANS};color:{MUTED};">{escape(greeting)} use the button below to {escape(action)}.</p>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="border-radius:12px;background:{BRAND_GREEN};">
                <a href="{escape(link_url, quote=True)}" style="display:inline-block;padding:14px 24px;font:600 15px/1 {_SANS};color:#ffffff;text-decoration:none;border-radius:12px;">{escape(heading)}</a>
              </td>
            </tr></table>
            <p style="margin:20px 0 0;font:400 12px/1.6 {_SANS};color:{FAINT};">Or paste this into your browser:<br><span style="color:{BRAND_BLUE};word-break:break-all;">{escape(link_url)}</span></p>
        """,
        footnote=expiry_note,
        to=to,
    )
    return Email(subject=subject, text=text, html=html)


# --------------------------------------------------------------------------- #
# Copy + formatting helpers
# --------------------------------------------------------------------------- #


def _otp_copy(otp_type: str) -> tuple[str, str, str]:
    """Return `(heading, action, noun)` for an OTP type."""
    if otp_type == "email-verification":
        return (
            "Verify your email address",
            "verify your email address",
            "verification code",
        )
    if otp_type == "forget-password":
        return "Reset your password", "reset your password", "password reset code"
    return "Sign in to your account", "sign in", "sign-in code"


def _link_copy(link_type: str) -> tuple[str, str, str]:
    """Return `(heading, action, noun)` for a magic-link type."""
    if link_type == "email-verification":
        return (
            "Verify your email address",
            "verify your email address",
            "verification link",
        )
    if link_type == "forget-password":
        return "Reset your password", "reset your password", "password reset link"
    return "Sign in to your account", "sign in", "sign-in link"


def _pairs(code: str) -> list[str]:
    """Split the code into the same 2–2–2 pairs the app's OTP input shows."""
    return [code[index : index + 2] for index in range(0, len(code), 2)]


def _code_html(pairs: list[str]) -> str:
    separator = (
        f'<span style="color:#c9ced6;font-weight:400;">'
        "&nbsp;&nbsp;&ndash;&nbsp;&nbsp;</span>"
    )
    return separator.join(escape(pair) for pair in pairs)


def _expiry_note(expires_at: str | None) -> str:
    minutes = _minutes_left(expires_at)
    if minutes is None:
        return "This code expires shortly."
    if minutes <= 1:
        return "This code expires in less than a minute."
    return f"This code expires in {minutes} minutes."


def _minutes_left(expires_at: str | None) -> int | None:
    if not expires_at:
        return None
    try:
        when = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    except ValueError:
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=UTC)
    return max(1, round((when - datetime.now(UTC)).total_seconds() / 60))


def _layout(
    *, app_name: str, subject: str, body: str, footnote: str, to: str
) -> str:
    """Wrap message `body` in the shared branded shell."""
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>{escape(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:{PAGE};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(subject)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PAGE};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:{CARD};border:1px solid {HAIRLINE};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="height:4px;line-height:4px;font-size:0;background:{BRAND_GREEN};background-image:linear-gradient(90deg,{BRAND_GREEN} 0%,{BRAND_BLUE} 100%);">&nbsp;</td>
            </tr>
            <tr>
              <td style="background:#000000;padding:26px 32px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:{BRAND_BLUE};vertical-align:middle;margin-right:10px;">&nbsp;</span>
                <span style="font:700 17px/1 {_SANS};color:#ffffff;letter-spacing:-0.2px;vertical-align:middle;">{escape(app_name)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 28px;">{body}</td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <div style="height:1px;line-height:1px;font-size:0;background:{HAIRLINE};">&nbsp;</div>
                <p style="margin:16px 0 0;font:400 12px/1.6 {_SANS};color:{FAINT};">{escape(footnote)}</p>
                <p style="margin:6px 0 0;font:400 12px/1.6 {_SANS};color:{FAINT};">Sent to {escape(to)} by {escape(app_name)}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
