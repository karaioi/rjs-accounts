"""FastAPI application: authentication, tenancy, and RBAC for rjs-accounts."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .middleware import RateLimitMiddleware
from .routers import (
    audit,
    auth_gate,
    auth_webhooks,
    customers,
    me,
    members,
    organizations,
    reference,
    registration,
    users,
)

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="rjs-accounts API",
    version="0.1.0",
    description="Authentication, multi-tenant authorization, and RBAC.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

API_PREFIX = "/api/v1"

app.include_router(me.router, prefix=API_PREFIX)
app.include_router(reference.router, prefix=API_PREFIX)
app.include_router(auth_gate.router, prefix=API_PREFIX)
app.include_router(auth_webhooks.router, prefix=API_PREFIX)
app.include_router(registration.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(customers.router, prefix=API_PREFIX)
app.include_router(organizations.router, prefix=API_PREFIX)
app.include_router(members.router, prefix=API_PREFIX)
app.include_router(audit.router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness probe. Does not touch the database."""
    return {"status": "ok", "environment": settings.environment}
