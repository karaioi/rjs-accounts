"""Account approval queue (platform admin only).

A self-service sign-up lands in `pending` (see `routers/registration.py`). A
platform admin reviews the queue here and activates or rejects accounts. Only
`active` accounts may read data — enforced in `auth.deps.require_verified_login`.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from ..auth.deps import Principal, require_platform_admin
from ..db import get_session
from ..models import UserProfile, neon_auth_user
from ..schemas import UserOut
from ..services.audit import write_audit

router = APIRouter(prefix="/users", tags=["users"])

# Columns pulled from the managed identity table, addressed by their real names
# (Managed Better Auth uses camelCase for `emailVerified`).
_EMAIL = neon_auth_user.c.email
_NAME = neon_auth_user.c.name
_EMAIL_VERIFIED = neon_auth_user.c["emailVerified"]

#: `(profile, email, name, email_verified)` — spelled out because selecting an
#: ORM entity next to a Core table expands the table's columns individually.
UserRow = tuple[UserProfile, str | None, str | None, bool]


def _users_query() -> Select[UserRow]:
    return (
        select(UserProfile, _EMAIL, _NAME, _EMAIL_VERIFIED)
        .join(neon_auth_user, neon_auth_user.c.id == UserProfile.user_id)
    )


def _to_out(profile: UserProfile, email: str | None, name: str | None, verified: bool) -> UserOut:
    return UserOut(
        user_id=profile.user_id,
        email=email,
        name=name,
        account_status=profile.status,
        email_verified=verified,
        created_at=profile.created_at,
        approved_at=profile.approved_at,
    )


def _load(session: Session, user_id: uuid.UUID) -> UserRow:
    row = session.execute(
        _users_query().where(UserProfile.user_id == user_id)
    ).one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
        )
    return row


@router.get("", response_model=list[UserOut])
def list_users(
    account_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(pending|active|suspended|rejected)$",
    ),
    _: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> list[UserOut]:
    """List registered accounts, newest first. Defaults to the whole queue."""
    stmt = _users_query().order_by(UserProfile.created_at.desc())
    if account_status is not None:
        stmt = stmt.where(UserProfile.status == account_status)

    return [_to_out(*row) for row in session.execute(stmt).all()]


@router.post("/{user_id}/approve", response_model=UserOut)
def approve_user(
    user_id: uuid.UUID,
    request: Request,
    principal: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> UserOut:
    """Activate an account so its owner may read data."""
    profile, email, name, verified = _load(session, user_id)
    if profile.status == "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account is already active",
        )

    previous = profile.status
    profile.status = "active"
    profile.approved_by = principal.user_id
    profile.approved_at = datetime.now(UTC)

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="account.approve",
        entity_type="user_profile",
        entity_id=str(user_id),
        before={"status": previous},
        after={"status": "active"},
        request=request,
    )
    session.commit()
    session.refresh(profile)

    return _to_out(profile, email, name, verified)


@router.post("/{user_id}/reject", response_model=UserOut)
def reject_user(
    user_id: uuid.UUID,
    request: Request,
    principal: Principal = Depends(require_platform_admin),
    session: Session = Depends(get_session),
) -> UserOut:
    """Decline an account. The owner keeps their identity but cannot read data.

    Clears `approved_at` because the table enforces
    `(status = 'active') = (approved_at is not null)`; the deciding admin is
    recorded in the audit log.
    """
    profile, email, name, verified = _load(session, user_id)
    if profile.status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account is already rejected",
        )

    previous = profile.status
    profile.status = "rejected"
    profile.approved_by = None
    profile.approved_at = None

    write_audit(
        session,
        actor_user_id=principal.user_id,
        action="account.reject",
        entity_type="user_profile",
        entity_id=str(user_id),
        before={"status": previous},
        after={"status": "rejected"},
        request=request,
    )
    session.commit()
    session.refresh(profile)

    return _to_out(profile, email, name, verified)
