"""Login-verification lookups (the two-step sign-in gate)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import LoginVerification


def latest_verification(
    session: Session, user_id: uuid.UUID
) -> LoginVerification | None:
    """The most recent verification record for a user.

    Keyed on the user rather than the token: completing the email OTP step makes
    Managed Auth issue a fresh token, so a session id is not stable across the
    two steps. `session_ref` is stored for traceability.
    """
    return session.execute(
        select(LoginVerification)
        .where(LoginVerification.user_id == user_id)
        .order_by(LoginVerification.otp_sent_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def is_verified(row: LoginVerification | None) -> bool:
    """Whether this sign-in has cleared the email OTP step.

    The confirmation stands for the life of the session: the session token's own
    expiry (`exp`, enforced when the JWT is verified) is what ends it, so we do
    not re-impose a second, shorter clock here. `expires_at` bounds only an
    *unconfirmed* attempt — how long the emailed code stays usable — which
    `awaiting_code` reports.
    """
    return bool(row and row.verified_at is not None)


def awaiting_code(
    row: LoginVerification | None, *, now: datetime | None = None
) -> bool:
    """Whether an unconfirmed attempt can still take an emailed code."""
    now = now or datetime.now(UTC)
    return bool(row and row.verified_at is None and row.expires_at >= now)
