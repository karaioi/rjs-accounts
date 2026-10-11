"""Verification for inbound Neon Auth webhooks.

Managed Better Auth signs webhook deliveries with an Ed25519 *detached JWS*:

* `X-Neon-Signature`      — `header..signature` (empty payload segment)
* `X-Neon-Signature-Kid`  — key id to look up in the project JWKS
* `X-Neon-Timestamp`      — Unix time in **milliseconds**

The signing input is the timestamp joined to the base64url-encoded raw body, and
that whole string is base64url-encoded again (RFC 7515 compact serialization):

    payload  = base64url(raw_body)
    signing  = base64url(f"{timestamp}.{payload}")

Because the timestamp is covered by the signature, it cannot be forged; we still
reject old deliveries to blunt replays. See
https://neon.com/docs/auth/guides/webhooks#signature-verification
"""

from __future__ import annotations

import json
import time
from typing import Mapping

import jwt
from cryptography.exceptions import InvalidSignature
from fastapi import HTTPException, status
from jwt import PyJWKClient

from ..config import get_settings

# Deliveries older than this are refused (replay protection).
MAX_AGE_SECONDS = 5 * 60


class WebhookVerifier:
    """Verifies Neon Auth webhook signatures against the project JWKS."""

    def __init__(self, jwks_url: str) -> None:
        # PyJWKClient caches the key set and refreshes it on an unknown `kid`,
        # so key rotation needs no configuration on our side.
        self._jwks = PyJWKClient(jwks_url)

    def verify(self, raw_body: bytes, headers: Mapping[str, str]) -> dict:
        """Return the decoded payload, or raise 401.

        `raw_body` must be the untouched request bytes: re-serializing the JSON
        changes the bytes and breaks the signature.
        """
        signature = headers.get("x-neon-signature")
        kid = headers.get("x-neon-signature-kid")
        timestamp = headers.get("x-neon-timestamp")
        if not signature or not kid or not timestamp:
            raise _unauthorized("Missing webhook signature headers")

        header_segment, marker, signature_segment = signature.partition("..")
        if marker != ".." or not header_segment or not signature_segment:
            raise _unauthorized("Malformed detached JWS signature")

        if _jws_algorithm(header_segment) != "EdDSA":
            raise _unauthorized("Unexpected webhook signature algorithm")

        payload_segment = jwt.utils.base64url_encode(raw_body).decode()
        signing_input = jwt.utils.base64url_encode(
            f"{timestamp}.{payload_segment}".encode()
        )
        signing_bytes = f"{header_segment}.".encode() + signing_input

        try:
            public_key = self._jwks.get_signing_key(kid).key
            public_key.verify(
                jwt.utils.base64url_decode(signature_segment), signing_bytes
            )
        except (InvalidSignature, jwt.PyJWKClientError, ValueError, TypeError) as exc:
            raise _unauthorized("Invalid webhook signature") from exc

        _check_freshness(timestamp)
        return json.loads(raw_body)


def _jws_algorithm(header_segment: str) -> str | None:
    try:
        header = json.loads(jwt.utils.base64url_decode(header_segment))
    except (ValueError, TypeError):
        return None
    return header.get("alg") if isinstance(header, dict) else None


def _check_freshness(timestamp: str) -> None:
    try:
        sent_ms = int(timestamp)
    except ValueError as exc:
        raise _unauthorized("Invalid webhook timestamp") from exc
    if abs(time.time() - sent_ms / 1000) > MAX_AGE_SECONDS:
        raise _unauthorized("Stale webhook delivery")


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


_verifier: WebhookVerifier | None = None


def get_webhook_verifier() -> WebhookVerifier:
    """Lazily build a process-wide verifier sharing the JWKS cache."""
    global _verifier
    if _verifier is None:
        settings = get_settings()
        _verifier = WebhookVerifier(settings.neon_auth_jwks_url)
    return _verifier
