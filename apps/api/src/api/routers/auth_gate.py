"""Two-step sign-in gate (password, then email OTP).

Managed Better Auth has no native MFA, so the second step is enforced here: a
newly issued session may call these endpoints (and `/me`), but every data
endpoint requires a verified, unexpired row in `app.login_verification`.

See docs/backend/auth-and-tenancy-design.md section 13.2.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.deps import Principal, get_principal
from ..db import get_session
from ..models import LoginVerification
from ..schemas import LoginVerificationOut
from ..services.rate_limit import enforce
from ..services.verification import is_verified, latest_verification

router = APIRouter(prefix="/auth/login/verification", tags=["auth"])

WINDOW = timedelta(minutes=15)

#: Sign-in OTP limits, matched to `WINDOW`. `start` is one code per password
#: sign-in, so a handful per window is generous; `complete` allows fat fingers.
OTP_START_LIMIT = 10
OTP_COMPLETE_LIMIT = 20
_RATE_WINDOW_SECONDS = int(WINDOW.total_seconds())


def _status(row: LoginVerification | None) -> LoginVerificationOut:
    verified = is_verified(row)
    return LoginVerificationOut(
        required=not verified,
        verified=verified,
        expires_at=row.expires_at if row else None,
    )


@router.get("", response_model=LoginVerificationOut)
def verification_status(
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> LoginVerificationOut:
    return _status(latest_verification(session, principal.user_id))


@router.post("/start", response_model=LoginVerificationOut)
def start_verification(
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> LoginVerificationOut:
    """Record that an OTP was requested for the current sign-in.

    The web client then asks Managed Auth to send the code. Resetting
    `verified_at` means a brand-new sign-in must complete the OTP step again.
    """
    enforce(
        bucket="login.verification.start",
        subject=str(principal.user_id),
        limit=OTP_START_LIMIT,
        window_seconds=_RATE_WINDOW_SECONDS,
    )

    now = datetime.now(UTC)
    row = LoginVerification(
        user_id=principal.user_id,
        session_ref=principal.session_ref,
        expires_at=now + WINDOW,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return _status(row)


@router.post("/complete", response_model=LoginVerificationOut)
def complete_verification(
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> LoginVerificationOut:
    """Mark the sign-in verified after the client confirmed the OTP."""
    enforce(
        bucket="login.verification.complete",
        subject=str(principal.user_id),
        limit=OTP_COMPLETE_LIMIT,
        window_seconds=_RATE_WINDOW_SECONDS,
    )

    now = datetime.now(UTC)
    row = latest_verification(session, principal.user_id)
    if row is None or row.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Start verification before completing it",
        )
    row.verified_at = now
    session.commit()
    session.refresh(row)
    return _status(row)
