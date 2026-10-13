"""Global API rate limiting middleware.

Enforces an IP or user token rate limit across all `/api/v1/*` routes,
attaching standard X-RateLimit-* headers to responses.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from ..services.rate_limit import consume

logger = logging.getLogger("api.middleware.rate_limit")

DEFAULT_GLOBAL_LIMIT = 120
DEFAULT_GLOBAL_WINDOW_SECONDS = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Enforce a baseline rate limit on every /api/v1/ request."""

    def __init__(
        self,
        app,
        limit: int = DEFAULT_GLOBAL_LIMIT,
        window_seconds: int = DEFAULT_GLOBAL_WINDOW_SECONDS,
    ) -> None:
        super().__init__(app)
        self.limit = limit
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if not path.startswith("/api/v1"):
            return await call_next(request)

        # Subject determination: authenticated token or client IP
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            token_digest = hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]
            subject = f"token:{token_digest}"
        else:
            client_ip = request.client.host if request.client else "unknown"
            subject = f"ip:{client_ip}"

        try:
            result = consume(
                bucket="api.global",
                subject=subject,
                limit=self.limit,
                window_seconds=self.window_seconds,
            )
        except Exception as exc:
            # If the database limiter fails, log and allow through rather than taking down the API
            logger.warning("Global rate limit check failed: %s", exc)
            return await call_next(request)

        if not result.allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please wait before trying again."},
                headers={
                    "Retry-After": str(result.retry_after),
                    "X-RateLimit-Limit": str(result.limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(result.reset_at.timestamp())),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(result.limit)
        response.headers["X-RateLimit-Remaining"] = str(result.remaining)
        response.headers["X-RateLimit-Reset"] = str(int(result.reset_at.timestamp()))
        return response
