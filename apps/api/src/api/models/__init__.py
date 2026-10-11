"""SQLAlchemy models.

`app` schema: owned and migrated by this project (Alembic).
`neon_auth` schema: managed by Neon Auth — read-only, never migrated here.
"""

from .account import LoginVerification, UserProfile
from .audit import AuditLog
from .base import Base
from .external import MANAGED_TABLES, neon_auth_user
from .tenancy import (
    Customer,
    Membership,
    Organization,
    Permission,
    Role,
    RolePermission,
)

__all__ = [
    "Base",
    "MANAGED_TABLES",
    "neon_auth_user",
    "AuditLog",
    "Customer",
    "LoginVerification",
    "Membership",
    "Organization",
    "Permission",
    "Role",
    "RolePermission",
    "UserProfile",
]
