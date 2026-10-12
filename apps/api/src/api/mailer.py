"""Provider-agnostic transactional mailer.

Three transports, chosen automatically (override with `MAIL_PROVIDER`):

* **Resend** — when `RESEND_API_KEY` is set (`auto`), or `MAIL_PROVIDER=resend`;
* **SMTP**   — when `SMTP_HOST` is set (`auto`), or `MAIL_PROVIDER=smtp`;
* **log**    — otherwise (development): the message is logged, not sent.

Switching providers is an environment change, not a code change.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from .config import Settings, get_settings

logger = logging.getLogger("api.mailer")


class MailDeliveryError(RuntimeError):
    """The configured transport could not hand the message to its provider.

    Callers translate this into a 5xx so a webhook source (Neon Auth) retries
    the delivery instead of seeing an unhandled traceback.
    """


# Resend's fixed HTTP API endpoint. A provider constant, not environment config.
RESEND_API_URL = "https://api.resend.com/emails"

#: How long one delivery attempt may take. Kept under Neon Auth's webhook
#: timeout (set to 10s, the maximum it allows) so a stalling provider fails here
#: and answers 5xx — which Neon retries with the same event id — rather than
#: Neon giving up first and retrying while our send is still in flight.
DELIVERY_TIMEOUT_SECONDS = 8


def send_email(*, to: str, subject: str, body: str, html: str | None = None) -> bool:
    """Send an email, or log it when no transport is configured.

    `body` is the plain-text part and is always required; `html` adds a
    rich alternative for providers and clients that prefer it.

    Returns True when the message was handed to a provider, False when it was
    only logged (development).
    """
    settings = get_settings()
    sender = settings.mail_sender
    provider = _resolve_provider(settings)

    if provider == "resend":
        if not settings.resend_api_key or not sender:
            logger.warning(
                "[mailer] Resend selected but RESEND_API_KEY/MAIL_FROM is unset; logging instead"
            )
            return _log(to, subject, body)
        return _send_resend(settings, sender, to, subject, body, html)

    if provider == "smtp":
        if not settings.smtp_host or not sender:
            logger.warning(
                "[mailer] SMTP selected but SMTP_HOST/SMTP_FROM is unset; logging instead"
            )
            return _log(to, subject, body)
        return _send_smtp(settings, sender, to, subject, body, html)

    return _log(to, subject, body)


def _resolve_provider(settings: Settings) -> str:
    """Pick the transport: explicit `MAIL_PROVIDER`, else inferred, else log."""
    if settings.mail_provider != "auto":
        return settings.mail_provider
    if settings.resend_api_key:
        return "resend"
    if settings.smtp_host:
        return "smtp"
    return "log"


def _log(to: str, subject: str, body: str) -> bool:
    logger.info("[mailer:dev] to=%s subject=%s\n%s", to, subject, body)
    return False


def _send_resend(
    settings: Settings,
    sender: str,
    to: str,
    subject: str,
    body: str,
    html: str | None = None,
) -> bool:
    payload: dict[str, object] = {
        "from": sender,
        "to": [to],
        "subject": subject,
        "text": body,
    }
    if html:
        payload["html"] = html

    try:
        response = httpx.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json=payload,
            timeout=DELIVERY_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise MailDeliveryError(f"Resend delivery failed: {exc}") from exc
    return True


def _send_smtp(
    settings: Settings,
    sender: str,
    to: str,
    subject: str,
    body: str,
    html: str | None = None,
) -> bool:
    message = EmailMessage()
    message["From"] = sender
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    if html:
        message.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(
            settings.smtp_host, settings.smtp_port, timeout=DELIVERY_TIMEOUT_SECONDS
        ) as smtp:
            smtp.ehlo()
            if settings.smtp_use_tls:
                smtp.starttls()
                smtp.ehlo()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password or "")
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise MailDeliveryError(f"SMTP delivery failed: {exc}") from exc

    return True
