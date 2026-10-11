"""Organization members (membership management)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth.deps import TenantContext, require
from ..db import get_session
from ..models import Membership, Role, UserProfile, neon_auth_user
from ..schemas import MemberCreate, MemberOut, MemberUpdate
from ..services.audit import write_audit

router = APIRouter(
    prefix="/organizations/{organization_id}/members", tags=["members"]
)


def _require_same_org(ctx: TenantContext, organization_id: uuid.UUID) -> None:
    """A tenant-scoped caller may only manage the organization they named."""
    if ctx.principal.is_platform_admin:
        return
    if ctx.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="X-Organization-Id does not match the organization in the path",
        )


def _assert_role_exists(session: Session, role_slug: str) -> None:
    if session.get(Role, role_slug) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown role: {role_slug}",
        )


def _owner_count(session: Session, organization_id: uuid.UUID) -> int:
    return session.execute(
        select(func.count())
        .select_from(Membership)
        .where(
            Membership.organization_id == organization_id,
            Membership.role_slug == "owner",
            Membership.status != "removed",
        )
    ).scalar_one()


def _to_out(membership: Membership, email: str | None, name: str | None) -> MemberOut:
    return MemberOut(
        user_id=membership.user_id,
        email=email,
        name=name,
        role_slug=membership.role_slug,
        status=membership.status,
        created_at=membership.created_at,
    )


@router.get("", response_model=list[MemberOut])
def list_members(
    organization_id: uuid.UUID,
    ctx: TenantContext = Depends(require("member:read")),
    session: Session = Depends(get_session),
) -> list[MemberOut]:
    _require_same_org(ctx, organization_id)
    rows = session.execute(
        select(Membership, neon_auth_user.c.email, neon_auth_user.c.name)
        .join(neon_auth_user, neon_auth_user.c.id == Membership.user_id)
        .where(Membership.organization_id == organization_id)
        .order_by(Membership.created_at)
    ).all()
    return [_to_out(m, email, name) for m, email, name in rows]


@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def add_member(
    organization_id: uuid.UUID,
    body: MemberCreate,
    request: Request,
    ctx: TenantContext = Depends(require("member:invite")),
    session: Session = Depends(get_session),
) -> MemberOut:
    _require_same_org(ctx, organization_id)
    _assert_role_exists(session, body.role_slug)

    user = (
        session.execute(
            select(neon_auth_user).where(
                func.lower(neon_auth_user.c.email) == body.email.strip().lower()
            )
        )
        .mappings()
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account with that email. The user must sign up first.",
        )

    membership = Membership(
        organization_id=organization_id,
        user_id=user["id"],
        role_slug=body.role_slug,
        status="active",
        invited_by=ctx.principal.user_id,
    )
    session.add(membership)
    if session.get(UserProfile, user["id"]) is None:
        session.add(UserProfile(user_id=user["id"], must_change_password=False))
    try:
        session.flush()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That user is already a member of this organization",
        ) from exc

    write_audit(
        session,
        actor_user_id=ctx.principal.user_id,
        actor_role=ctx.role_slug,
        action="member.add",
        entity_type="membership",
        entity_id=str(membership.id),
        organization_id=organization_id,
        customer_id=ctx.customer_id,
        after={"user_id": str(user["id"]), "role_slug": body.role_slug},
        request=request,
    )
    session.commit()
    session.refresh(membership)
    return _to_out(membership, user["email"], user["name"])


@router.patch("/{user_id}", response_model=MemberOut)
def update_member_role(
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    body: MemberUpdate,
    request: Request,
    ctx: TenantContext = Depends(require("member:role_manage")),
    session: Session = Depends(get_session),
) -> MemberOut:
    _require_same_org(ctx, organization_id)
    _assert_role_exists(session, body.role_slug)

    membership = session.execute(
        select(Membership)
        .where(
            Membership.organization_id == organization_id,
            Membership.user_id == user_id,
        )
        .with_for_update()
    ).scalar_one_or_none()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )

    if (
        membership.role_slug == "owner"
        and body.role_slug != "owner"
        and _owner_count(session, organization_id) <= 1
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An organization must keep at least one owner",
        )

    previous = membership.role_slug
    membership.role_slug = body.role_slug

    write_audit(
        session,
        actor_user_id=ctx.principal.user_id,
        actor_role=ctx.role_slug,
        action="member.role_update",
        entity_type="membership",
        entity_id=str(membership.id),
        organization_id=organization_id,
        customer_id=ctx.customer_id,
        before={"role_slug": previous},
        after={"role_slug": body.role_slug},
        request=request,
    )
    session.commit()
    session.refresh(membership)

    user = session.execute(
        select(neon_auth_user.c.email, neon_auth_user.c.name).where(
            neon_auth_user.c.id == user_id
        )
    ).first()
    return _to_out(membership, user[0] if user else None, user[1] if user else None)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    request: Request,
    ctx: TenantContext = Depends(require("member:remove")),
    session: Session = Depends(get_session),
) -> None:
    _require_same_org(ctx, organization_id)

    membership = session.execute(
        select(Membership)
        .where(
            Membership.organization_id == organization_id,
            Membership.user_id == user_id,
        )
        .with_for_update()
    ).scalar_one_or_none()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )
    if membership.role_slug == "owner" and _owner_count(session, organization_id) <= 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An organization must keep at least one owner",
        )

    write_audit(
        session,
        actor_user_id=ctx.principal.user_id,
        actor_role=ctx.role_slug,
        action="member.remove",
        entity_type="membership",
        entity_id=str(membership.id),
        organization_id=organization_id,
        customer_id=ctx.customer_id,
        before={"role_slug": membership.role_slug},
        request=request,
    )
    session.delete(membership)
    session.commit()
