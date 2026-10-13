"""Organizations (workspaces) and admin approval."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth.deps import Principal, require_platform_admin, require_verified_login
from ..db import get_session
from ..models import Customer, Membership, Organization
from ..schemas import OrganizationCreate, OrganizationOut
from ..services.audit import write_audit
from ..services.rate_limit import enforce

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
    status_filter: str | None = Query(default=None, alias="status"),
    principal: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> list[OrganizationOut]:
    stmt = select(Organization).order_by(Organization.name)
    if customer_id:
        stmt = stmt.where(Organization.customer_id == customer_id)
    if status_filter:
        stmt = stmt.where(Organization.status == status_filter)
    app_orgs = session.execute(stmt).scalars().all()
    result = [_to_out(org, None) for org in app_orgs]

    # Also include any neon_auth.organization entries that may not be in app.organization
    if not customer_id:
        existing_ids = {org.id for org in app_orgs}
        existing_slugs = {org.slug for org in app_orgs}
        neon_rows = session.execute(
            text('select id, name, slug, "createdAt" from neon_auth.organization order by name')
        ).all()
        for row in neon_rows:
            if row.id not in existing_ids and row.slug not in existing_slugs:
                if not status_filter or status_filter == "active":
                    result.append(
                        OrganizationOut(
                            id=row.id,
                            customer_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                            name=row.name,
                            slug=row.slug,
                            status="active",
                            role_slug=None,
                            created_at=row.createdAt,
                            approved_at=row.createdAt,
                        )
                    )
    return result


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    body: OrganizationCreate,
    request: Request,
    principal: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> OrganizationOut:
    """Create an organization.

    Platform admins create active organizations directly. A customer's
    owner/admin creates a `pending` organization that a platform admin approves.
    """
    enforce(
        bucket="organizations.create",
        subject=str(principal.user_id),
        limit=20,
        window_seconds=60,
    )
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

    # Sync organization into neon_auth schema
    session.execute(
        text("""
            insert into neon_auth.organization (id, name, slug, "createdAt")
            values (:id, :name, :slug, :created_at)
            on conflict (slug) do update set name = excluded.name
        """),
        {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "created_at": organization.created_at or now,
        },
    )

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
    enforce(
        bucket="organizations.approve",
        subject=str(principal.user_id),
        limit=20,
        window_seconds=60,
    )
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

    customer = session.get(Customer, organization.customer_id)
    if customer is not None and customer.status != "active":
        customer.status = "active"
        customer.approved_by = principal.user_id
        customer.approved_at = datetime.now(UTC)

    # Ensure it exists and is synced in neon_auth
    now = datetime.now(UTC)
    session.execute(
        text("""
            insert into neon_auth.organization (id, name, slug, "createdAt")
            values (:id, :name, :slug, :created_at)
            on conflict (slug) do update set name = excluded.name
        """),
        {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "created_at": organization.created_at or now,
        },
    )

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


@router.post("/{organization_id}/cancel", response_model=OrganizationOut)
def cancel_organization(
    organization_id: uuid.UUID,
    request: Request,
    principal: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> OrganizationOut:
    """Cancel / suspend an organization. Platform admin only."""
    enforce(
        bucket="organizations.cancel",
        subject=str(principal.user_id),
        limit=20,
        window_seconds=60,
    )
    organization = session.execute(
        select(Organization)
        .where(Organization.id == organization_id)
        .with_for_update()
    ).scalar_one_or_none()
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )
    if organization.status == "suspended":
        return _to_out(organization, None)

    previous = organization.status
    organization.status = "suspended"

    customer = session.get(Customer, organization.customer_id)
    if customer is not None:
        customer.status = "suspended"

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="organization.cancel",
        entity_type="organization",
        entity_id=str(organization.id),
        customer_id=organization.customer_id,
        organization_id=organization.id,
        before={"status": previous},
        after={"status": "suspended"},
        request=request,
    )
    session.commit()
    session.refresh(organization)
    return _to_out(organization, None)


@router.delete("/{organization_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    organization_id: uuid.UUID,
    request: Request,
    principal: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> None:
    """Permanently delete an organization and remove from both app and neon_auth schemas."""
    enforce(
        bucket="organizations.delete",
        subject=str(principal.user_id),
        limit=20,
        window_seconds=60,
    )
    organization = session.get(Organization, organization_id)
    if organization is None:
        # Check if it exists only in neon_auth.organization
        neon_row = session.execute(
            text('select id, name, slug from neon_auth.organization where id = :id'),
            {"id": organization_id},
        ).first()
        if neon_row is not None:
            write_audit(
                session,
                actor_user_id=principal.user_id,
                action="organization.delete",
                entity_type="organization",
                entity_id=str(organization_id),
                before={"name": neon_row.name, "slug": neon_row.slug},
                request=request,
            )
            session.execute(
                text('delete from neon_auth.organization where id = :id'),
                {"id": organization_id},
            )
            session.commit()
            return

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    org_id_str = str(organization.id)
    org_slug = organization.slug
    org_name = organization.name
    customer_id = organization.customer_id

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="organization.delete",
        entity_type="organization",
        entity_id=org_id_str,
        customer_id=customer_id,
        organization_id=organization.id,
        before={"name": org_name, "slug": org_slug, "status": organization.status},
        request=request,
    )

    # Delete from app.organization (cascades to app.membership)
    session.delete(organization)

    # Delete from neon_auth.organization (cascades to neon_auth.member, neon_auth.invitation)
    session.execute(
        text('delete from neon_auth.organization where id = :id or slug = :slug'),
        {"id": organization_id, "slug": org_slug},
    )

    session.commit()
