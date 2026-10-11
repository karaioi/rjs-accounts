"""Audit log read access."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth.deps import TenantContext, require
from ..db import get_session
from ..models import AuditLog
from ..schemas import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require("audit:read")),
    session: Session = Depends(get_session),
) -> list[AuditLog]:
    stmt = (
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if not ctx.principal.is_platform_admin:
        stmt = stmt.where(AuditLog.organization_id == ctx.organization_id)
    return list(session.execute(stmt).scalars().all())
