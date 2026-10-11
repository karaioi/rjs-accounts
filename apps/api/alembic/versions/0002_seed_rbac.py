"""Seed the fixed roles, the permission catalog, and the role→permission matrix.

See docs/backend/auth-and-tenancy-design.md §8.

Revision ID: 0002_seed_rbac
Revises: 0001_auth_tenancy_schema
Create Date: 2026-10-11
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_seed_rbac"
down_revision = "0001_auth_tenancy_schema"
branch_labels = None
depends_on = None

ROLES: list[tuple[str, str, int]] = [
    ("owner", "Owner", 60),
    ("admin", "Admin", 50),
    ("accountant", "Accountant", 40),
    ("approver", "Approver", 30),
    ("auditor", "Auditor", 20),
    ("viewer", "Viewer", 10),
]

PERMISSIONS: dict[str, list[tuple[str, str]]] = {
    "org": [
        ("read", "View the organization"),
        ("update", "Update organization details"),
        ("delete", "Delete the organization"),
        ("settings", "Manage organization settings"),
    ],
    "member": [
        ("read", "View members"),
        ("invite", "Add members"),
        ("update", "Update member details"),
        ("remove", "Remove members"),
        ("role_manage", "Change member roles"),
    ],
    "account": [
        ("read", "View the chart of accounts"),
        ("create", "Create accounts"),
        ("update", "Update accounts"),
        ("delete", "Delete accounts"),
    ],
    "journal": [
        ("read", "View journal entries"),
        ("create", "Create journal entries"),
        ("update", "Update journal entries"),
        ("delete", "Delete journal entries"),
        ("post", "Post journal entries"),
        ("approve", "Approve journal entries"),
    ],
    "invoice": [
        ("read", "View invoices"),
        ("create", "Create invoices"),
        ("update", "Update invoices"),
        ("delete", "Delete invoices"),
        ("send", "Send invoices"),
        ("approve", "Approve invoices"),
    ],
    "bill": [
        ("read", "View bills"),
        ("create", "Create bills"),
        ("update", "Update bills"),
        ("delete", "Delete bills"),
        ("approve", "Approve bills"),
    ],
    "payment": [
        ("read", "View payments"),
        ("create", "Create payments"),
        ("update", "Update payments"),
        ("approve", "Approve payments"),
    ],
    "party": [
        ("read", "View customers and vendors"),
        ("create", "Create customers and vendors"),
        ("update", "Update customers and vendors"),
        ("delete", "Delete customers and vendors"),
    ],
    "report": [
        ("read", "View reports"),
        ("export", "Export reports"),
    ],
    "audit": [
        ("read", "View the audit log"),
    ],
}


def _all_slugs() -> set[str]:
    return {f"{resource}:{action}" for resource, actions in PERMISSIONS.items() for action, _ in actions}


ALL = _all_slugs()

ASSIGNMENTS: dict[str, set[str]] = {
    "owner": set(ALL),
    "admin": ALL - {"org:delete"},
    "accountant": {
        "org:read",
        "account:read", "account:create", "account:update",
        "journal:read", "journal:create", "journal:update", "journal:post",
        "invoice:read", "invoice:create", "invoice:update", "invoice:send",
        "bill:read", "bill:create", "bill:update",
        "payment:read", "payment:create", "payment:update",
        "party:read", "party:create", "party:update",
        "report:read", "report:export",
    },
    "approver": {
        "org:read",
        "account:read",
        "journal:read", "journal:approve",
        "invoice:read", "invoice:approve",
        "bill:read", "bill:approve",
        "payment:read", "payment:approve",
        "party:read",
        "report:read", "report:export",
    },
    "auditor": {
        "org:read", "member:read",
        "account:read",
        "journal:read",
        "invoice:read",
        "bill:read",
        "payment:read",
        "party:read",
        "report:read", "report:export",
        "audit:read",
    },
    "viewer": {
        "org:read",
        "account:read",
        "journal:read",
        "invoice:read",
        "bill:read",
        "payment:read",
        "party:read",
        "report:read",
    },
}


def upgrade() -> None:
    bind = op.get_bind()

    for slug, name, rank in ROLES:
        bind.execute(
            sa.text(
                "insert into app.role (slug, name, rank) values (:slug, :name, :rank)"
            ),
            {"slug": slug, "name": name, "rank": rank},
        )

    for resource, actions in PERMISSIONS.items():
        for action, description in actions:
            bind.execute(
                sa.text(
                    "insert into app.permission (slug, resource, action, description) "
                    "values (:slug, :resource, :action, :description)"
                ),
                {
                    "slug": f"{resource}:{action}",
                    "resource": resource,
                    "action": action,
                    "description": description,
                },
            )

    for role_slug, slugs in ASSIGNMENTS.items():
        for slug in sorted(slugs):
            bind.execute(
                sa.text(
                    "insert into app.role_permission (role_slug, permission_slug) "
                    "values (:role_slug, :permission_slug)"
                ),
                {"role_slug": role_slug, "permission_slug": slug},
            )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("delete from app.role_permission"))
    bind.execute(sa.text("delete from app.permission"))
    bind.execute(sa.text("delete from app.role"))
