"""En-têtes de sécurité appliqués à toutes les réponses (CSP, anti-iframe, permissions)."""

from __future__ import annotations

from functools import lru_cache
from urllib.parse import urlsplit

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings


def _onlyoffice_origins() -> list[str]:
    raw = (settings.onlyoffice_url or "").strip()
    if not raw:
        if settings.is_production:
            return []
        raw = "http://localhost:8082"
    try:
        url = urlsplit(raw)
        if not url.scheme or not url.hostname:
            raise ValueError(raw)
        port = url.port or (443 if url.scheme == "https" else 80)
        origin = f"{url.scheme}://{url.netloc}"
        alt_host = "127.0.0.1" if url.hostname == "localhost" else "localhost"
        alt = f"{url.scheme}://{alt_host}:{port}" if alt_host != url.hostname else None
        return [origin, *([alt] if alt else [])]
    except ValueError:
        return ["http://localhost:8082", "http://127.0.0.1:8082"]


@lru_cache(maxsize=1)
def security_headers() -> tuple[tuple[str, str], ...]:
    oo = " ".join(_onlyoffice_origins())
    oo_src = f" {oo}" if oo else ""
    dev = not settings.is_production
    # 'unsafe-eval' et le backend local ne sont autorisés qu'en développement (comme avant).
    eval_src = " 'unsafe-eval'" if dev else ""
    local_connect = " http://localhost:* http://127.0.0.1:*" if dev else ""
    csp = "; ".join(
        [
            "default-src 'self'",
            f"script-src 'self' 'unsafe-inline'{eval_src}{oo_src} https://js.stripe.com https://accounts.google.com https://apis.google.com https://challenges.cloudflare.com",
            f"style-src 'self' 'unsafe-inline'{oo_src} https://fonts.googleapis.com",
            "img-src 'self' data: blob: https:",
            f"font-src 'self' data:{oo_src} https://fonts.gstatic.com",
            f"connect-src 'self' https:{oo_src}{local_connect} ws: wss:",
            f"frame-src 'self' blob:{oo_src} https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://challenges.cloudflare.com",
            "worker-src 'self' blob:",
            "media-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ]
    )
    return (
        ("X-Frame-Options", "DENY"),
        ("X-Content-Type-Options", "nosniff"),
        ("Referrer-Policy", "strict-origin-when-cross-origin"),
        ("Permissions-Policy", "camera=(), microphone=(self), geolocation=()"),
        ("Content-Security-Policy", csp),
    )


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # Documentation interactive de l'API (développement) : chargée depuis un CDN.
        if scope["type"] != "http" or scope.get("path", "").startswith(("/docs", "/openapi.json")):
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for key, value in security_headers():
                    if key not in headers:
                        headers[key] = value
            await send(message)

        await self.app(scope, receive, send_wrapper)
