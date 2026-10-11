"""A read-only reflection of the tables owned by Managed Better Auth.

We never create or migrate these (they live in the `neon_auth` schema and are
managed by Neon). We only map the columns we need to read — most importantly
`user.role`, which distinguishes a platform admin. `user.id` is also the target
of every foreign key in the `app` schema.
"""

from sqlalchemy import Boolean, Column, DateTime, String, Table
from sqlalchemy.dialects.postgresql import UUID

from .base import Base

neon_auth_user = Table(
    "user",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    Column("name", String),
    Column("email", String),
    Column("emailVerified", Boolean),
    Column("role", String),
    Column("banned", Boolean),
    Column("banReason", String),
    Column("banExpires", DateTime(timezone=True)),
    Column("createdAt", DateTime(timezone=True)),
    Column("updatedAt", DateTime(timezone=True)),
    schema="neon_auth",
    info={"managed": True},
)

# Tables that Alembic must never touch.
MANAGED_TABLES = {
    ("neon_auth", "user"),
    ("neon_auth", "session"),
    ("neon_auth", "account"),
    ("neon_auth", "verification"),
    ("neon_auth", "jwks"),
    ("neon_auth", "organization"),
    ("neon_auth", "member"),
    ("neon_auth", "invitation"),
    ("neon_auth", "project_config"),
}
