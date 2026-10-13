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
from ..models import Customer, Membership, Organization
from ..schemas import CustomerCreate, CustomerOut, CustomerUpdate
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
        after={"name": customer.name, "organization_id": str(customer.organization_id) if customer.organization_id else None},
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

    before = {"name": customer.name, "company_name": customer.company_name}

    if body.name is not None:
        customer.name = body.name
    if body.company_name is not None:
        customer.company_name = body.company_name
    if body.gstin is not None:
        customer.gstin = body.gstin
    if body.location is not None:
        customer.location = body.location
    if body.address1 is not None:
        customer.address1 = body.address1
    if body.address2 is not None:
        customer.address2 = body.address2
    if body.pincode is not None:
        customer.pincode = body.pincode
    if body.state is not None:
        customer.state = body.state
    if body.email is not None:
        customer.email = body.email
    if body.contact_mobile is not None:
        customer.contact_mobile = body.contact_mobile
    if body.contact_telephone is not None:
        customer.contact_telephone = body.contact_telephone
    if body.opening_balance is not None:
        customer.opening_balance = body.opening_balance
    if body.opening_balance_type is not None:
        customer.opening_balance_type = body.opening_balance_type
    if body.place_of_supply is not None:
        customer.place_of_supply = body.place_of_supply

    if principal.is_platform_admin and body.organization_id is not None:
        customer.organization_id = body.organization_id

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="customer.update",
        entity_type="customer",
        entity_id=str(customer.id),
        customer_id=customer.id,
        organization_id=customer.organization_id,
        before=before,
        after={"name": customer.name, "company_name": customer.company_name},
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
