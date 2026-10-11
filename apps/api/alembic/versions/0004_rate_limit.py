"""Rate limiting: `app.rate_limit` fixed-window counters.

Backs the API-side limits on the sign-in gate and registration. The actual OTP
send/verify calls go to Managed Auth through the web app, so those are limited
in the web auth proxy; this table covers the endpoints FastAPI owns.

Additive only; targets the `app` schema. No grant to `app_runtime` is needed
yet — that role does not exist (see auth-and-tenancy-design.md §17 risk 6); add
one alongside it when the role is created.

Revision ID: 0004_rate_limit
Revises: 0003_user_approval
Create Date: 2026-10-11
"""

from __future__ import annotations

from alembic import op

revision = "0004_rate_limit"
down_revision = "0003_user_approval"
branch_labels = None
depends_on = None

DDL: list[str] = [
    """
    create table app.rate_limit (
        bucket            text not null,
        subject           text not null,
        window_started_at timestamptz not null default now(),
        hit_count         integer not null default 1,
        constraint rate_limit_pkey primary key (bucket, subject),
        constraint rate_limit_count_positive check (hit_count > 0)
    )
    """,
]

DROP: list[str] = [
    "drop table if exists app.rate_limit",
]


def upgrade() -> None:
    for statement in DDL:
        op.execute(statement)


def downgrade() -> None:
    for statement in DROP:
        op.execute(statement)
