"""Branded transactional email templates.

The OTP and magic-link emails are *ours* (see `routers/auth_webhooks.py`), so
they carry the product's identity rather than a provider's.

The design is authored by hand in `docs/design/emails/` and ported here — that
folder is the design surface, this module is what ships. Every variant (the
three OTP types, the two magic-link types) shares the one shell in `_layout()`:
a 480px rounded card, an ultra-slim charcoal header with the wordmark and three
brand marks, and a charcoal footer.

Palette (kept in step with `docs/design/emails/README.md`):

    page         #f4f5f7   card        #ffffff
    ink          #0f172a   body        #475569   muted  #64748b
    charcoal     #1e2025   (header/footer banner)
    brand-green  #2d803d   brand-blue  #2b66a9   bright-green #3aa64f

The markup is email-safe: nested tables, inline styles, and a small `<style>`
block limited to client resets, the webfont and the mobile media query. Note two
fidelity limits worth knowing before you change anything — most clients strip
external `<link>` webfonts (the monospace fallback is what actually renders in
Gmail), and Gmail/Outlook/Windows Mail drop inline `<svg>`, so the three header
marks simply do not appear there.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from html import escape

BRAND_GREEN = "#2d803d"
BRAND_BLUE = "#2b66a9"
BRIGHT_GREEN = "#3aa64f"
INK = "#0f172a"
BODY_TEXT = "#475569"
MUTED = "#64748b"
CHARCOAL = "#1e2025"
CARD = "#ffffff"
PAGE = "#f4f5f7"

_MONO = "'JetBrains Mono', 'Courier New', Courier, monospace"

# Google Fonts is a progressive enhancement: clients that honour the <link>
# render JetBrains Mono, everyone else falls back to the system monospace stack.
_FONT_LINK = (
    "https://fonts.googleapis.com/css2?"
    "family=JetBrains+Mono:wght@400;500;700&display=swap"
)

# The wordmark, served from the public Neon bucket (see
# docs/design/emails/README.md#hosted-assets). 2x for retina at width="90".
LOGO_URL = (
    "https://br-weathered-river-b3chlo58.storage.c-4.ap-southeast-1.aws.neon.tech"
    "/public-assets/brand/login-logo-2x.png"
)

# Trailing hair-space padding so the preheader does not bleed body copy into the
# client's inbox preview.
_PREHEADER_PAD = "&nbsp;&zwnj;" * 6 + "&nbsp;"


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
    app_url: str | None = None,
) -> Email:
    """Render the verification-code email for a `send.otp` webhook."""
    heading, action, noun = _otp_copy(otp_type)
    label = _type_label(otp_type)
    subject = f"{code} is your {app_name} {noun}"
    greeting = f"Hi {user_name}," if user_name else "Hello,"
    expiry_html, expiry_text = _expiry(expires_at, "OTP code")

    text = (
        f"{heading}\n\n"
        f"{greeting} use this code to {action}:\n\n"
        f"    {_code_display(code)}\n\n"
        f"{expiry_text}\n"
        "If you didn't request this code, you can safely ignore this email.\n"
        f"This code was sent to {to}.\n"
    )

    body = f"""              {_heading(heading)}
              <p class="font-mono" style="margin: 0 0 20px 0; font-family: {_MONO}; font-size: 13px; font-weight: 400; color: {BODY_TEXT}; line-height: 20px;">
                This is a {label} OTP for your <strong>{escape(app_name)}</strong> application. Please do not share this code with anyone.
              </p>

              <!-- SELECTABLE, COPYABLE OTP TEXT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <span class="otp-code-box font-mono" style="font-family: {_MONO}; font-size: 32px; font-weight: 700; color: {INK}; letter-spacing: 10px; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all; display: inline-block;">
                      {escape(_code_display(code))}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- EXPIRATION WARNING -->
              <p class="font-mono" style="margin: 0; font-family: {_MONO}; font-size: 12px; font-weight: 400; color: {MUTED}; line-height: 18px; text-align: center;">
                {expiry_html} If you didn't request this code, you can safely ignore this email.
              </p>"""

    html = _layout(
        app_name=app_name,
        subject=subject,
        preheader=f"Your {app_name} {noun} is inside.",
        body=body,
        app_url=app_url,
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
    app_url: str | None = None,
) -> Email:
    """Render the magic-link (or password-reset link) email."""
    heading, action, noun = _link_copy(link_type)
    label = _type_label(link_type)
    subject = f"Your {app_name} {noun}"
    greeting = f"Hi {user_name}," if user_name else "Hello,"
    expiry_html, expiry_text = _expiry(expires_at, "link")
    safe_link = escape(link_url, quote=True)

    text = (
        f"{heading}\n\n"
        f"{greeting} open this link to {action}:\n\n"
        f"    {link_url}\n\n"
        f"{expiry_text}\n"
        "If you didn't request this link, you can safely ignore this email.\n"
        f"This link was sent to {to}.\n"
    )

    body = f"""              {_heading(heading)}
              <p class="font-mono" style="margin: 0 0 20px 0; font-family: {_MONO}; font-size: 13px; font-weight: 400; color: {BODY_TEXT}; line-height: 20px;">
                This is a {label} link for your <strong>{escape(app_name)}</strong> application. Please do not share this link with anyone.
              </p>

              <!-- CALL TO ACTION -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="{safe_link}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: {BRAND_GREEN}; color: #ffffff; font-family: {_MONO}; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 12px;">
                      {escape(heading)}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback for clients that will not follow the button -->
              <p class="font-mono" style="margin: 0 0 20px 0; font-family: {_MONO}; font-size: 12px; font-weight: 400; color: {MUTED}; line-height: 18px; text-align: center;">
                Or paste this into your browser:<br />
                <span style="color: {BRAND_BLUE}; word-break: break-all;">{escape(link_url)}</span>
              </p>

              <!-- EXPIRATION WARNING -->
              <p class="font-mono" style="margin: 0; font-family: {_MONO}; font-size: 12px; font-weight: 400; color: {MUTED}; line-height: 18px; text-align: center;">
                {expiry_html} If you didn't request this link, you can safely ignore this email.
              </p>"""

    html = _layout(
        app_name=app_name,
        subject=subject,
        preheader=f"Your {app_name} {noun} is inside.",
        body=body,
        app_url=app_url,
    )
    return Email(subject=subject, text=text, html=html)


# --------------------------------------------------------------------------- #
# Layout
# --------------------------------------------------------------------------- #

# The three brand marks in the header. Inline SVG is invisible in Gmail, Outlook
# and Windows Mail; they degrade to nothing, leaving the wordmark.
_HEADER_MARKS = """<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="display: inline-block;">
                      <tr>
                        <!-- SVG 1: Scalloped Flower-Wheel Pattern (Brand Green) -->
                        <td class="svg-gap" valign="middle" style="padding-right: 8px;">
                          <svg class="header-svg-item" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="34" height="34" style="display: block;">
                            <path d="M450 210c-12.9 0-16.4-17.7-4.5-22.6a30 30 0 1 0-23-55.4c-11.9 4.8-21.9-10.2-12.8-19.3a30 30 0 1 0-42.4-42.4c-9.1 9-24.1-1-19.2-12.9a30 30 0 1 0-55.4-23c-5 12-22.7 8.5-22.7-4.4a30 30 0 0 0-60 0c0 12.9-17.7 16.4-22.6 4.5a30 30 0 1 0-55.4 23c4.8 11.9-10.2 22-19.3 12.8a30 30 0 1 0-42.4 42.4c9 9.1-1 24.2-12.9 19.2a30 30 0 1 0-23 55.4c12 5 8.5 22.7-4.4 22.7a30 30 0 1 0 0 60c12.9 0 16.4 17.7 4.5 22.7a30 30 0 1 0 23 55.4c11.8-5 21.9 10.1 12.8 19.2a30 30 0 1 0 42.4 42.4c9.1-9 24.1 1 19.2 12.9a30 30 0 1 0 55.4 23c5-12 22.7-8.5 22.7 4.4a30 30 0 1 0 60 0c0-12.9 17.7-16.4 22.6-4.5a30 30 0 1 0 55.4-23c-4.8-11.8 10.2-21.9 19.3-12.8a30 30 0 1 0 42.4-42.4c-9-9.1 1-24.1 12.8-19.2a30 30 0 1 0 23-55.4c-11.9-5-8.4-22.7 4.5-22.7a30 30 0 1 0 0-60Z" fill="#2d803d"/>
                          </svg>
                        </td>

                        <!-- SVG 2: Pinwheel Flower Pattern (Brand Blue) -->
                        <td class="svg-gap" valign="middle" style="padding-right: 8px;">
                          <svg class="header-svg-item" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="34" height="34" style="display: block;">
                            <path d="m349.4 276.5 54.7 18.2a57.7 57.7 0 1 0 0-109.4l-54.7 18.2a57.4 57.4 0 0 1-27.1 2.4c5.1-7 12-13 20.8-17.5l51.6-25.8a57.7 57.7 0 1 0-77.3-77.3l-25.8 51.6a57.4 57.4 0 0 1-17.5 20.8 57.4 57.4 0 0 1 2.4-27.1l18.2-54.7a57.6 57.6 0 1 0-109.4 0l18.2 54.7a57.4 57.4 0 0 1 2.4 27.1 57.3 57.3 0 0 1-17.5-20.8l-25.8-51.6a57.7 57.7 0 1 0-77.3 77.3l51.5 25.8a57.4 57.4 0 0 1 21 17.5c-8.7 1.4-18 .7-27.2-2.4l-54.7-18.2a57.7 57.7 0 1 0 0 109.4l54.7-18.2a57.4 57.4 0 0 1 27.1-2.4 57.3 57.3 0 0 1-20.8 17.5l-51.6 25.8a57.7 57.7 0 1 0 77.3 77.3l25.8-51.5a57.4 57.4 0 0 1 17.5-21c1.4 8.7.7 18-2.4 27.2l-18.2 54.7a57.7 57.7 0 1 0 109.4 0l-18.2-54.7a57.4 57.4 0 0 1-2.4-27.1c7 5.1 13 12 17.5 20.9l25.8 51.5a57.7 57.7 0 1 0 77.4-77.4l-51.6-25.7a57.4 57.4 0 0 1-21-17.5c8.7-1.4 18-.7 27.2 2.4ZM240 300a60 60 0 1 1 0-120 60 60 0 0 1 0 120Z" fill="#2b66a9"/>
                          </svg>
                        </td>

                        <!-- SVG 3: 4-Point Diamond Star Pattern (Bright Brand Green) -->
                        <td valign="middle">
                          <svg class="header-svg-item" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="34" height="34" style="display: block;">
                            <path d="m320 320 160-80-160-80L240 0l-80 160L0 240l160 80 80 160 80-160z" fill="#3aa64f"/>
                          </svg>
                        </td>
                      </tr>
                    </table>"""

# Client resets, the webfont, and the mobile media query. This is the only CSS
# that is not inlined; everything else lives on the elements themselves.
_STYLE = """    /* Client-specific Resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

    /* Apply JetBrains Mono globally */
    * {
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace !important;
    }

    /* Clean Solid Charcoal Background */
    .banner-bg {
      background-color: #1e2025 !important;
    }

    /* Font Utility Class */
    .font-mono {
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace !important;
    }

    /* Responsive adjustments */
    @media screen and (max-width: 500px) {
      .email-container {
        width: 100% !important;
        border-radius: 0px !important;
      }
      .banner-td {
        padding: 12px 16px !important;
      }
      .content-td {
        padding: 20px 16px !important;
      }
      .footer-td {
        padding: 12px 16px !important;
      }
      .otp-code-box {
        font-size: 26px !important;
        letter-spacing: 6px !important;
      }
      .logo {
        max-width: 80px !important;
      }
      .heading {
        font-size: 20px !important;
        line-height: 26px !important;
      }
      .header-svg-item {
        width: 26px !important;
        height: 26px !important;
      }
      .svg-gap {
        padding-right: 6px !important;
      }
    }"""


def _layout(
    *,
    app_name: str,
    subject: str,
    preheader: str,
    body: str,
    app_url: str | None = None,
) -> str:
    """Wrap a message `body` in the shared branded shell."""
    logo = (
        f'<img src="{LOGO_URL}" alt="{escape(app_name, quote=True)}" width="90" '
        'class="logo" style="display: block; font-family: \'JetBrains Mono\', '
        "'Courier New', monospace; font-size: 14px; font-weight: bold; "
        'color: #ffffff; border: 0;" />'
    )
    # The logo links home when the front-end URL is known; without it the mark
    # still renders, just unlinked.
    logo_block = (
        f'<a href="{escape(app_url, quote=True)}" target="_blank" '
        f'style="text-decoration: none; display: block;">\n                      {logo}\n                    </a>'
        if app_url
        else logo
    )

    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>{escape(subject)}</title>
  
  <!-- Import JetBrains Mono via Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="{_FONT_LINK}" rel="stylesheet">

  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style type="text/css">
{_STYLE}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: {PAGE}; font-family: 'JetBrains Mono', 'Courier New', monospace;">

  <!-- Hidden Preheader Text -->
  <div style="display: none; font-size: 1px; color: {PAGE}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    {escape(preheader)} {_PREHEADER_PAD}
  </div>

  <!-- Main Wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: {PAGE};">
    <tr>
      <td align="center" style="padding: 30px 10px;">
        
        <!-- Compact Container (480px width) with 24px Rounded Corners -->
        <table class="email-container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="480" style="background-color: {CARD}; border-radius: 24px; overflow: hidden; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);">
          
          <!-- ULTRA-SLIM CHARCOAL HEADER BANNER -->
          <tr>
            <td class="banner-td banner-bg" align="left" valign="middle" style="padding: 16px 24px; background-color: {CHARCOAL}; position: relative;">
              
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:480px;height:56px;background-color:{CHARCOAL};">
                <v:textbox inset="24,12,0,0">
              <![endif]-->
              
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <!-- Logo on Left -->
                  <td align="left" valign="middle">
                    {logo_block}
                  </td>
                  
                  <!-- Tightly Spaced SVGs on Right -->
                  <td align="right" valign="middle">
                    {_HEADER_MARKS}
                  </td>
                </tr>
              </table>

              <!--[if gte mso 9]>
                </v:textbox>
              </v:rect>
              <![endif]-->

            </td>
          </tr>

          <!-- BODY SECTION -->
          <tr>
            <td class="content-td" align="left" style="padding: 28px 28px 24px 28px; background-color: {CARD};">
{body}

            </td>
          </tr>

          <!-- ULTRA-SLIM CHARCOAL FOOTER BANNER -->
          <tr>
            <td class="footer-td banner-bg" align="center" valign="middle" style="padding: 14px 24px; background-color: {CHARCOAL}; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
              
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:480px;height:40px;background-color:{CHARCOAL};">
                <v:textbox inset="0,10,0,10">
              <![endif]-->

              <!-- FOOTER COPYRIGHT TEXT -->
              <p class="font-mono" style="margin: 0; font-family: {_MONO}; font-size: 11px; font-weight: 400; color: #ffffff; opacity: 0.85; line-height: 14px; text-align: center;">
                &copy; {datetime.now(UTC).year} {escape(app_name)}. All rights reserved.
              </p>

              <!--[if gte mso 9]>
                </v:textbox>
              </v:rect>
              <![endif]-->

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
"""


# --------------------------------------------------------------------------- #
# Copy + formatting helpers
# --------------------------------------------------------------------------- #


def _heading(text: str) -> str:
    """The one `<h1>` every message leads with."""
    return (
        f'<h1 class="heading font-mono" style="margin: 0 0 10px 0; '
        f"font-family: {_MONO}; font-size: 21px; font-weight: 700; color: {INK}; "
        f'line-height: 26px; letter-spacing: -0.03em;">\n'
        f"                {escape(text)}\n"
        "              </h1>"
    )


def _otp_copy(otp_type: str) -> tuple[str, str, str]:
    """Return `(heading, action, noun)` for an OTP type."""
    if otp_type == "email-verification":
        return (
            "Verify Your Email Address",
            "verify your email address",
            "verification code",
        )
    if otp_type == "forget-password":
        return "Reset Your Password", "reset your password", "password reset code"
    return "Sign In to Your Account", "sign in", "sign-in code"


def _link_copy(link_type: str) -> tuple[str, str, str]:
    """Return `(heading, action, noun)` for a magic-link type."""
    if link_type == "email-verification":
        return (
            "Verify Your Email Address",
            "verify your email address",
            "verification link",
        )
    if link_type == "forget-password":
        return "Reset Your Password", "reset your password", "password reset link"
    return "Sign In to Your Account", "sign in", "sign-in link"


def _type_label(otp_type: str) -> str:
    """The adjective used in the body copy, e.g. `verification` in "a verification OTP"."""
    if otp_type == "email-verification":
        return "verification"
    if otp_type == "forget-password":
        return "password reset"
    return "sign-in"


def _code_display(code: str) -> str:
    """Format the code the way the email shows it: digits only, `849201`.

    Managed Auth issues the code as `849-201`; the email drops the separator so
    the code matches the six-digit field the sign-in form asks for and what the
    user types (or copies) is never rejected for the hyphen.
    """
    digits = "".join(character for character in code if character.isdigit())
    return digits or code


def _expiry(expires_at: str | None, noun: str) -> tuple[str, str]:
    """Return the expiry sentence as `(html, plain_text)`."""
    minutes = _minutes_left(expires_at)
    if minutes is None:
        return (f"This {noun} will expire shortly.",) * 2
    unit = "minute" if minutes == 1 else "minutes"
    return (
        f"This {noun} will expire in <strong>{minutes} {unit}</strong>.",
        f"This {noun} will expire in {minutes} {unit}.",
    )


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
