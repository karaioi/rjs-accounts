"""API request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MembershipOut(BaseModel):
    organization_id: uuid.UUID
    organization_name: str
    organization_slug: str
    customer_id: uuid.UUID
    role_slug: str
    status: str


class MeOut(BaseModel):
    user_id: uuid.UUID
    email: str | None
    name: str | None
    is_platform_admin: bool
    account_status: str
    email_verified: bool
    must_change_password: bool
    memberships: list[MembershipOut]


class AccountOut(BaseModel):
    """The caller's own account state (returned by `/auth/register`)."""

    user_id: uuid.UUID
    account_status: str
    email_verified: bool


class UserOut(BaseModel):
    """A user as seen by a platform admin in the approval queue."""

    user_id: uuid.UUID
    email: str | None
    name: str | None
    account_status: str
    email_verified: bool
    created_at: datetime
    approved_at: datetime | None = None


class RoleOut(BaseModel):
    slug: str
    name: str
    description: str | None
    rank: int
    permissions: list[str]


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    resource: str
    action: str
    description: str | None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    status: str
    created_at: datetime
    approved_at: datetime | None


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=60, pattern=r"^[a-z0-9-]+$")


class OrganizationOut(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    name: str
    slug: str
    status: str
    role_slug: str | None = None
    created_at: datetime
    approved_at: datetime | None


class OrganizationCreate(BaseModel):
    customer_id: uuid.UUID
    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=60, pattern=r"^[a-z0-9-]+$")


class MemberOut(BaseModel):
    user_id: uuid.UUID
    email: str | None
    name: str | None
    role_slug: str
    status: str
    created_at: datetime


class MemberCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    role_slug: str = Field(min_length=1, max_length=40)


class MemberUpdate(BaseModel):
    role_slug: str = Field(min_length=1, max_length=40)


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    entity_type: str
    entity_id: str | None
    actor_user_id: uuid.UUID | None
    actor_role: str | None
    created_at: datetime


class LoginVerificationOut(BaseModel):
    required: bool
    verified: bool
    expires_at: datetime | None = None
