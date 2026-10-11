"""JWT verification against the Neon Auth JWKS endpoint."""

from __future__ import annotations

import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from ..config import get_settings


class JwtVerifier:
    """Verifies EdDSA tokens issued by Managed Better Auth."""

    def __init__(self, jwks_url: str, issuer: str, verify_issuer: bool = True) -> None:
        # PyJWKClient caches the key set and refreshes on unknown `kid`.
        self._jwks = PyJWKClient(jwks_url)
        self._issuer = issuer
        self._verify_issuer = verify_issuer

    def verify(self, token: str) -> dict:
        try:
            signing_key = self._jwks.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["EdDSA"],
                issuer=self._issuer if self._verify_issuer else None,
                options={"verify_aud": False, "require": ["exp", "sub"]},
            )
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001 - normalize every failure to 401
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc


_verifier: JwtVerifier | None = None


def get_verifier() -> JwtVerifier:
    """Lazily build a process-wide verifier."""
    global _verifier
    if _verifier is None:
        settings = get_settings()
        _verifier = JwtVerifier(
            jwks_url=settings.neon_auth_jwks_url,
            issuer=settings.issuer,
            verify_issuer=settings.jwt_verify_issuer,
        )
    return _verifier
