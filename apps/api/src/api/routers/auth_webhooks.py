"""Inbound Neon Auth webhooks — branded email delivery.

Managed Better Auth normally delivers verification codes itself, from its shared
`auth@mail.myneon.app` sender and its own template. Once the project's webhook
is subscribed to `send.otp` (and/or `send.magic_link`), Neon *skips* that and
calls this endpoint instead — blocker, so the sign-in waits on us.

That is the only way to control the sender address and the template (dashboard
email templates don't exist yet), and it means the message becomes ours: sent
through `mailer.send_email` with `MAIL_FROM` and rendered by `api.emails`.

See docs/backend/auth-and-tenancy-design.md and
https://neon.com/docs/auth/guides/customize-emails
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..auth.webhooks import WebhookVerifier, get_webhook_verifier
from ..config import get_settings
from ..emails import Email, render_magic_link_email, render_otp_email
from ..mailer import MailDeliveryError, send_email

logger = logging.getLogger("api.auth_webhooks")

router = APIRouter(prefix="/auth/webhooks", tags=["auth-webhooks"])

# Neon retries a delivery until it sees a 2xx, reusing `X-Neon-Event-Id` across
# attempts. Remember recent ids so a retry can't send a second code.
_HANDLED_TTL_SECONDS = 15 * 60
_handled: dict[str, float] = {}


@router.post("/neon")
async def neon_auth_webhook(
    request: Request,
    verifier: WebhookVerifier = Depends(get_webhook_verifier),
) -> dict[str, Any]:
    """Verify and handle a Neon Auth webhook delivery.

    Verification failures are 401 (unsigned, tampered, or replayed) and delivery
    failures are 5xx, so Neon retries rather than silently dropping a code.
    """
    raw_body = await request.body()
    try:
        payload = verifier.verify(raw_body, request.headers)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed payload"
        ) from exc

    event_type = str(payload.get("event_type") or "")
    event_id = str(payload.get("event_id") or "")

    if event_id and _already_handled(event_id):
        logger.info("[auth-webhook] duplicate %s (%s) ignored", event_type, event_id)
        return _response_for(event_type)

    if event_type == "send.otp":
        _deliver_otp(payload)
    elif event_type == "send.magic_link":
        _deliver_magic_link(payload)
    elif event_type == "user.before_create":
        # We don't gate sign-ups. Answer explicitly: a missing `allowed` field
        # is treated as a rejection, which would block everyone.
        logger.warning("[auth-webhook] user.before_create received; allowing signup")
        return {"allowed": True}
    else:
        logger.info("[auth-webhook] ignoring unsupported event %r", event_type)

    if event_id:
        _remember(event_id)
    return _response_for(event_type)


def _deliver_otp(payload: dict[str, Any]) -> None:
    """Send the verification code with our own template."""
    settings = get_settings()
    user = payload.get("user") or {}
    data = payload.get("event_data") or {}

    to = _require(user, "email", event="send.otp")
    code = _require(data, "otp_code", event="send.otp")

    message = render_otp_email(
        app_name=settings.app_name,
        app_url=settings.app_url,
        code=str(code),
        otp_type=str(data.get("otp_type") or ""),
        to=to,
        user_name=user.get("name"),
        expires_at=data.get("expires_at"),
    )
    _send(to=to, message=message)


def _deliver_magic_link(payload: dict[str, Any]) -> None:
    """Send a magic link (or password-reset link) with our own template."""
    settings = get_settings()
    user = payload.get("user") or {}
    data = payload.get("event_data") or {}

    to = _require(user, "email", event="send.magic_link")
    link_url = _require(data, "link_url", event="send.magic_link")

    message = render_magic_link_email(
        app_name=settings.app_name,
        app_url=settings.app_url,
        link_url=str(link_url),
        link_type=str(data.get("link_type") or ""),
        to=to,
        user_name=user.get("name"),
        expires_at=data.get("expires_at"),
    )
    _send(to=to, message=message)


def _send(*, to: str, message: Email) -> None:
    try:
        delivered = send_email(
            to=to, subject=message.subject, body=message.text, html=message.html
        )
    except MailDeliveryError as exc:
        # The transport failed (auth, connection, provider rejection). A 5xx is
        # deliberate: Neon retries with the same event id, which the dedup above
        # keeps from sending a second code.
        logger.error("[auth-webhook] delivery to %s failed: %s", to, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Email delivery failed",
        ) from exc

    if delivered:
        return

    # `send_email` returns False when no transport is configured (the "log"
    # provider). An undelivered code is a broken sign-in, so surface it instead
    # of answering 2xx and leaving the user waiting for an email that never comes.
    logger.error(
        "[auth-webhook] no email transport configured; %r not delivered to %s",
        message.subject,
        to,
    )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Email transport is not configured (set RESEND_API_KEY or SMTP_HOST)",
    )


def _require(source: dict[str, Any], key: str, *, event: str) -> str:
    value = source.get(key)
    if not value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{event} payload is missing {key!r}",
        )
    return str(value)


def _response_for(event_type: str) -> dict[str, Any]:
    if event_type == "user.before_create":
        return {"allowed": True}
    return {"received": True}


def _already_handled(event_id: str) -> bool:
    seen_at = _handled.get(event_id)
    return seen_at is not None and time.monotonic() - seen_at < _HANDLED_TTL_SECONDS


def _remember(event_id: str) -> None:
    now = time.monotonic()
    for key, seen_at in list(_handled.items()):
        if now - seen_at > _HANDLED_TTL_SECONDS:
            del _handled[key]
    _handled[event_id] = now
