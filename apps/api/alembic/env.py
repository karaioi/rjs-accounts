"""Alembic environment.

Migrations target the `app` schema only. The `neon_auth` schema is owned by
Neon Auth (Managed Better Auth) and is explicitly excluded from autogenerate.
"""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, pool, text

# Make `import api` work when invoked as `uv run alembic` from apps/api.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from api.config import get_settings  # noqa: E402
from api.models import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata
settings = get_settings()


def get_url() -> str:
    """Migrations must use the direct (non-pooled) connection."""
    return os.getenv("DATABASE_URL_UNPOOLED") or settings.database_url_unpooled


def include_object(obj, name, type_, reflected, compare_to) -> bool:
    """Never touch anything in the managed `neon_auth` schema."""
    if type_ == "table":
        return getattr(obj, "schema", None) != "neon_auth"
    return True


def _configure(**kwargs) -> None:
    context.configure(
        target_metadata=target_metadata,
        include_schemas=True,
        include_object=include_object,
        compare_type=True,
        version_table_schema="app",
        **kwargs,
    )


def run_migrations_offline() -> None:
    _configure(
        url=get_url(),
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(get_url(), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        # The `app` schema must exist before Alembic can create its version
        # table inside it.
        connection.execute(text("create schema if not exists app"))
        connection.commit()
        _configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
