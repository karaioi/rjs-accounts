"""Customers (tenants). Platform-admin only."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth.deps import Principal, require_platform_admin
from ..db import get_session
from ..models import Customer
from ..schemas import CustomerCreate, CustomerOut
from ..services.audit import write_audit

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(
    _: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> list[Customer]:
    return list(
        session.execute(select(Customer).order_by(Customer.name)).scalars().all()
    )


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
