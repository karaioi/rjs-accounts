"""Fixed-window rate-limit counters.

One row per `(bucket, subject)` pair, recycled in place when its window rolls
over — so the table holds at most one row per caller per feature, not one row
per request.

Deliberately **not** under row-level security: the limiter runs before a tenant
is resolved (and counts anonymous traffic), so it must stay readable regardless
of the session GUCs. The counters carry no tenant data.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Integer, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base

SCHEMA = "app"


class RateLimit(Base):
    """A single rate-limit window for one caller and one feature."""

    __tablename__ = "rate_limit"
    __table_args__ = (
        CheckConstraint("hit_count > 0", name="rate_limit_count_positive"),
        {"schema": SCHEMA},
    )

    #: Feature being limited, e.g. `login.verification.start`.
    bucket: Mapped[str] = mapped_column(Text, primary_key=True)
    #: Who is being limited: a user id, an email, or a client IP.
    subject: Mapped[str] = mapped_column(Text, primary_key=True)
    #: Start of the current window; the row resets when it elapses.
    window_started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    hit_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1")
    )
