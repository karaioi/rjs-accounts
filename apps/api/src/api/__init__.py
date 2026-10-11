"""rjs-accounts API package."""

from __future__ import annotations

__version__ = "0.1.0"

__all__ = ["__version__", "main"]


def main() -> None:
    """Entry point for the `api` console script (local dev server)."""
    import uvicorn

    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)
