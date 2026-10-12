"""Render the transactional email templates to editable HTML files.

The templates in `api.emails` are built as Python strings, which is awkward to
design against. This script renders each message type with realistic sample
data into `docs/design/emails/*.html`, so the markup can be opened in a browser
and reshaped by hand. Those files are a design surface, not a runtime asset:
once the design settles, `emails.py` is updated to match and the files are
re-rendered.

The output is the exact HTML the mailer would send — no watermark or wrapper —
so a preview can be diffed against the design it came from.

Usage:
    uv run render-email-previews
    uv run render-email-previews --name "Ada Lovelace" --out /tmp/preview
"""

from __future__ import annotations

import argparse
import pathlib
from datetime import UTC, datetime, timedelta

from ..emails import Email, render_magic_link_email, render_otp_email


def _repo_root() -> pathlib.Path:
    """Walk up to the workspace root (the directory holding pnpm-workspace.yaml)."""
    for parent in pathlib.Path(__file__).resolve().parents:
        if (parent / "pnpm-workspace.yaml").is_file():
            return parent
    raise RuntimeError("Could not locate the repository root.")


def _previews(
    *,
    app_name: str,
    code: str,
    to: str,
    name: str,
    app_url: str | None,
) -> dict[str, Email]:
    expires_at = (datetime.now(UTC) + timedelta(minutes=10)).isoformat()
    link = "https://app.rjsaccounts.com/auth/verify"

    def otp(otp_type: str) -> Email:
        return render_otp_email(
            app_name=app_name,
            code=code,
            otp_type=otp_type,
            to=to,
            user_name=name,
            expires_at=expires_at,
            app_url=app_url,
        )

    def link_email(link_type: str) -> Email:
        return render_magic_link_email(
            app_name=app_name,
            link_url=f"{link}?token=sample-{link_type or 'sign-in'}",
            link_type=link_type,
            to=to,
            user_name=name,
            expires_at=expires_at,
            app_url=app_url,
        )

    return {
        "otp-sign-in.html": otp("sign-in"),
        "otp-verify-email.html": otp("email-verification"),
        "otp-reset-password.html": otp("forget-password"),
        "magic-link-sign-in.html": link_email("sign-in"),
        "magic-link-reset-password.html": link_email("forget-password"),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app-name", default="RJS Accounts")
    parser.add_argument("--app-url", default="https://app.rjsaccounts.com")
    parser.add_argument("--code", default="849201", help="Sample OTP code")
    parser.add_argument("--to", default="you@example.com", help="Sample recipient")
    parser.add_argument("--name", default="Sridhar", help="Sample recipient name")
    parser.add_argument(
        "--out",
        type=pathlib.Path,
        default=None,
        help="Output directory (default: docs/design/emails)",
    )
    args = parser.parse_args(argv)

    out = args.out or (_repo_root() / "docs" / "design" / "emails")
    out.mkdir(parents=True, exist_ok=True)

    previews = _previews(
        app_name=args.app_name,
        code=args.code,
        to=args.to,
        name=args.name,
        app_url=args.app_url or None,
    )
    for filename, message in previews.items():
        path = out / filename
        path.write_text(message.html, encoding="utf-8")
        print(f"wrote {path}")
        print(f"      subject: {message.subject}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
