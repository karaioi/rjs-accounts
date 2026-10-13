"""Tenancy and authorization models: customer, organization, membership, RBAC."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

SCHEMA = "app"


class TimestampsMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )


class Customer(TimestampsMixin, Base):
    """A tenant / billing account. Owns one or more organizations."""

    __tablename__ = "customer"
    __table_args__ = (
        CheckConstraint("length(btrim(name)) > 0", name="customer_name_not_blank"),
        CheckConstraint("slug = lower(slug)", name="customer_slug_lowercase"),
        CheckConstraint(
            "status in ('pending','active','suspended','archived')",
            name="customer_status_valid",
        ),
        CheckConstraint(
            "(status = 'active') = (approved_at is not null)",
            name="customer_active_iff_approved",
        ),
        {"schema": SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'pending'")
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("neon_auth.user.id", ondelete="RESTRICT"),
        nullable=False,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("neon_auth.user.id", ondelete="SET NULL")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    gstin: Mapped[str | None] = mapped_column(Text)
    company_name: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    address1: Mapped[str | None] = mapped_column(Text)
    address2: Mapped[str | None] = mapped_column(Text)
    pincode: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    contact_mobile: Mapped[str | None] = mapped_column(Text)
    contact_telephone: Mapped[str | None] = mapped_column(Text)
    opening_balance: Mapped[str | None] = mapped_column(Text)
    opening_balance_type: Mapped[str | None] = mapped_column(Text)
    place_of_supply: Mapped[str | None] = mapped_column(Text)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(f"{SCHEMA}.organization.id", ondelete="CASCADE"),
    )

    organizations: Mapped[list[Organization]] = relationship(
        back_populates="customer",
        foreign_keys="[Organization.customer_id]",
        passive_deletes=True,
    )
    organization: Mapped[Organization | None] = relationship(
        "Organization",
        foreign_keys=[organization_id],
        post_update=True,
    )


class Organization(TimestampsMixin, Base):
    """A workspace under a customer. The unit of membership and data scoping."""

    __tablename__ = "organization"
    __table_args__ = (
        UniqueConstraint("customer_id", "slug", name="organization_customer_slug_key"),
        CheckConstraint("length(btrim(name)) > 0", name="organization_name_not_blank"),
        CheckConstraint("slug = lower(slug)", name="organization_slug_lowercase"),
        CheckConstraint(
            "status in ('pending','active','suspended','archived')",
            name="organization_status_valid",
        ),
        CheckConstraint(
            "(status = 'active') = (approved_at is not null)",
            name="organization_active_iff_approved",
        ),
        {"schema": SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(f"{SCHEMA}.customer.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'pending'")
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("neon_auth.user.id", ondelete="RESTRICT"),
        nullable=False,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("neon_auth.user.id", ondelete="SET NULL")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    customer: Mapped[Customer] = relationship(
        back_populates="organizations",
        foreign_keys=[customer_id],
        passive_deletes=True,
    )
    memberships: Mapped[list[Membership]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )


class Role(Base):
    """Fixed role catalog (seeded). Higher `rank` = more privileged."""

    __tablename__ = "role"
    __table_args__ = ({"schema": SCHEMA},)

    slug: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    rank: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )


class Permission(Base):
    """Fixed permission catalog (seeded). Slug is `resource:action`."""

    __tablename__ = "permission"
    __table_args__ = (
        UniqueConstraint("resource", "action", name="permission_resource_action_key"),
        CheckConstraint("slug = resource || ':' || action", name="permission_slug_shape"),
        {"schema": SCHEMA},
    )

    slug: Mapped[str] = mapped_column(Text, primary_key=True)
    resource: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )


class RolePermission(Base):
    """Which permissions a role grants."""

    __tablename__ = "role_permission"
    __table_args__ = ({"schema": SCHEMA},)

    role_slug: Mapped[str] = mapped_column(
        Text, ForeignKey(f"{SCHEMA}.role.slug", ondelete="CASCADE"), primary_key=True
    )
    permission_slug: Mapped[str] = mapped_column(
        Text,
        ForeignKey(f"{SCHEMA}.permission.slug", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )


class Membership(TimestampsMixin, Base):
    """Links a user to an organization with exactly one role."""

    __tablename__ = "membership"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "user_id", name="membership_org_user_key"
        ),
        CheckConstraint(
            "status in ('invited','active','suspended','removed')",
            name="membership_status_valid",
        ),
        {"schema": SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(f"{SCHEMA}.organization.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("neon_auth.user.id", ondelete="CASCADE"),
        nullable=False,
    )
    role_slug: Mapped[str] = mapped_column(
        Text, ForeignKey(f"{SCHEMA}.role.slug", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'active'")
    )
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("neon_auth.user.id", ondelete="SET NULL")
    )

    organization: Mapped[Organization] = relationship(back_populates="memberships")
    role: Mapped[Role] = relationship()
