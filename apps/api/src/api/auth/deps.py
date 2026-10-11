"""Authentication and authorization dependencies."""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_session, set_rls_context
from ..models import Membership, Organization, UserProfile, neon_auth_user
from ..services.permissions import get_active_membership, load_permissions
from ..services.verification import is_verified, latest_verification
from .jwt import get_verifier

bearer_scheme = HTTPBearer(auto_error=False)


def _session_ref(claims: dict, token: str) -> str:
    """A stable per-session identifier for the OTP gate.

    Managed Auth tokens may not carry a session id, so we fall back to the
    token id / issued-at / a token hash.
    """
    for key in ("sid", "jti", "iat"):
        value = claims.get(key)
        if value:
            return str(value)
    return hashlib.sha256(token.encode()).hexdigest()[:32]


@dataclass(slots=True)
class Principal:
    """The authenticated caller."""

    user_id: uuid.UUID
    email: str | None
    name: str | None
    platform_role: str | None
    is_platform_admin: bool
    account_status: str
    email_verified: bool
    session_ref: str
    claims: dict
    must_change_password: bool = False

    @property
    def is_approved(self) -> bool:
        """Whether the account may read data. Platform admins always may."""
        return self.is_platform_admin or self.account_status == "active"


@dataclass(slots=True)
class TenantContext:
    """The caller plus the organization they are acting in."""

    principal: Principal
    organization_id: uuid.UUID | None = None
    customer_id: uuid.UUID | None = None
    role_slug: str | None = None
    permissions: frozenset[str] = frozenset()


def get_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> Principal:
    """Verify the bearer token and load the caller's platform role."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = get_verifier().verify(credentials.credentials)

    try:
        user_id = uuid.UUID(str(claims["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject is not a valid user id",
        ) from exc

    row = (
        session.execute(
            select(neon_auth_user).where(neon_auth_user.c.id == user_id)
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user"
        )
    if row["banned"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled"
        )

    is_platform_admin = row["role"] == "admin"
    profile = session.get(UserProfile, user_id)
    account_status = profile.status if profile is not None else "pending"

    set_rls_context(
        session, user_id=user_id, is_platform_admin=is_platform_admin
    )

    return Principal(
        user_id=user_id,
        email=row["email"],
        name=row["name"],
        platform_role=row["role"],
        is_platform_admin=is_platform_admin,
        account_status=account_status,
        email_verified=bool(row["emailVerified"]),
        session_ref=_session_ref(claims, credentials.credentials),
        claims=dict(claims),
        must_change_password=(
            bool(profile.must_change_password) if profile is not None else True
        ),
    )


def require_verified_login(
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> Principal:
    """Enforce the access gate on every data endpoint.

    Two independent conditions must hold before a caller may read or change data:

    1. the two-step sign-in gate — a freshly issued session cannot act until the
       email OTP step has been confirmed (see auth-and-tenancy-design.md §13.2);
    2. account approval — a self-service sign-up stays `pending` until a platform
       admin activates it.

    `/me`, `/auth/register`, and the `/auth/login/verification/*` routes use
    `get_principal` directly so a not-yet-approved user can still bootstrap and
    see their own state.
    """
    row = latest_verification(session, principal.user_id)

    if not is_verified(row, now=datetime.now(UTC)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required",
            headers={"X-Login-Verification": "required"},
        )

    if not principal.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is awaiting administrator approval",
            headers={"X-Account-Status": principal.account_status},
        )

    return principal


def require_platform_admin(
    principal: Principal = Depends(require_verified_login),
) -> Principal:
    if not principal.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform administrator access required",
        )
    return principal


def get_tenant_context(
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
    x_organization_id: str | None = Header(default=None, alias="X-Organization-Id"),
) -> TenantContext:
    """Resolve the active organization and the caller's permissions in it.

    Platform admins may target any organization; everyone else must have an
    active membership.
    """
    if not x_organization_id:
        if principal.is_platform_admin:
            return TenantContext(principal=principal)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Organization-Id header is required",
        )

    try:
        organization_id = uuid.UUID(x_organization_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Organization-Id must be a UUID",
        ) from exc

    organization = session.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    if principal.is_platform_admin:
        set_rls_context(
            session,
            user_id=principal.user_id,
            organization_id=organization.id,
            customer_id=organization.customer_id,
            is_platform_admin=True,
        )
        return TenantContext(
            principal=principal,
            organization_id=organization.id,
            customer_id=organization.customer_id,
        )

    membership = get_active_membership(session, principal.user_id, organization_id)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an active member of this organization",
        )

    set_rls_context(
        session,
        user_id=principal.user_id,
        organization_id=organization.id,
        customer_id=organization.customer_id,
        is_platform_admin=False,
    )

    return TenantContext(
        principal=principal,
        organization_id=organization.id,
        customer_id=organization.customer_id,
        role_slug=membership.role_slug,
        permissions=load_permissions(session, membership.role_slug),
    )


def require(permission: str):
    """Dependency factory: require a specific permission in the active org."""

    def dependency(
        ctx: TenantContext = Depends(get_tenant_context),
        _: Principal = Depends(require_verified_login),
    ) -> TenantContext:
        if ctx.principal.is_platform_admin:
            return ctx
        if permission not in ctx.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission}",
            )
        return ctx

    return dependency
