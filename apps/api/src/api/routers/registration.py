"""Self-service registration & account status lookup.

Sign-up happens against Managed Auth (`signUp.email`, then an email-verification
OTP). Neon Auth owns the identity; this endpoint is what puts the account into
*our* approval workflow, so an administrator can review it before it can read
anything.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth.deps import Principal, get_principal
from ..db import get_session
from ..models import UserProfile, neon_auth_user
from ..schemas import AccountOut, AccountStatusIn, AccountStatusOut
from ..services.audit import write_audit
from ..services.rate_limit import enforce

router = APIRouter(prefix="/auth", tags=["auth"])

#: Registration is idempotent and only reachable with a verified email, so this
#: is a light guard against a scripted loop rather than a hard funnel.
REGISTER_LIMIT = 5
REGISTER_WINDOW_SECONDS = 60 * 60

STATUS_CHECK_LIMIT = 30
STATUS_CHECK_WINDOW_SECONDS = 60


@router.post("/register", response_model=AccountOut)
def register(
    request: Request,
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> AccountOut:
    """Create the caller's `user_profile` row in `pending` (idempotent).

    Safe to retry: an existing profile is returned untouched, so a double-submit
    never resets an approved account.
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

    profile = session.get(UserProfile, principal.user_id)
    if profile is None:
        profile = UserProfile(
            user_id=principal.user_id,
            status="pending",
            # Self-service users chose their own password.
            must_change_password=False,
        )
        session.add(profile)
        session.flush()

        write_audit(
            session,
            actor_user_id=principal.user_id,
            action="account.register",
            entity_type="user_profile",
            entity_id=str(principal.user_id),
            after={"status": "pending", "email": principal.email},
            request=request,
        )
        session.commit()
        session.refresh(profile)

    return AccountOut(
        user_id=principal.user_id,
        account_status=profile.status,
        email_verified=principal.email_verified,
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
    elif role == "admin":
        account_status = "active"
    elif profile is not None:
        account_status = profile.status
    else:
        account_status = "pending"

    return AccountStatusOut(
        email=email or email_clean,
        name=name,
        status=account_status,
        email_verified=email_verified,
        created_at=profile.created_at if profile else created_at,
        approved_at=profile.approved_at if profile else None,
    )
