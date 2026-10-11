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

    response = httpx.post(
        settings.resend_api_url,
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json=payload,
        timeout=15,
    )
    response.raise_for_status()
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

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        smtp.ehlo()
        if settings.smtp_use_tls:
            smtp.starttls()
            smtp.ehlo()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password or "")
        smtp.send_message(message)

    return True
