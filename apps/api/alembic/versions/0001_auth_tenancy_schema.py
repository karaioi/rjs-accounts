"""Auth & tenancy schema: customer, organization, role, permission, membership.

Additive only. Creates the `app` schema; never touches the managed `neon_auth`
schema. See docs/backend/auth-and-tenancy-design.md.

Revision ID: 0001_auth_tenancy_schema
Revises:
Create Date: 2026-10-11
"""

from __future__ import annotations

from alembic import op

revision = "0001_auth_tenancy_schema"
down_revision = None
branch_labels = None
depends_on = None

# Each statement is executed on its own so multi-statement strings and
# parameter-looking sequences never confuse the driver.
DDL: list[str] = [
    # --- schema + helpers -------------------------------------------------
    """
    create or replace function app.set_updated_at() returns trigger
    language plpgsql as $fn$
    begin
        new.updated_at = now();
        return new;
    end
    $fn$
    """,
    # --- customer ---------------------------------------------------------
    """
    create table app.customer (
        id          uuid primary key default gen_random_uuid(),
        name        text not null,
        slug        text not null unique,
        status      text not null default 'pending',
        created_by  uuid not null references neon_auth."user"(id) on delete restrict,
        approved_by uuid references neon_auth."user"(id) on delete set null,
        approved_at timestamptz,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now(),
        constraint customer_name_not_blank check (length(btrim(name)) > 0),
        constraint customer_slug_lowercase check (slug = lower(slug)),
        constraint customer_status_valid
            check (status in ('pending','active','suspended','archived')),
        constraint customer_active_iff_approved
            check ((status = 'active') = (approved_at is not null))
    )
    """,
    # --- organization -----------------------------------------------------
    """
    create table app.organization (
        id          uuid primary key default gen_random_uuid(),
        customer_id uuid not null references app.customer(id) on delete cascade,
        name        text not null,
        slug        text not null,
        status      text not null default 'pending',
        created_by  uuid not null references neon_auth."user"(id) on delete restrict,
        approved_by uuid references neon_auth."user"(id) on delete set null,
        approved_at timestamptz,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now(),
        constraint organization_customer_slug_key unique (customer_id, slug),
        constraint organization_name_not_blank check (length(btrim(name)) > 0),
        constraint organization_slug_lowercase check (slug = lower(slug)),
        constraint organization_status_valid
            check (status in ('pending','active','suspended','archived')),
        constraint organization_active_iff_approved
            check ((status = 'active') = (approved_at is not null))
    )
    """,
    # --- role / permission / role_permission ------------------------------
    """
    create table app.role (
        slug        text primary key,
        name        text not null,
        description text,
        rank        integer not null unique,
        created_at  timestamptz not null default now()
    )
    """,
    """
    create table app.permission (
        slug        text primary key,
        resource    text not null,
        action      text not null,
        description text,
        created_at  timestamptz not null default now(),
        constraint permission_resource_action_key unique (resource, action),
        constraint permission_slug_shape check (slug = resource || ':' || action)
    )
    """,
    """
    create table app.role_permission (
        role_slug       text not null references app.role(slug) on delete cascade,
        permission_slug text not null references app.permission(slug) on delete cascade,
        created_at      timestamptz not null default now(),
        primary key (role_slug, permission_slug)
    )
    """,
    # --- membership -------------------------------------------------------
    """
    create table app.membership (
        id              uuid primary key default gen_random_uuid(),
        organization_id uuid not null references app.organization(id) on delete cascade,
        user_id         uuid not null references neon_auth."user"(id) on delete cascade,
        role_slug       text not null references app.role(slug) on delete restrict,
        status          text not null default 'active',
        invited_by      uuid references neon_auth."user"(id) on delete set null,
        created_at      timestamptz not null default now(),
        updated_at      timestamptz not null default now(),
        constraint membership_org_user_key unique (organization_id, user_id),
        constraint membership_status_valid
            check (status in ('invited','active','suspended','removed'))
    )
    """,
    # --- user_profile -----------------------------------------------------
    """
    create table app.user_profile (
        user_id              uuid primary key
                             references neon_auth."user"(id) on delete cascade,
        must_change_password boolean not null default true,
        last_seen_at         timestamptz,
        created_at           timestamptz not null default now(),
        updated_at           timestamptz not null default now()
    )
    """,
    # --- login_verification (two-step OTP gate) ---------------------------
    """
    create table app.login_verification (
        id          uuid primary key default gen_random_uuid(),
        user_id     uuid not null references neon_auth."user"(id) on delete cascade,
        session_ref text not null,
        otp_sent_at timestamptz not null default now(),
        verified_at timestamptz,
        expires_at  timestamptz not null,
        constraint login_verification_key unique (user_id, session_ref)
    )
    """,
    # --- audit_log --------------------------------------------------------
    """
    create table app.audit_log (
        id              bigint generated always as identity primary key,
        customer_id     uuid references app.customer(id) on delete set null,
        organization_id uuid references app.organization(id) on delete set null,
        actor_user_id   uuid references neon_auth."user"(id) on delete set null,
        actor_role      text,
        action          text not null,
        entity_type     text not null,
        entity_id       text,
        "before"        jsonb,
        "after"         jsonb,
        ip              inet,
        user_agent      text,
        created_at      timestamptz not null default now()
    )
    """,
    # --- indexes ----------------------------------------------------------
    "create index customer_status_idx on app.customer (status)",
    "create index organization_customer_id_idx on app.organization (customer_id)",
    "create index organization_status_idx on app.organization (status)",
    "create index membership_user_id_idx on app.membership (user_id)",
    "create index membership_org_role_idx on app.membership (organization_id, role_slug)",
    "create index role_permission_role_idx on app.role_permission (role_slug)",
    "create index audit_log_org_created_idx on app.audit_log (organization_id, created_at desc)",
    "create index audit_log_actor_created_idx on app.audit_log (actor_user_id, created_at desc)",
    "create index audit_log_entity_idx on app.audit_log (entity_type, entity_id)",
    # --- updated_at triggers ---------------------------------------------
    """
    create trigger customer_set_updated_at before update on app.customer
    for each row execute function app.set_updated_at()
    """,
    """
    create trigger organization_set_updated_at before update on app.organization
    for each row execute function app.set_updated_at()
    """,
    """
    create trigger membership_set_updated_at before update on app.membership
    for each row execute function app.set_updated_at()
    """,
    """
    create trigger user_profile_set_updated_at before update on app.user_profile
    for each row execute function app.set_updated_at()
    """,
    # --- row level security ----------------------------------------------
    # Inert while the API connects as the table owner (owner bypasses RLS).
    # Enforced once `app_runtime` is used. Fail-closed: an unset GUC denies.
    "alter table app.customer enable row level security",
    "alter table app.organization enable row level security",
    "alter table app.membership enable row level security",
    "alter table app.audit_log enable row level security",
    """
    create policy customer_tenant on app.customer for all
        using (
            current_setting('app.is_platform_admin', true) = 'true'
            or id::text = current_setting('app.customer_id', true)
        )
        with check (
            current_setting('app.is_platform_admin', true) = 'true'
            or id::text = current_setting('app.customer_id', true)
        )
    """,
    """
    create policy organization_tenant on app.organization for all
        using (
            current_setting('app.is_platform_admin', true) = 'true'
            or id::text = current_setting('app.organization_id', true)
            or customer_id::text = current_setting('app.customer_id', true)
        )
        with check (
            current_setting('app.is_platform_admin', true) = 'true'
            or id::text = current_setting('app.organization_id', true)
            or customer_id::text = current_setting('app.customer_id', true)
        )
    """,
    """
    create policy membership_tenant on app.membership for all
        using (
            current_setting('app.is_platform_admin', true) = 'true'
            or organization_id::text = current_setting('app.organization_id', true)
            or user_id::text = current_setting('app.user_id', true)
        )
        with check (
            current_setting('app.is_platform_admin', true) = 'true'
            or organization_id::text = current_setting('app.organization_id', true)
            or user_id::text = current_setting('app.user_id', true)
        )
    """,
    """
    create policy audit_log_tenant on app.audit_log for all
        using (
            current_setting('app.is_platform_admin', true) = 'true'
            or organization_id::text = current_setting('app.organization_id', true)
        )
        with check (
            current_setting('app.is_platform_admin', true) = 'true'
            or organization_id::text = current_setting('app.organization_id', true)
        )
    """,
]

DROP = [
    "drop table if exists app.audit_log",
    "drop table if exists app.login_verification",
    "drop table if exists app.user_profile",
    "drop table if exists app.membership",
    "drop table if exists app.role_permission",
    "drop table if exists app.permission",
    "drop table if exists app.role",
    "drop table if exists app.organization",
    "drop table if exists app.customer",
    "drop function if exists app.set_updated_at()",
]


def upgrade() -> None:
    for statement in DDL:
        op.execute(statement)


def downgrade() -> None:
    for statement in DROP:
        op.execute(statement)
