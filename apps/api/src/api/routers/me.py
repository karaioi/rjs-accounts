"""`/me` — the caller's identity, platform role, and memberships."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth.deps import Principal, get_principal
from ..db import get_session
from ..models import Membership, Organization
from ..schemas import MeOut, MembershipOut

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=MeOut)
def read_me(
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> MeOut:
    rows = session.execute(
        select(Membership, Organization)
        .join(Organization, Membership.organization_id == Organization.id)
        .where(Membership.user_id == principal.user_id)
        .order_by(Organization.name)
    ).all()

    return MeOut(
        user_id=principal.user_id,
        email=principal.email,
        name=principal.name,
        platform_role=principal.platform_role,
        is_platform_admin=principal.is_platform_admin,
        account_status=principal.account_status,
        email_verified=principal.email_verified,
        must_change_password=principal.must_change_password,
        memberships=[
            MembershipOut(
                organization_id=org.id,
                organization_name=org.name,
                organization_slug=org.slug,
                customer_id=org.customer_id,
                role_slug=membership.role_slug,
                status=membership.status,
            )
            for membership, org in rows
        ],
    )
