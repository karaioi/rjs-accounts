"""rjs-accounts API package."""

from __future__ import annotations

__version__ = "0.1.0"

__all__ = ["__version__", "main"]


def main() -> None:
    """Entry point for the `api` console script (local dev server).

    Host and port come from the environment (`HOST`/`PORT` in `.env`) — nothing
    is hardcoded here.
    """
    import uvicorn

    from api.config import get_settings

    settings = get_settings()
    uvicorn.run("api.main:app", host=settings.host, port=settings.port, reload=True)
