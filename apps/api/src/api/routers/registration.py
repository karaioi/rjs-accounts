"""Self-service registration: claim an app-side account in `pending` state.

Sign-up happens against Managed Auth (`signUp.email`, then an email-verification
OTP). Neon Auth owns the identity; this endpoint is what puts the account into
*our* approval workflow, so an administrator can review it before it can read
anything.

Deliberately uses `get_principal` rather than `require_verified_login`: a
`pending` account is not yet approved, and this is the call that creates it.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..auth.deps import Principal, get_principal
from ..db import get_session
from ..models import UserProfile
from ..schemas import AccountOut
from ..services.audit import write_audit

router = APIRouter(prefix="/auth", tags=["auth"])


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
