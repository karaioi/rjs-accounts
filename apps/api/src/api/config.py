"""Application settings, loaded from the environment.

Values are read from `apps/api/.env` (see `.env.example`). Real values are never
committed. The same variables are produced by `neon env pull`.
"""

from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Database (Neon / Lakebase Postgres) ------------------------------
    # Pooled connection, used by the API at runtime.
    database_url: str
    # Direct (non-pooled) connection, used only by Alembic migrations.
    database_url_unpooled: str

    # --- Neon Auth (Managed Better Auth) ----------------------------------
    neon_auth_base_url: str
    neon_auth_jwks_url: str
    # Expected JWT `iss`. Defaults to the Auth base URL when unset.
    neon_auth_issuer: str | None = None
    # Verify the `iss` claim. Disable only while diagnosing a 401.
    jwt_verify_issuer: bool = True

    # --- Application ------------------------------------------------------
    app_schema: str = "app"
    # Product name used in branded emails (subject lines and headers).
    app_name: str = "RJS Accounts"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]

    # --- App mailer (provider-agnostic) -----------------------------------
    # Transport: "auto" picks Resend when RESEND_API_KEY is set, then SMTP when
    # SMTP_HOST is set, and otherwise logs the message (development).
    mail_provider: Literal["auto", "resend", "smtp"] = "auto"
    # Shared From address for every transport; falls back to SMTP_FROM.
    mail_from: str | None = None

    # --- Resend (https://resend.com) HTTP API transport -------------------
    resend_api_key: str | None = None
    resend_api_url: str = "https://api.resend.com/emails"

    # --- SMTP transport ---------------------------------------------------
    # Empty in development: the mailer logs instead of sending.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True

    @property
    def mail_sender(self) -> str | None:
        """The `From` address used by every mailer transport."""
        return self.mail_from or self.smtp_from

    @property
    def issuer(self) -> str:
        """Expected JWT `iss`.

        Managed Auth sets `iss` to the Auth server's **origin** (scheme + host),
        without the `/neondb/auth` path that `NEON_AUTH_BASE_URL` carries. Set
        `NEON_AUTH_ISSUER` explicitly to override.
        """
        if self.neon_auth_issuer:
            return self.neon_auth_issuer
        parts = urlsplit(self.neon_auth_base_url)
        return f"{parts.scheme}://{parts.netloc}"


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
