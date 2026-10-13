"""Add customer detail columns (GSTIN, address, contact, etc.).

Extends the `app.customer` table with the fields the customer form collects:
GSTIN, company name, location, addresses, pincode, state, email, contacts,
opening balance, place of supply, and phone.

Additive only; targets the `app` schema.

Revision ID: 0005_customer_fields
Revises: 0004_rate_limit
Create Date: 2026-10-13
"""

from __future__ import annotations

from alembic import op

revision = "0005_customer_fields"
down_revision = "0004_rate_limit"
branch_labels = None
depends_on = None

DDL: list[str] = [
    """
    alter table app.customer
        add column if not exists gstin                 text,
        add column if not exists company_name         text,
        add column if not exists location              text,
        add column if not exists address1              text,
        add column if not exists address2              text,
        add column if not exists pincode               text,
        add column if not exists state                 text,
        add column if not exists email                 text,
        add column if not exists contact_mobile        text,
        add column if not exists contact_telephone     text,
        add column if not exists opening_balance       text,
        add column if not exists opening_balance_type  text,
        add column if not exists place_of_supply       text,
        add column if not exists phone                 text
    """,
]

DROP: list[str] = [
    """
    alter table app.customer
        drop column if exists gstin,
        drop column if exists company_name,
        drop column if exists location,
        drop column if exists address1,
        drop column if exists address2,
        drop column if exists pincode,
        drop column if exists state,
        drop column if exists email,
        drop column if exists contact_mobile,
        drop column if exists contact_telephone,
        drop column if exists opening_balance,
        drop column if exists opening_balance_type,
        drop column if exists place_of_supply,
        drop column if exists phone
    """,
]


def upgrade() -> None:
    for statement in DDL:
        op.execute(statement)


def downgrade() -> None:
    for statement in DROP:
        op.execute(statement)
