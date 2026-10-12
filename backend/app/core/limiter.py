"""Limitation de débit (slowapi).

- Clé = IP client. `X-Forwarded-For` (premier IP) n'est pris en compte que si la
  requête arrive d'un proxy de confiance (TRUSTED_PROXIES, défaut 127.0.0.1,::1),
  typiquement le reverse proxy (Caddy). Sinon on utilise l'IP de la socket.
- RATELIMIT_STORAGE_URI (ex. redis://localhost:6379/0) partage les compteurs entre
  workers ; par défaut stockage mémoire (par processus).
"""

from __future__ import annotations

import ipaddress
import os
from functools import lru_cache

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

RATE_LIMIT_MESSAGE = "Trop de requêtes. Réessayez dans quelques instants."


@lru_cache(maxsize=1)
def _trusted_networks() -> tuple:
    raw = os.getenv("TRUSTED_PROXIES", "127.0.0.1,::1")
    networks = []
    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        try:
            networks.append(ipaddress.ip_network(item, strict=False))
        except ValueError:
            continue
    return tuple(networks)


def _is_trusted_proxy(host: str | None) -> bool:
    if not host:
        return False
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return False
    return any(address in network for network in _trusted_networks())


def _valid_ip(value: str) -> str | None:
    candidate = value.strip()
    try:
        ipaddress.ip_address(candidate)
    except ValueError:
        return None
    return candidate


def client_ip(request: Request) -> str:
    peer = request.client.host if request.client else None
    if _is_trusted_proxy(peer):
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            first = _valid_ip(forwarded.split(",", 1)[0])
            if first:
                return first
    return peer or "127.0.0.1"


def _limiter_kwargs() -> dict:
    kwargs: dict = {"key_func": client_ip, "default_limits": []}
    storage_uri = os.getenv("RATELIMIT_STORAGE_URI", "").strip()
    if storage_uri:
        kwargs["storage_uri"] = storage_uri
    return kwargs


limiter = Limiter(**_limiter_kwargs())


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Réponse 429 en français (à enregistrer dans main.py)."""
    response = JSONResponse(
        status_code=429,
        content={"success": False, "message": RATE_LIMIT_MESSAGE},
    )
    view_limit = getattr(request.state, "view_rate_limit", None)
    if view_limit is not None:
        try:
            response = request.app.state.limiter._inject_headers(response, view_limit)
        except Exception:
            pass
    return response
