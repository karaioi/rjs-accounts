"""Reference data: roles (with their permissions) and the permission catalog."""

from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth.deps import Principal, require_verified_login
from ..db import get_session
from ..models import Permission, Role, RolePermission
from ..schemas import PermissionOut, RoleOut

router = APIRouter(tags=["reference"])


@router.get("/roles", response_model=list[RoleOut])
def list_roles(
    _: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> list[RoleOut]:
    roles = session.execute(select(Role).order_by(Role.rank.desc())).scalars().all()

    grants: dict[str, list[str]] = defaultdict(list)
    for role_slug, permission_slug in session.execute(
        select(RolePermission.role_slug, RolePermission.permission_slug)
    ).all():
        grants[role_slug].append(permission_slug)

    return [
        RoleOut(
            slug=role.slug,
            name=role.name,
            description=role.description,
            rank=role.rank,
            permissions=sorted(grants.get(role.slug, [])),
        )
        for role in roles
    ]


@router.get("/permissions", response_model=list[PermissionOut])
def list_permissions(
    _: Principal = Depends(require_verified_login),
    session: Session = Depends(get_session),
) -> list[Permission]:
    return list(
        session.execute(
            select(Permission).order_by(Permission.resource, Permission.action)
        )
        .scalars()
        .all()
    )
