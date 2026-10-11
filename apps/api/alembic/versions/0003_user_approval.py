"""Account approval: `user_profile.status` / `approved_by` / `approved_at`.

Self-service sign-up creates an account in `pending`; a platform admin activates
it. Mirrors the `customer` / `organization` status pattern so the same rules and
vocabulary apply to every approvable record.

Additive only; never touches the managed `neon_auth` schema.

Revision ID: 0003_user_approval
Revises: 0002_seed_rbac
Create Date: 2026-10-11
"""

from __future__ import annotations

from alembic import op

revision = "0003_user_approval"
down_revision = "0002_seed_rbac"
branch_labels = None
depends_on = None

DDL: list[str] = [
    "alter table app.user_profile add column status text not null default 'pending'",
    """
    alter table app.user_profile
        add column approved_by uuid references neon_auth."user"(id) on delete set null
    """,
    "alter table app.user_profile add column approved_at timestamptz",
    # Profiles that predate self-signup were created by an administrator on the
    # user's behalf, so they are already approved.
    """
    update app.user_profile
       set status = 'active', approved_at = created_at
     where status <> 'active'
    """,
    """
    alter table app.user_profile add constraint user_profile_status_valid
        check (status in ('pending','active','suspended','rejected'))
    """,
    """
    alter table app.user_profile add constraint user_profile_active_iff_approved
        check ((status = 'active') = (approved_at is not null))
    """,
    "create index user_profile_status_idx on app.user_profile (status)",
]

DROP: list[str] = [
    "drop index if exists app.user_profile_status_idx",
    """
    alter table app.user_profile
        drop constraint if exists user_profile_active_iff_approved
    """,
    """
    alter table app.user_profile
        drop constraint if exists user_profile_status_valid
    """,
    "alter table app.user_profile drop column if exists approved_at",
    "alter table app.user_profile drop column if exists approved_by",
    "alter table app.user_profile drop column if exists status",
]


def upgrade() -> None:
    for statement in DDL:
        op.execute(statement)


def downgrade() -> None:
    for statement in DROP:
        op.execute(statement)
