"""Database engine, session factory, and Row-Level-Security helpers."""

from collections.abc import Iterator
from uuid import UUID

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from .config import get_settings

settings = get_settings()

# The runtime engine uses the pooled connection. RLS is enforced for this role
# once `app_runtime` is in use; see docs/backend/auth-and-tenancy-design.md.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a database session per request."""
    with SessionLocal() as session:
        yield session


def set_rls_context(
    session: Session,
    *,
    user_id: UUID | str | None = None,
    customer_id: UUID | str | None = None,
    organization_id: UUID | str | None = None,
    is_platform_admin: bool = False,
) -> None:
    """Set the transaction-local GUCs read by the RLS policies.

    Uses `set_config(..., is_local = true)` so the values are scoped to the
    current transaction and cannot leak across pooled connections.

    A missing value is stored as an empty string; the policies compare with
    `current_setting(..., true)`, which returns NULL when unset and therefore
    denies access (fail-closed).
    """
    session.execute(
        text(
            """
            select
              set_config('app.user_id',           :user_id,    true),
              set_config('app.customer_id',       :customer_id, true),
              set_config('app.organization_id',   :org_id,     true),
              set_config('app.is_platform_admin', :is_admin,   true)
            """
        ),
        {
            "user_id": str(user_id) if user_id else "",
            "customer_id": str(customer_id) if customer_id else "",
            "org_id": str(organization_id) if organization_id else "",
            "is_admin": "true" if is_platform_admin else "false",
        },
    )
