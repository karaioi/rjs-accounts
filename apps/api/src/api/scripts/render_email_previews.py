"""Render the transactional email templates to editable HTML files.

The templates in `api.emails` are built as Python strings, which is awkward to
design against. This script renders each message type with realistic sample
data into `docs/design/emails/*.html`, so the markup can be opened in a browser
and reshaped by hand. Those files are a design surface, not a runtime asset:
once the design settles, `emails.py` is updated to match and the files are
re-rendered.

Usage:
    uv run render-email-previews
    uv run render-email-previews --name "Ada Lovelace" --out /tmp/preview
"""

from __future__ import annotations

import argparse
import pathlib
import sys
from datetime import UTC, datetime, timedelta

from ..emails import Email, render_magic_link_email, render_otp_email

BANNER = """<!--
  DESIGN SNAPSHOT - not shipped at runtime.
  Rendered from apps/api/src/api/emails.py by:
      uv run render-email-previews
  Edit the markup below freely. When the design settles, emails.py is what
  gets updated to match, then this file is re-rendered.
-->
"""


def _repo_root() -> pathlib.Path:
    """Walk up to the workspace root (the directory holding pnpm-workspace.yaml)."""
    for parent in pathlib.Path(__file__).resolve().parents:
        if (parent / "pnpm-workspace.yaml").is_file():
            return parent
    raise RuntimeError("Could not locate the repository root.")


def _previews(*, app_name: str, code: str, to: str, name: str) -> dict[str, Email]:
    expires_at = (datetime.now(UTC) + timedelta(minutes=5)).isoformat()
    link = f"https://{app_name.split()[0].lower()}.example.com/api/auth/verify"
    return {
        "otp-sign-in.html": render_otp_email(
            app_name=app_name,
            code=code,
            otp_type="sign-in",
            to=to,
            user_name=name,
            expires_at=expires_at,
        ),
        "otp-verify-email.html": render_otp_email(
            app_name=app_name,
            code=code,
            otp_type="email-verification",
            to=to,
            user_name=name,
            expires_at=expires_at,
        ),
        "otp-reset-password.html": render_otp_email(
            app_name=app_name,
            code=code,
            otp_type="forget-password",
            to=to,
            user_name=name,
            expires_at=expires_at,
        ),
        "magic-link-sign-in.html": render_magic_link_email(
            app_name=app_name,
            link_url=f"{link}?token=demo-sign-in",
            link_type="sign-in",
            to=to,
            user_name=name,
            expires_at=expires_at,
        ),
        "magic-link-reset-password.html": render_magic_link_email(
            app_name=app_name,
            link_url=f"{link}?token=demo-reset",
            link_type="forget-password",
            to=to,
            user_name=name,
            expires_at=expires_at,
        ),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app-name", default="RJS Accounts")
    parser.add_argument("--code", default="123456", help="Sample OTP code")
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

    for filename, message in _previews(
        app_name=args.app_name, code=args.code, to=args.to, name=args.name
    ).items():
        path = out / filename
        path.write_text(f"{BANNER}\n{message.html}", encoding="utf-8")
        print(f"wrote {path}")
        print(f"      subject: {message.subject}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
