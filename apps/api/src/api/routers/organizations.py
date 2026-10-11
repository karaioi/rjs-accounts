"""Organizations (workspaces) and admin approval."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth.deps import Principal, require_platform_admin, require_verified_login
from ..db import get_session
from ..models import Customer, Membership, Organization
from ..schemas import OrganizationCreate, OrganizationOut
from ..services.audit import write_audit

router = APIRouter(prefix="/organizations", tags=["organizations"])

_ORG_MANAGER_ROLES = ("owner", "admin")


def _to_out(org: Organization, role_slug: str | None) -> OrganizationOut:
    return OrganizationOut(
        id=org.id,
        customer_id=org.customer_id,
        name=org.name,
        slug=org.slug,
        status=org.status,
        role_slug=role_slug,
        created_at=org.created_at,
        approved_at=org.approved_at,
    )


@router.get("", response_model=list[OrganizationOut])
def list_organizations(
    customer_id: uuid.UUID | None = None,
    principal: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> list[OrganizationOut]:
    if principal.is_platform_admin:
        stmt = select(Organization).order_by(Organization.name)
        if customer_id:
            stmt = stmt.where(Organization.customer_id == customer_id)
        return [_to_out(org, None) for org in session.execute(stmt).scalars().all()]

    stmt = (
        select(Organization, Membership.role_slug)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(
            Membership.user_id == principal.user_id,
            Membership.status == "active",
        )
        .order_by(Organization.name)
    )
    if customer_id:
        stmt = stmt.where(Organization.customer_id == customer_id)
    return [_to_out(org, role) for org, role in session.execute(stmt).all()]


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    body: OrganizationCreate,
    request: Request,
    principal: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> OrganizationOut:
    """Create an organization.

    Platform admins create active organizations directly. A customer's
    owner/admin creates a `pending` organization that a platform admin approves.
    """
    if session.get(Customer, body.customer_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )

    if principal.is_platform_admin:
        auto_approve = True
    else:
        is_manager = session.execute(
            select(Membership.id)
            .join(Organization, Membership.organization_id == Organization.id)
            .where(
                Organization.customer_id == body.customer_id,
                Membership.user_id == principal.user_id,
                Membership.status == "active",
                Membership.role_slug.in_(_ORG_MANAGER_ROLES),
            )
            .limit(1)
        ).first()
        if is_manager is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only an owner or admin of this customer can create organizations",
            )
        auto_approve = False

    now = datetime.now(UTC)
    organization = Organization(
        customer_id=body.customer_id,
        name=body.name,
        slug=body.slug,
        status="active" if auto_approve else "pending",
        created_by=principal.user_id,
        approved_by=principal.user_id if auto_approve else None,
        approved_at=now if auto_approve else None,
    )
    session.add(organization)
    try:
        session.flush()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That slug is already used by one of this customer's organizations",
        ) from exc

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="organization.create",
        entity_type="organization",
        entity_id=str(organization.id),
        customer_id=organization.customer_id,
        organization_id=organization.id,
        after={"name": organization.name, "slug": organization.slug},
        request=request,
    )
    session.commit()
    session.refresh(organization)
    return _to_out(organization, "owner" if not principal.is_platform_admin else None)


@router.post("/{organization_id}/approve", response_model=OrganizationOut)
def approve_organization(
    organization_id: uuid.UUID,
    request: Request,
    principal: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> OrganizationOut:
    """Activate a pending organization. Platform admin only."""
    organization = session.execute(
        select(Organization)
        .where(Organization.id == organization_id)
        .with_for_update()
    ).scalar_one_or_none()
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )
    if organization.status == "active":
        return _to_out(organization, None)

    organization.status = "active"
    organization.approved_by = principal.user_id
    organization.approved_at = datetime.now(UTC)

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="organization.approve",
        entity_type="organization",
        entity_id=str(organization.id),
        customer_id=organization.customer_id,
        organization_id=organization.id,
        request=request,
    )
    session.commit()
    session.refresh(organization)
    return _to_out(organization, None)
