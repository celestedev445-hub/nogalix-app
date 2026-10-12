"""Compression gzip des pages et réponses API (les fichiers du site sont déjà précompressés).

Utile quand aucun proxy ne compresse (Caddy le fait en production, pas uvicorn seul).
Les images, polices et fichiers déjà compressés passent tels quels.
"""

from __future__ import annotations

from starlette.middleware.gzip import GZipMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

SKIPPED_SUFFIXES = (
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".woff", ".woff2",
    ".pdf", ".zip", ".docx", ".mp3", ".mp4", ".webm", ".br", ".gz",
)
SKIPPED_PREFIXES = ("/_image", "/storage/", "/assets/")


class CompressionMiddleware:
    def __init__(self, app: ASGIApp, minimum_size: int = 1024) -> None:
        self.app = app
        self.gzip = GZipMiddleware(app, minimum_size=minimum_size, compresslevel=6)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        path = scope.get("path", "") if scope["type"] == "http" else ""
        if (
            scope["type"] != "http"
            or path.startswith(SKIPPED_PREFIXES)
            or path.lower().endswith(SKIPPED_SUFFIXES)
            or "/file" in path
            or "/document/" in path
        ):
            await self.app(scope, receive, send)
            return
        await self.gzip(scope, receive, send)
