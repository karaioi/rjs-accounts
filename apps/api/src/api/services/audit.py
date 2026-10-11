"""Audit logging."""

from __future__ import annotations

from ipaddress import ip_address
from typing import Any
from uuid import UUID

from fastapi import Request
from sqlalchemy.orm import Session

from ..models import AuditLog


def _client_ip(request: Request) -> str | None:
    """The caller's IP, or None when the transport doesn't expose a real one.

    `client.host` is a plain string: an ASGI test client or a Unix-socket proxy
    can hand us a name, and the column is `inet`. Dropping a value that isn't an
    address keeps the audit write from failing the whole transaction.
    """
    if request.client is None:
        return None
    try:
        return str(ip_address(request.client.host))
    except ValueError:
        return None


def write_audit(
    session: Session,
    *,
    actor_user_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    actor_role: str | None = None,
    customer_id: UUID | None = None,
    organization_id: UUID | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    """Stage an audit row in the current transaction.

    Callers must commit. Keeping the write in the same transaction as the change
    means the log and the change succeed or fail together.
    """
    entry = AuditLog(
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        customer_id=customer_id,
        organization_id=organization_id,
        before=before,
        after=after,
    )
    if request is not None:
        entry.ip = _client_ip(request)
        entry.user_agent = request.headers.get("user-agent")
    session.add(entry)
