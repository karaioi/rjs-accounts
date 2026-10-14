"""Customers router.

Platform admins can view all customers across all organizations and create/manage
customers organization-wise.
Organization owners/admins can CRUD customers belonging exclusively to their organization.
"""

from __future__ import annotations

import re
import secrets
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth.deps import Principal, require_verified_login
from ..db import get_session
from ..models import AuditLog, Customer, Membership, Organization, neon_auth_user
from ..schemas import (
    CustomerActivityOut,
    CustomerCreate,
    CustomerOut,
    CustomerUpdate,
)
from ..services.audit import write_audit
from ..services.rate_limit import enforce

router = APIRouter(prefix="/customers", tags=["customers"])

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20
_CUSTOMER_MANAGER_ROLES = ("owner", "admin", "accountant")


def _slugify(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return cleaned[:50] or "customer"


def _resolve_user_organization(
    session: Session, user_id: uuid.UUID
) -> tuple[uuid.UUID, str] | None:
    row = session.execute(
        select(Membership.organization_id, Membership.role_slug)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(
            Membership.user_id == user_id,
            Membership.status == "active",
            Organization.status == "active",
        )
        .order_by(Membership.created_at)
    ).first()
    if row:
        return row[0], row[1]
    return None


def _to_customer_out(customer: Customer, org_name: str | None = None) -> CustomerOut:
    return CustomerOut(
        id=customer.id,
        name=customer.name,
        slug=customer.slug,
        status=customer.status,
        organization_id=customer.organization_id,
        organization_name=org_name or (customer.organization.name if customer.organization else None),
        gstin=customer.gstin,
        company_name=customer.company_name,
        location=customer.location,
        address1=customer.address1,
        address2=customer.address2,
        pincode=customer.pincode,
        state=customer.state,
        email=customer.email,
        contact_mobile=customer.contact_mobile,
        contact_telephone=customer.contact_telephone,
        opening_balance=customer.opening_balance,
        opening_balance_type=customer.opening_balance_type,
        place_of_supply=customer.place_of_supply,
        created_at=customer.created_at,
        approved_at=customer.approved_at,
    )


@router.get("")
def list_customers(
    page: int = Query(1, ge=1, description="Page number (1-indexed)."),
    page_size: int = Query(
        DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page."
    ),
    search: str | None = Query(None, description="Search by name, company, GSTIN, or email."),
    organization_id: uuid.UUID | None = Query(None, description="Filter by organization (admin only)."),
    principal: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> dict:
    """List customers with pagination and optional search.

    Platform admins see all customers (or filtered by org).
    Organization owners/members see only customers belonging to their organization.
    """
    stmt = (
        select(Customer, Organization.name.label("org_name"))
        .outerjoin(Organization, Organization.id == Customer.organization_id)
    )

    if principal.is_platform_admin:
        if organization_id:
            stmt = stmt.where(Customer.organization_id == organization_id)
        else:
            stmt = stmt.where(Customer.organization_id.isnot(None))
    else:
        user_org = _resolve_user_organization(session, principal.user_id)
        if not user_org:
            return {
                "items": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
            }
        user_org_id, _ = user_org
        stmt = stmt.where(Customer.organization_id == user_org_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Customer.name.ilike(term),
                Customer.company_name.ilike(term),
                Customer.gstin.ilike(term),
                Customer.email.ilike(term),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = session.execute(count_stmt).scalar_one()

    stmt = stmt.order_by(Customer.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = session.execute(stmt).all()

    items = [_to_customer_out(row.Customer, row.org_name) for row in rows]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    body: CustomerCreate,
    request: Request,
    principal: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> CustomerOut:
    """Create a customer.

    Platform admins can assign the customer to any organization.
    Owners/admins can create customers for their own organization.
    """
    enforce(
        bucket="customers.create",
        subject=str(principal.user_id),
        limit=30,
        window_seconds=60,
    )

    target_org_id: uuid.UUID | None = None
    if principal.is_platform_admin:
        if body.organization_id:
            org = session.get(Organization, body.organization_id)
            if org is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Specified organization not found",
                )
            target_org_id = org.id
    else:
        user_org = _resolve_user_organization(session, principal.user_id)
        if not user_org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must belong to an active organization to create customers",
            )
        user_org_id, role_slug = user_org
        if role_slug not in _CUSTOMER_MANAGER_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to create customers",
            )
        target_org_id = user_org_id

    # Generate unique slug
    base_name = body.name or body.company_name or "customer"
    slug_base = _slugify(base_name)
    slug = body.slug or f"{slug_base}-{secrets.token_hex(3)}"
    while session.execute(
        select(Customer.id).where(Customer.slug == slug)
    ).first():
        slug = f"{slug_base}-{secrets.token_hex(4)}"

    now = datetime.now(UTC)
    customer = Customer(
        name=body.name,
        slug=slug,
        status="active",
        organization_id=target_org_id,
        gstin=body.gstin,
        company_name=body.company_name,
        location=body.location,
        address1=body.address1,
        address2=body.address2,
        pincode=body.pincode,
        state=body.state,
        email=body.email,
        contact_mobile=body.contact_mobile,
        contact_telephone=body.contact_telephone,
        opening_balance=body.opening_balance,
        opening_balance_type=body.opening_balance_type,
        place_of_supply=body.place_of_supply,
        created_by=principal.user_id,
        approved_by=principal.user_id,
        approved_at=now,
    )
    session.add(customer)
    try:
        session.flush()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A customer with that slug or details already exists",
        ) from exc

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="customer.create",
        entity_type="customer",
        entity_id=str(customer.id),
        customer_id=customer.id,
        organization_id=customer.organization_id,
        after={
            "name": customer.name,
            "company_name": customer.company_name,
            "gstin": customer.gstin,
            "location": customer.location,
            "address1": customer.address1,
            "address2": customer.address2,
            "pincode": customer.pincode,
            "state": customer.state,
            "email": customer.email,
            "contact_mobile": customer.contact_mobile,
            "contact_telephone": customer.contact_telephone,
            "opening_balance": customer.opening_balance,
            "opening_balance_type": customer.opening_balance_type,
            "place_of_supply": customer.place_of_supply,
            "organization_id": str(customer.organization_id) if customer.organization_id else None,
        },
        request=request,
    )
    session.commit()
    session.refresh(customer)
    return _to_customer_out(customer)


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: uuid.UUID,
    principal: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> CustomerOut:
    """Get a single customer by ID."""
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )

    if not principal.is_platform_admin:
        user_org = _resolve_user_organization(session, principal.user_id)
        if not user_org or customer.organization_id != user_org[0]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )

    return _to_customer_out(customer)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: uuid.UUID,
    body: CustomerUpdate,
    request: Request,
    principal: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> CustomerOut:
    """Update a customer."""
    enforce(
        bucket="customers.update",
        subject=str(principal.user_id),
        limit=30,
        window_seconds=60,
    )
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )

    if not principal.is_platform_admin:
        user_org = _resolve_user_organization(session, principal.user_id)
        if not user_org or customer.organization_id != user_org[0]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )
        if user_org[1] not in _CUSTOMER_MANAGER_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update customers",
            )

    before = {
        "name": customer.name,
        "company_name": customer.company_name,
        "gstin": customer.gstin,
        "location": customer.location,
        "address1": customer.address1,
        "address2": customer.address2,
        "pincode": customer.pincode,
        "state": customer.state,
        "email": customer.email,
        "contact_mobile": customer.contact_mobile,
        "contact_telephone": customer.contact_telephone,
        "opening_balance": customer.opening_balance,
        "opening_balance_type": customer.opening_balance_type,
        "place_of_supply": customer.place_of_supply,
        "organization_id": str(customer.organization_id) if customer.organization_id else None,
    }

    fields_set = body.model_fields_set
    if "name" in fields_set and body.name is not None:
        customer.name = body.name
    if "company_name" in fields_set:
        customer.company_name = body.company_name
    if "gstin" in fields_set:
        customer.gstin = body.gstin or None
    if "location" in fields_set:
        customer.location = body.location
    if "address1" in fields_set:
        customer.address1 = body.address1
    if "address2" in fields_set:
        customer.address2 = body.address2
    if "pincode" in fields_set:
        customer.pincode = body.pincode
    if "state" in fields_set:
        customer.state = body.state
    if "email" in fields_set:
        customer.email = body.email
    if "contact_mobile" in fields_set:
        customer.contact_mobile = body.contact_mobile
    if "contact_telephone" in fields_set:
        customer.contact_telephone = body.contact_telephone
    if "opening_balance" in fields_set:
        customer.opening_balance = body.opening_balance
    if "opening_balance_type" in fields_set:
        customer.opening_balance_type = body.opening_balance_type
    if "place_of_supply" in fields_set:
        customer.place_of_supply = body.place_of_supply

    if principal.is_platform_admin and "organization_id" in fields_set:
        customer.organization_id = body.organization_id

    after = {
        "name": customer.name,
        "company_name": customer.company_name,
        "gstin": customer.gstin,
        "location": customer.location,
        "address1": customer.address1,
        "address2": customer.address2,
        "pincode": customer.pincode,
        "state": customer.state,
        "email": customer.email,
        "contact_mobile": customer.contact_mobile,
        "contact_telephone": customer.contact_telephone,
        "opening_balance": customer.opening_balance,
        "opening_balance_type": customer.opening_balance_type,
        "place_of_supply": customer.place_of_supply,
        "organization_id": str(customer.organization_id) if customer.organization_id else None,
    }

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="customer.update",
        entity_type="customer",
        entity_id=str(customer.id),
        customer_id=customer.id,
        organization_id=customer.organization_id,
        before=before,
        after=after,
        request=request,
    )
    session.commit()
    session.refresh(customer)
    return _to_customer_out(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: uuid.UUID,
    request: Request,
    principal: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> None:
    """Delete a customer."""
    enforce(
        bucket="customers.delete",
        subject=str(principal.user_id),
        limit=20,
        window_seconds=60,
    )
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )

    # Prevent deleting root tenant customer accounts linked to an organization workspace
    has_orgs = session.execute(
        select(Organization.id).where(Organization.customer_id == customer_id)
    ).first()
    if has_orgs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a customer account that is linked to an organization workspace",
        )

    if not principal.is_platform_admin:
        user_org = _resolve_user_organization(session, principal.user_id)
        if not user_org or customer.organization_id != user_org[0]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )
        if user_org[1] not in ("owner", "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only an owner or admin can delete customers",
            )

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="customer.delete",
        entity_type="customer",
        entity_id=str(customer.id),
        customer_id=customer.id,
        organization_id=customer.organization_id,
        before={"name": customer.name, "slug": customer.slug},
        request=request,
    )
    session.execute(delete(Customer).where(Customer.id == customer_id))
    session.commit()


@router.get("/{customer_id}/activity", response_model=list[CustomerActivityOut])
def get_customer_activity(
    customer_id: uuid.UUID,
    principal: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> list[CustomerActivityOut]:
    """Get audit activity history for a specific customer."""
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )

    if not principal.is_platform_admin:
        user_org = _resolve_user_organization(session, principal.user_id)
        if not user_org or customer.organization_id != user_org[0]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )

    stmt = (
        select(AuditLog)
        .where(
            (AuditLog.customer_id == customer_id)
            | (
                (AuditLog.entity_type == "customer")
                & (AuditLog.entity_id == str(customer_id))
            )
        )
        .order_by(AuditLog.created_at.desc())
        .limit(50)
    )
    logs = list(session.execute(stmt).scalars().all())

    actor_ids = {log.actor_user_id for log in logs if log.actor_user_id is not None}
    actor_names: dict[uuid.UUID, str] = {}
    if actor_ids:
        user_rows = session.execute(
            select(neon_auth_user.c.id, neon_auth_user.c.name, neon_auth_user.c.email)
            .where(neon_auth_user.c.id.in_(actor_ids))
        ).all()
        for row in user_rows:
            actor_names[row.id] = row.name or row.email or "Workspace User"

    out: list[CustomerActivityOut] = []
    for log in logs:
        actor_name = actor_names.get(log.actor_user_id) if log.actor_user_id else None
        out.append(
            CustomerActivityOut(
                id=log.id,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                actor_user_id=log.actor_user_id,
                actor_name=actor_name,
                before=log.before,
                after=log.after,
                created_at=log.created_at,
            )
        )
    return out
