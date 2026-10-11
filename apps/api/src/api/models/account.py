"""Models that extend or track a managed user's account state."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base

SCHEMA = "app"

#: Statuses an account can be in. Only `active` may read data.
ACCOUNT_STATUSES = ("pending", "active", "suspended", "rejected")


class UserProfile(Base):
    """1:1 extension of `neon_auth.user`.

    We cannot add columns to the managed user table, so first-login state and
    the account-approval decision live here, keyed by the same `user_id`.

    A missing row means `pending`: self-service sign-up creates the row in that
    state, and a platform admin activates it. Platform admins bypass the check.
    """

    __tablename__ = "user_profile"
    __table_args__ = (
        CheckConstraint(
            "status in ('pending','active','suspended','rejected')",
            name="user_profile_status_valid",
        ),
        CheckConstraint(
            "(status = 'active') = (approved_at is not null)",
            name="user_profile_active_iff_approved",
        ),
        {"schema": SCHEMA},
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("neon_auth.user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'pending'")
    )
    must_change_password: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("neon_auth.user.id", ondelete="SET NULL")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )


class LoginVerification(Base):
    """Two-step sign-in state: password verified, OTP still pending.

    Managed Better Auth has no native MFA, so this row is the gate that keeps a
    freshly-issued session from reading data until the email OTP is confirmed.
    See docs/backend/auth-and-tenancy-design.md §13.2.
    """

    __tablename__ = "login_verification"
    __table_args__ = (
        UniqueConstraint("user_id", "session_ref", name="login_verification_key"),
        {"schema": SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("neon_auth.user.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_ref: Mapped[str] = mapped_column(Text, nullable=False)
    otp_sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
