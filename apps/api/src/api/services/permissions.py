"""Authorization services: membership lookup and permission resolution."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Membership, RolePermission


def get_active_membership(
    session: Session, user_id: uuid.UUID, organization_id: uuid.UUID
) -> Membership | None:
    return session.execute(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.organization_id == organization_id,
            Membership.status == "active",
        )
    ).scalar_one_or_none()


def load_permissions(session: Session, role_slug: str) -> frozenset[str]:
    slugs = (
        session.execute(
            select(RolePermission.permission_slug).where(
                RolePermission.role_slug == role_slug
            )
        )
        .scalars()
        .all()
    )
    return frozenset(slugs)
