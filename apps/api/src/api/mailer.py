"""Provider-agnostic SMTP mailer.

In development the SMTP settings are empty and messages are logged instead of
sent. Moving to a real provider later (Gmail SMTP, Resend, …) is a configuration
change, not a code change.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from .config import get_settings

logger = logging.getLogger("api.mailer")


def send_email(*, to: str, subject: str, body: str) -> bool:
    """Send an email, or log it when SMTP is not configured.

    Returns True when the message was handed to an SMTP server, False when it was
    only logged (development).
    """
    settings = get_settings()

    if not settings.smtp_host or not settings.smtp_from:
        logger.info("[mailer:dev] to=%s subject=%s\n%s", to, subject, body)
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        smtp.ehlo()
        if settings.smtp_use_tls:
            smtp.starttls()
            smtp.ehlo()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password or "")
        smtp.send_message(message)

    return True
