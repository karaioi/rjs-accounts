"""Add organization_id column to app.customer.

Enables scoping customers to an organization, allowing platform admins to manage
customers across all organizations, and owners to CRUD customers within their
own organization.

Revision ID: 0006_customer_org_id
Revises: 0005_customer_fields
Create Date: 2026-10-13
"""

from __future__ import annotations

from alembic import op

revision = "0006_customer_org_id"
down_revision = "0005_customer_fields"
branch_labels = None
depends_on = None

DDL: list[str] = [
    """
    alter table app.customer
        add column if not exists organization_id uuid references app.organization(id) on delete cascade;
    """,
    """
    create index if not exists ix_customer_organization_id on app.customer(organization_id);
    """,
    """
    update app.customer c
    set organization_id = o.id
    from app.organization o
    where o.customer_id = c.id and c.organization_id is null;
    """,
]

DROP: list[str] = [
    """
    drop index if exists app.ix_customer_organization_id;
    """,
    """
    alter table app.customer
        drop column if exists organization_id;
    """,
]


def upgrade() -> None:
    for statement in DDL:
        op.execute(statement)


def downgrade() -> None:
    for statement in DROP:
        op.execute(statement)
