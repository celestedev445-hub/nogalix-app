"""Pays du visiteur à partir de son IP (ip-api, repli ipwho.is), comme CBC."""

from __future__ import annotations

import ipaddress
import logging
import time

import httpx
from fastapi import APIRouter, Request

from app.core.limiter import client_ip
from app.core.http import async_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["web"], include_in_schema=False)

EMPTY = {"ip": "", "country": "", "city": "", "countryCode": ""}
TIMEOUT = httpx.Timeout(8.0, connect=5.0)
# Pays d'une IP : stable, inutile de rappeler les services externes (1 à 2 s) à chaque ouverture du paiement.
CACHE_TTL_SECONDS = 6 * 3600
CACHE_MAX_ENTRIES = 5000
_cache: dict[str, tuple[float, dict]] = {}


def _is_private(ip: str) -> bool:
    raw = (ip or "").strip().lower()
    if not raw or raw in {"localhost", "0.0.0.0"}:
        return True
    if raw.startswith("::ffff:"):
        raw = raw[len("::ffff:"):]
    try:
        address = ipaddress.ip_address(raw)
    except ValueError:
        return True
    return address.is_private or address.is_loopback or address.is_unspecified or address.is_link_local


async def _from_ipwho(client: httpx.AsyncClient, ip: str = "") -> dict:
    url = f"https://ipwho.is/{ip}" if ip else "https://ipwho.is/"
    data = (await client.get(url)).json()
    if data.get("success") is False or not data.get("country_code"):
        raise ValueError("Géolocalisation ipwho.is indisponible")
    return {
        "ip": data.get("ip") or ip or "",
        "country": data.get("country") or "",
        "city": data.get("city") or "",
        "countryCode": str(data.get("country_code") or "").strip().lower(),
    }


async def _from_ip_api(client: httpx.AsyncClient, ip: str) -> dict:
    data = (
        await client.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,message,country,countryCode,city,query"},
        )
    ).json()
    if data.get("status") == "fail":
        raise ValueError(data.get("message") or "Erreur lors de la géolocalisation")
    return {
        "ip": data.get("query") or ip,
        "country": data.get("country") or "",
        "city": data.get("city") or "",
        "countryCode": str(data.get("countryCode") or "").strip().lower(),
    }


async def resolve_geolocation(ip: str) -> dict:
    resolved = (ip or "").split(",")[0].strip()
    async with async_client(timeout=TIMEOUT) as client:
        if _is_private(resolved):
            resolved = ""
        if not resolved:
            resolved = str((await client.get("https://api64.ipify.org", params={"format": "json"})).json().get("ip") or "")
        if _is_private(resolved):
            resolved = ""
        if resolved:
            try:
                return await _from_ip_api(client, resolved)
            except Exception:
                return await _from_ipwho(client, resolved)
        return await _from_ipwho(client)


@router.get("/api/geoLocalisation")
async def geo_localisation(request: Request):
    ip = client_ip(request)
    cached = _cache.get(ip)
    if cached and cached[0] > time.monotonic():
        return dict(cached[1])
    try:
        result = await resolve_geolocation(ip)
    except Exception as exc:  # réseau indisponible : réponse vide, comme avant
        logger.info("Géolocalisation indisponible : %s", exc)
        return dict(EMPTY)
    if result.get("countryCode"):
        if len(_cache) >= CACHE_MAX_ENTRIES:
            _cache.clear()
        _cache[ip] = (time.monotonic() + CACHE_TTL_SECONDS, dict(result))
    return result
