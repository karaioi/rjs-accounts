"""Grant or revoke the platform-admin role.

The platform admin lives outside the tenancy model: it is the
`neon_auth.user.role = 'admin'` flag, which bypasses tenant scoping. There is no
self-service path to it -- an operator runs this script.

Usage:
    uv run seed-admin admin@example.com
    uv run seed-admin admin@example.com --revoke
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import func, select, update

from ..db import SessionLocal
from ..models import neon_auth_user


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Grant or revoke platform admin.")
    parser.add_argument("email", help="Email of an existing user")
    parser.add_argument(
        "--revoke",
        action="store_true",
        help="Remove admin instead of granting it",
    )
    args = parser.parse_args(argv)

    email = args.email.strip().lower()

    with SessionLocal() as session:
        row = session.execute(
            select(neon_auth_user.c.id, neon_auth_user.c.role).where(
                func.lower(neon_auth_user.c.email) == email
            )
        ).first()
        if row is None:
            print(f"No user found with email {email!r}.", file=sys.stderr)
            return 1

        new_role = "user" if args.revoke else "admin"
        session.execute(
            update(neon_auth_user)
            .where(neon_auth_user.c.id == row.id)
            .values(role=new_role)
        )
        session.commit()
        print(f"{email}: role {row.role or '(unset)'} -> {new_role}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
