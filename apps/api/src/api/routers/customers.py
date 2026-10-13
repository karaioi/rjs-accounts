"""Customers (tenants). Platform-admin only."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth.deps import Principal, require_platform_admin
from ..db import get_session
from ..models import Customer
from ..schemas import CustomerCreate, CustomerOut
from ..services.audit import write_audit

router = APIRouter(prefix="/customers", tags=["customers"])

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20


@router.get("")
def list_customers(
    page: int = Query(1, ge=1, description="Page number (1-indexed)."),
    page_size: int = Query(
        DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page."
    ),
    _: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> dict:
    """List customers with pagination. Platform admin only."""
    total = session.execute(
        select(func.count()).select_from(Customer)
    ).scalar_one()
    items = list(
        session.execute(
            select(Customer)
            .order_by(Customer.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).scalars().all()
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    body: CustomerCreate,
    request: Request,
    principal: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> Customer:
    """Create and activate a customer. Platform admin only."""
    now = datetime.now(UTC)
    customer = Customer(
        name=body.name,
        slug=body.slug,
        status="active",
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
            detail="A customer with that slug already exists",
        ) from exc

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="customer.create",
        entity_type="customer",
        entity_id=str(customer.id),
        customer_id=customer.id,
        after={"name": customer.name, "slug": customer.slug},
        request=request,
    )
    session.commit()
    session.refresh(customer)
    return customer
