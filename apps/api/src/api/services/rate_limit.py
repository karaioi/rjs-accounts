"""Fixed-window rate limiting, backed by Postgres.

Managed Auth (better-auth) runs its own limiter, but on Neon Auth it is fixed
and per-process. These counters are ours: shared by every API worker and durable
across restarts, and each hit is a single atomic upsert so concurrent requests
cannot race past a limit.

A **bucket** names a feature (`login.verification.start`); the **subject**
identifies the caller (a user id, an email, or a client IP). The hit is counted
*before* the request is served, so blocked attempts keep counting — which is
what makes a limit hold against a brute-force loop.

The counter lives in its own short transaction, independent of the request's
session, so a `429` can never roll the increment back and a successful request
never carries the counter along with its own commit.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Final

from fastapi import HTTPException, status
from sqlalchemy import text

from ..db import SessionLocal

#: One atomic hit. When the window has elapsed the row is recycled in place.
_CONSUME: Final = text(
    """
    insert into app.rate_limit (bucket, subject, window_started_at, hit_count)
    values (:bucket, :subject, now(), 1)
    on conflict (bucket, subject) do update
       set hit_count = case
             when app.rate_limit.window_started_at
                  <= now() - make_interval(secs => :window_seconds)
               then 1
             else app.rate_limit.hit_count + 1
           end,
           window_started_at = case
             when app.rate_limit.window_started_at
                  <= now() - make_interval(secs => :window_seconds)
               then now()
             else app.rate_limit.window_started_at
           end
    returning hit_count, window_started_at
    """
)


@dataclass(frozen=True, slots=True)
class RateLimitResult:
    """The outcome of consuming one hit."""

    limit: int
    hits: int
    reset_at: datetime

    @property
    def allowed(self) -> bool:
        return self.hits <= self.limit

    @property
    def remaining(self) -> int:
        return max(0, self.limit - self.hits)

    @property
    def retry_after(self) -> int:
        """Whole seconds until the window resets."""
        seconds = (self.reset_at - datetime.now(UTC)).total_seconds()
        return max(0, math.ceil(seconds))


def consume(
    *,
    bucket: str,
    subject: str,
    limit: int,
    window_seconds: int,
) -> RateLimitResult:
    """Record one hit for `subject` in `bucket`, in its own transaction."""
    with SessionLocal() as session:
        hits, window_started_at = session.execute(
            _CONSUME,
            {"bucket": bucket, "subject": subject, "window_seconds": window_seconds},
        ).one()
        session.commit()

    return RateLimitResult(
        limit=limit,
        hits=hits,
        reset_at=window_started_at + timedelta(seconds=window_seconds),
    )


def enforce(
    *,
    bucket: str,
    subject: str,
    limit: int,
    window_seconds: int,
) -> RateLimitResult:
    """Consume a hit, raising `429` with the usual headers when over the limit."""
    result = consume(
        bucket=bucket, subject=subject, limit=limit, window_seconds=window_seconds
    )
    if not result.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait before trying again.",
            headers={
                "Retry-After": str(result.retry_after),
                "X-RateLimit-Limit": str(result.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(result.reset_at.timestamp())),
            },
        )
    return result
