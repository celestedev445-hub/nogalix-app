"""Session du site par cookie HttpOnly.

Le navigateur n'a jamais accès au jeton :
- à la connexion (`/api/auth/login|register|google`), le jeton renvoyé par l'API est
  retiré de la réponse et posé dans le cookie HttpOnly `nogalix_session` ;
- à chaque appel `/api/*`, le cookie est converti en en-tête `Authorization: Bearer` ;
- sur une réponse 401 ou après `/api/auth/logout`, le cookie est effacé ;
- les requêtes modifiantes venant d'un navigateur doivent provenir du site (CSRF).

Les clients qui envoient eux-mêmes `Authorization` (scripts, tests) ne sont pas concernés,
ni les appels serveur à serveur (webhooks, OnlyOffice) qui n'ont ni cookie ni Origin.
"""

from __future__ import annotations

import json
from email.utils import formatdate
from http.cookies import SimpleCookie
from time import time
from typing import Any, Optional
from urllib.parse import urlsplit

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings

# Nom distinct de CBC (`authToken`) : les cookies localhost ne distinguent pas le port.
AUTH_COOKIE = "nogalix_session"
MAX_TOKEN_LENGTH = 2048
ISSUE_PATHS = {"/api/auth/login", "/api/auth/register", "/api/auth/google"}
LOGOUT_PATH = "/api/auth/logout"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
FORBIDDEN_ORIGIN = {"message": "Origine non autorisée."}


# ---------------------------------------------------------------------------
# Cookie
# ---------------------------------------------------------------------------

def cookie_secure() -> bool:
    raw = (settings.auth_cookie_secure or "").strip().lower()
    if raw in {"true", "1"}:
        return True
    if raw in {"false", "0"}:
        return False
    return settings.is_production


def cookie_max_age() -> int:
    minutes = settings.auth_token_ttl_minutes if settings.auth_token_ttl_minutes > 0 else 60 * 24
    return minutes * 60


def _cookie_header(value: str, max_age: int) -> str:
    expires = formatdate(time() + max_age, usegmt=True) if max_age > 0 else "Thu, 01 Jan 1970 00:00:00 GMT"
    parts = [f"{AUTH_COOKIE}={value}", "Path=/", f"Expires={expires}", f"Max-Age={max_age}"]
    if cookie_secure():
        parts.append("Secure")
    parts += ["HttpOnly", "SameSite=lax"]
    return "; ".join(parts)


def set_cookie_header(token: str) -> str:
    return _cookie_header(token, cookie_max_age())


def clear_cookie_header() -> str:
    return _cookie_header("", 0)


def read_cookie_token(headers: Headers) -> Optional[str]:
    raw = headers.get("cookie")
    if not raw:
        return None
    jar = SimpleCookie()
    try:
        jar.load(raw)
    except Exception:
        # Cookie mal formé ailleurs dans l'en-tête : extraction manuelle.
        for part in raw.split(";"):
            name, _, value = part.strip().partition("=")
            if name == AUTH_COOKIE:
                return value or None
        return None
    morsel = jar.get(AUTH_COOKIE)
    return morsel.value if morsel and morsel.value else None


def is_plausible_token(token: Optional[str]) -> bool:
    """Jeton opaque plausible (l'API reste seule juge de sa validité)."""
    return bool(token) and len(token) <= MAX_TOKEN_LENGTH and not any(ch.isspace() for ch in token)


# ---------------------------------------------------------------------------
# Origine (CSRF)
# ---------------------------------------------------------------------------

def _origin_of(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        parts = urlsplit(value.strip())
    except ValueError:
        return None
    if not parts.scheme or not parts.netloc:
        return None
    return f"{parts.scheme}://{parts.netloc}".lower()


def allowed_origins(scope: Scope, headers: Headers) -> set[str]:
    origins: set[str] = set()
    host = (headers.get("host") or "").split(",")[0].strip().lower()
    if host:
        origins.add(f"{scope.get('scheme', 'http')}://{host}")
    candidates = [settings.frontend_url, settings.app_url, *(settings.frontend_urls or "").split(",")]
    candidates += settings.cors_origins
    for raw in candidates:
        origin = _origin_of(raw)
        if origin:
            origins.add(origin)
    return origins


def is_allowed_origin(scope: Scope, headers: Headers) -> bool:
    """L'en-tête Origin (ou Referer) doit correspondre au site ; sans les deux, seul
    `Sec-Fetch-Site: same-origin` est accepté."""
    origin = _origin_of(headers.get("origin")) or _origin_of(headers.get("referer"))
    if not origin:
        return headers.get("sec-fetch-site") == "same-origin"
    return origin in allowed_origins(scope, headers)


def _is_browser_request(headers: Headers) -> bool:
    return bool(headers.get("origin") or headers.get("referer") or headers.get("sec-fetch-site"))


# ---------------------------------------------------------------------------
# Réponses de connexion : jeton → cookie
# ---------------------------------------------------------------------------

def extract_token(payload: Any) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    data = payload.get("data")
    candidates = [payload.get("token"), payload.get("access_token")]
    if isinstance(data, dict):
        candidates.append(data.get("token"))
    for value in candidates:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def strip_tokens(payload: Any) -> Any:
    if not isinstance(payload, dict):
        return payload
    clone = {key: value for key, value in payload.items() if key not in {"token", "access_token"}}
    data = clone.get("data")
    if isinstance(data, dict):
        clone["data"] = {key: value for key, value in data.items() if key not in {"token", "access_token"}}
    return clone


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

class WebSessionMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        path: str = scope.get("path", "") if scope["type"] == "http" else ""
        if scope["type"] != "http" or not (path == "/api" or path.startswith("/api/")):
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        method = scope["method"].upper()
        explicit_bearer = "authorization" in headers
        raw_token = read_cookie_token(headers)
        token = raw_token if is_plausible_token(raw_token) else None
        browser = _is_browser_request(headers)

        if (
            method not in SAFE_METHODS
            and not explicit_bearer
            and (raw_token or browser)
            and not is_allowed_origin(scope, headers)
        ):
            response = JSONResponse(FORBIDDEN_ORIGIN, status_code=403)
            await response(scope, receive, send)
            return

        if token and not explicit_bearer:
            scope = dict(scope)
            scope["headers"] = [*scope["headers"], (b"authorization", f"Bearer {token}".encode("latin-1"))]

        web_client = not explicit_bearer and (bool(raw_token) or browser)
        normalized = path.rstrip("/") or path
        issue = web_client and browser and method == "POST" and normalized in ISSUE_PATHS
        logout = web_client and normalized == LOGOUT_PATH

        if not web_client:
            await self.app(scope, receive, send)
            return

        start: Optional[Message] = None
        buffered: list[bytes] = []
        buffering = False

        async def send_wrapper(message: Message) -> None:
            nonlocal start, buffering
            if message["type"] == "http.response.start":
                status = message["status"]
                response_headers = MutableHeaders(scope=message)
                if status == 401 or (logout and 200 <= status < 300) or (raw_token and not token):
                    response_headers.append("set-cookie", clear_cookie_header())
                content_type = response_headers.get("content-type", "")
                if issue and 200 <= status < 300 and "application/json" in content_type:
                    start = message
                    buffering = True
                    return
                await send(message)
                return

            if message["type"] == "http.response.body" and buffering:
                buffered.append(message.get("body", b""))
                if message.get("more_body", False):
                    return
                body = b"".join(buffered)
                assert start is not None
                response_headers = MutableHeaders(scope=start)
                try:
                    payload = json.loads(body.decode("utf-8")) if body else None
                except ValueError:
                    payload = None
                issued = extract_token(payload)
                if issued:
                    body = json.dumps(strip_tokens(payload), ensure_ascii=False, separators=(",", ":")).encode("utf-8")
                    response_headers["content-length"] = str(len(body))
                    response_headers.append("set-cookie", set_cookie_header(issued))
                await send(start)
                await send({"type": "http.response.body", "body": body, "more_body": False})
                return

            await send(message)

        await self.app(scope, receive, send_wrapper)


# ---------------------------------------------------------------------------
# /api/auth/cookie — état de session pour le navigateur
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/auth", tags=["web"], include_in_schema=False)


@router.get("/cookie")
def cookie_state(request: Request):
    """État de session pour le client (la valeur du jeton n'est jamais exposée)."""
    return {"authenticated": bool(read_cookie_token(request.headers))}


@router.delete("/cookie")
def cookie_clear():
    """Efface le cookie HttpOnly (l'origine est vérifiée par le middleware)."""
    response = JSONResponse({"ok": True})
    response.headers.append("set-cookie", clear_cookie_header())
    return response


@router.post("/cookie")
async def cookie_set(request: Request):
    """Pose le cookie à partir d'un jeton — outil de développement uniquement (404 en production)."""
    if settings.is_production:
        return JSONResponse({"message": "Introuvable."}, status_code=404)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"message": "Corps invalide."}, status_code=400)
    token = body.get("token") if isinstance(body, dict) else None
    token = token.strip() if isinstance(token, str) else ""
    if not token or len(token) > MAX_TOKEN_LENGTH:
        return JSONResponse({"message": "Jeton invalide."}, status_code=400)
    response = JSONResponse({"ok": True})
    response.headers.append("set-cookie", set_cookie_header(token))
    return response
