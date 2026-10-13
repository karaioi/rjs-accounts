"""Self-service registration & account status lookup.

Sign-up happens against Managed Auth (`signUp.email`, then an email-verification
OTP). Neon Auth owns the identity; this endpoint is what puts the account into
*our* approval workflow, so an administrator can review it before it can read
anything.
"""

from __future__ import annotations

import re
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth.deps import Principal, get_principal
from ..db import get_session
from ..models import Customer, Membership, Organization, UserProfile, neon_auth_user
from ..schemas import AccountOut, AccountStatusIn, AccountStatusOut, RegisterIn
from ..services.audit import write_audit
from ..services.rate_limit import enforce

router = APIRouter(prefix="/auth", tags=["auth"])

#: Registration is idempotent and only reachable with a verified email, so this
#: is a light guard against a scripted loop rather than a hard funnel.
REGISTER_LIMIT = 5
REGISTER_WINDOW_SECONDS = 60 * 60

STATUS_CHECK_LIMIT = 30
STATUS_CHECK_WINDOW_SECONDS = 60


def _slugify(val: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", val.strip().lower()).strip("-")
    return cleaned or "workspace"


@router.post("/register", response_model=AccountOut)
def register(
    request: Request,
    payload: RegisterIn | None = None,
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> AccountOut:
    """Create user profile as active and register their organization in pending.

    Users themselves are active immediately; the newly created organization
    is placed into the approval workflow for platform administrators.
    """
    enforce(
        bucket="auth.register",
        subject=str(principal.user_id),
        limit=REGISTER_LIMIT,
        window_seconds=REGISTER_WINDOW_SECONDS,
    )

    if not principal.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your email address before registering",
        )

    now = datetime.now(UTC)

    # 1. Activate the human user profile immediately
    profile = session.get(UserProfile, principal.user_id)
    if profile is None:
        profile = UserProfile(
            user_id=principal.user_id,
            status="active",
            approved_at=now,
            must_change_password=False,
        )
        session.add(profile)
        session.flush()
    elif profile.status == "pending":
        profile.status = "active"
        profile.approved_at = now

    # 2. Check if this user already has an organization
    existing_membership = session.execute(
        select(Membership, Organization)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(Membership.user_id == principal.user_id)
    ).first()

    org: Organization | None = None
    if existing_membership is not None:
        org = existing_membership[1]
    else:
        # Create Customer + Organization (in pending status awaiting admin approval)
        raw_name = (
            payload.organization_name.strip()
            if payload and payload.organization_name and payload.organization_name.strip()
            else None
        ) or f"{principal.name or 'My'} Workspace"

        slug_base = _slugify(raw_name)
        slug = slug_base
        while session.execute(
            select(Organization.id).where(Organization.slug == slug)
        ).first() or session.execute(
            select(Customer.id).where(Customer.slug == slug)
        ).first():
            slug = f"{slug_base}-{secrets.token_hex(2)}"

        customer = Customer(
            name=raw_name,
            slug=slug,
            status="pending",
            created_by=principal.user_id,
        )
        session.add(customer)
        session.flush()

        org = Organization(
            customer_id=customer.id,
            name=raw_name,
            slug=slug,
            status="pending",
            created_by=principal.user_id,
        )
        session.add(org)
        session.flush()

        membership = Membership(
            organization_id=org.id,
            user_id=principal.user_id,
            role_slug="owner",
            status="active",
        )
        session.add(membership)

        write_audit(
            session,
            actor_user_id=principal.user_id,
            action="organization.register",
            entity_type="organization",
            entity_id=str(org.id),
            organization_id=org.id,
            customer_id=customer.id,
            after={"status": "pending", "name": raw_name, "slug": slug},
            request=request,
        )

    session.commit()
    session.refresh(profile)
    if org:
        session.refresh(org)

    return AccountOut(
        user_id=principal.user_id,
        account_status=org.status if org else "pending",
        email_verified=principal.email_verified,
        organization_id=org.id if org else None,
        organization_name=org.name if org else None,
    )


@router.post("/status", response_model=AccountStatusOut)
def check_status(
    payload: AccountStatusIn,
    request: Request,
    session: Session = Depends(get_session),
) -> AccountStatusOut:
    """Public lookup: check an account's approval / active status by email from DB."""
    client_ip = request.client.host if request.client else "unknown"
    enforce(
        bucket="auth.check_status",
        subject=client_ip,
        limit=STATUS_CHECK_LIMIT,
        window_seconds=STATUS_CHECK_WINDOW_SECONDS,
    )

    email_clean = payload.email.strip().lower()

    user_row = session.execute(
        select(
            neon_auth_user.c.id,
            neon_auth_user.c.email,
            neon_auth_user.c.name,
            neon_auth_user.c["emailVerified"],
            neon_auth_user.c.role,
            neon_auth_user.c.banned,
            neon_auth_user.c["createdAt"],
        ).where(func.lower(neon_auth_user.c.email) == email_clean)
    ).one_or_none()

    if user_row is None:
        return AccountStatusOut(
            email=email_clean,
            status="not_found",
        )

    user_id = user_row[0]
    email = user_row[1]
    name = user_row[2]
    email_verified = bool(user_row[3])
    role = user_row[4]
    banned = bool(user_row[5])
    created_at = user_row[6]

    profile = session.get(UserProfile, user_id)

    if banned:
        account_status = "suspended"
        status_name = name
    elif role == "admin":
        account_status = "active"
        status_name = name
    else:
        org_row = session.execute(
            select(Organization)
            .join(Membership, Membership.organization_id == Organization.id)
            .where(Membership.user_id == user_id)
            .order_by(Organization.created_at.desc())
        ).scalars().first()

        if org_row is not None:
            account_status = org_row.status
            status_name = org_row.name
        elif profile is not None:
            account_status = profile.status
            status_name = name
        else:
            account_status = "pending"
            status_name = name

    return AccountStatusOut(
        email=email or email_clean,
        name=status_name,
        status=account_status,
        email_verified=email_verified,
        created_at=profile.created_at if profile else created_at,
        approved_at=profile.approved_at if profile else None,
    )

