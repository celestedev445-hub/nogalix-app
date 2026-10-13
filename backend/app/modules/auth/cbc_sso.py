"""Connexion « Se connecter avec CBC » (mini-SSO de Contacts Business Center).

1. GET /api/auth/cbc/start    : state aléatoire en cookie, redirection vers la page /sso de CBC.
2. CBC renvoie sur GET /api/auth/cbc/callback?code=…&state=… ;
   le serveur vérifie le state, échange le code (serveur à serveur, avec le secret)
   contre le profil CBC, puis ouvre la session Nogalix (cookie HttpOnly).
"""

from __future__ import annotations

import base64
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode, urlsplit

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.http import async_client
from app.core.limiter import limiter
from app.modules.auth.service import issue_token
from app.modules.plans.models import Plan
from app.modules.users.models import Notification, User
from app.web.session import cookie_secure, set_cookie_header

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])

STATE_COOKIE = "cbc_sso_state"
STATE_COOKIE_PATH = "/api/auth/cbc"
STATE_TTL_SECONDS = 600
CALLBACK_PATH = "/api/auth/cbc/callback"
LOGIN_PATH = "/auth/login"
DEFAULT_NEXT = "/dashboard"


def _safe_next(value: Optional[str]) -> str:
    """Chemin interne uniquement (même règle que safeRedirectPath côté site)."""
    path = (value or "").strip()
    if not path.startswith("/") or path.startswith("//") or "://" in path:
        return DEFAULT_NEXT
    if any(ch in path for ch in ("\0", "\r", "\n", "\\")):
        return DEFAULT_NEXT
    return path


def _redirect_uri() -> str:
    return f"{settings.public_app_url}{CALLBACK_PATH}"


def _cbc_site_url() -> str:
    return (settings.cbc_sso_url or settings.cbc_url or "").strip().rstrip("/")


def _cbc_token_url() -> str:
    base = (settings.cbc_sso_api_url or "").strip().rstrip("/")
    if not base.endswith("/api"):
        base = f"{base}/api"
    return f"{base}/sso/token"


def _login_error(code: str) -> RedirectResponse:
    response = RedirectResponse(f"{LOGIN_PATH}?{urlencode({'cbc_error': code})}", status_code=303)
    _clear_state_cookie(response)
    return response


def _state_cookie(value: str, max_age: int) -> str:
    parts = [f"{STATE_COOKIE}={value}", f"Path={STATE_COOKIE_PATH}", f"Max-Age={max_age}"]
    if cookie_secure():
        parts.append("Secure")
    # Lax : le cookie accompagne le retour de CBC (navigation GET de premier niveau).
    parts += ["HttpOnly", "SameSite=lax"]
    return "; ".join(parts)


def _clear_state_cookie(response: RedirectResponse) -> None:
    response.headers.append("set-cookie", _state_cookie("", 0))


def _encode_next(path: str) -> str:
    return base64.urlsafe_b64encode(path.encode("utf-8")).decode("ascii").rstrip("=")


def _decode_next(raw: str) -> str:
    try:
        return _safe_next(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return DEFAULT_NEXT


@router.get("/start")
@limiter.limit("20/minute")
def start(request: Request, suivant: Optional[str] = None):
    if not settings.cbc_sso_enabled:
        return _login_error("not_configured")

    # Le cookie de state doit être posé sur l'hôte qui recevra le retour de CBC
    # (ex. 127.0.0.1:8010 → localhost:8010 en local).
    public_host = urlsplit(settings.public_app_url).netloc.lower()
    request_host = (request.headers.get("host") or "").split(",")[0].strip().lower()
    if public_host and request_host and request_host != public_host:
        query = urlencode({"suivant": suivant}) if suivant else ""
        target = f"{settings.public_app_url}/api/auth/cbc/start"
        return RedirectResponse(f"{target}?{query}" if query else target, status_code=303)

    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.cbc_sso_client_id.strip(),
        "redirect_uri": _redirect_uri(),
        "state": state,
    }
    response = RedirectResponse(f"{_cbc_site_url()}/sso?{urlencode(params)}", status_code=303)
    response.headers.append(
        "set-cookie",
        _state_cookie(f"{state}.{_encode_next(_safe_next(suivant))}", STATE_TTL_SECONDS),
    )
    return response


async def _exchange_code(code: str) -> Optional[dict]:
    try:
        async with async_client(timeout=10) as client:
            response = await client.post(
                _cbc_token_url(),
                json={
                    "client_id": settings.cbc_sso_client_id.strip(),
                    "client_secret": settings.cbc_sso_client_secret.strip(),
                    "code": code,
                    "redirect_uri": _redirect_uri(),
                },
                headers={"Accept": "application/json"},
            )
    except Exception:
        logger.exception("CBC SSO : échange du code impossible")
        return None

    if response.status_code != 200:
        logger.warning("CBC SSO : échange refusé (%s) %s", response.status_code, response.text[:200])
        return None
    try:
        user = response.json().get("user")
    except ValueError:
        return None
    if not isinstance(user, dict) or not user.get("id") or not user.get("email"):
        return None
    return user


class CbcAccountConflict(Exception):
    """Le compte Nogalix de cet e-mail est déjà lié à un autre compte CBC."""


# Pack CBC → forfait Nogalix. Sans pack actif, le compte reste sur Gratuit.
CBC_PACK_PLAN = {
    "basic": "gratuit",
    "basique": "gratuit",
    "pro": "pro",
    "gold": "premium",
}

CBC_OFFER_MESSAGE = {
    "basic": (
        "Votre connexion avec CBC active le forfait Gratuit, celui de votre pack Basic. "
        "Il est actif sur votre compte."
    ),
    "pro": (
        "Votre connexion avec CBC vous offre le forfait Pro, celui de votre pack Pro. "
        "Il est actif sur votre compte."
    ),
    "gold": (
        "Votre connexion avec CBC vous offre le forfait Premium, celui de votre pack Gold. "
        "Il est actif sur votre compte."
    ),
    "free": (
        "Votre connexion avec CBC active le forfait Gratuit. Il est actif sur votre compte."
    ),
}


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _subscription_active(user: User, now: datetime) -> bool:
    """Un forfait sans échéance reste actif. Une date passée ne l'est plus."""
    if not user.plan_id:
        return False
    if user.plan_expires_at is None:
        return True
    return _as_utc(user.plan_expires_at) > now


def _cbc_offer_key(profile: dict) -> str:
    """basic, pro, gold, ou free quand CBC n'a pas de pack actif."""
    raw = profile.get("pack")
    if isinstance(raw, dict):
        raw = raw.get("name")
    key = str(raw or "").strip().lower()
    if key in CBC_PACK_PLAN:
        return "basic" if key == "basique" else key
    return "free"


def _plan_by_slug(db: Session, slug: str) -> Optional[Plan]:
    return (
        db.query(Plan)
        .filter(Plan.slug == slug, Plan.is_active.is_(True))
        .first()
    )


def _align_cbc_plan(db: Session, user: User, profile: dict) -> Optional[str]:
    """Aligne le forfait Nogalix sur le pack CBC.

    Basic → Gratuit, Pro → Pro, Gold → Premium. Sans pack, Gratuit.
    Un forfait Nogalix payé, encore en cours et plus élevé, n'est pas rétrogradé.
    Un cadeau permanent qui ne correspond plus au pack est corrigé.
    Retourne la clé d'alerte seulement quand le forfait vient de changer.
    """
    offer = _cbc_offer_key(profile)
    slug = CBC_PACK_PLAN.get(offer, "gratuit")
    target = _plan_by_slug(db, slug)
    if target is None:
        logger.warning("CBC SSO : plan %s introuvable, forfait CBC non appliqué", slug)
        if user.plan_id is None:
            from app.modules.plans.seed import get_default_free_plan

            free = get_default_free_plan(db)
            if free:
                user.plan_id = free.id
                db.add(user)
        return None

    now = datetime.now(timezone.utc)
    current = db.query(Plan).filter(Plan.id == user.plan_id).first() if user.plan_id else None
    already = (
        current is not None
        and current.id == target.id
        and _subscription_active(user, now)
        and user.plan_expires_at is None
    )
    if already:
        return None

    paid_higher = (
        current is not None
        and _subscription_active(user, now)
        and user.plan_expires_at is not None
        and int(current.level) > int(target.level)
    )
    if paid_higher:
        return None

    user.plan_id = target.id
    user.plan_expires_at = None
    user.plan_reminder_stage = 0
    user.ai_trials_used = 0
    user.ai_trials_period = None
    db.add(user)
    db.add(
        Notification(
            user_id=user.id,
            type="cbc_plan",
            kind="plan",
            message=CBC_OFFER_MESSAGE[offer],
            href="/plans",
            actor="Nogalix",
        )
    )
    return offer


def _with_query_flag(path: str, key: str, value: str) -> str:
    separator = "&" if "?" in path else "?"
    return f"{path}{separator}{urlencode({key: value})}"


def _find_or_create_user(db: Session, profile: dict) -> tuple[User, Optional[str]]:
    cbc_id = int(profile["id"])
    email = str(profile["email"]).strip().lower()

    user = db.query(User).filter(User.cbc_id == cbc_id).first()
    if not user:
        # CBC vérifie l'adresse e-mail (code par e-mail) avant toute connexion SSO.
        user = db.query(User).filter(User.email == email).first()

    if user:
        if user.cbc_id is not None and user.cbc_id != cbc_id:
            raise CbcAccountConflict()
        user.cbc_id = cbc_id
        if user.email_verified_at is None:
            user.email_verified_at = datetime.now(timezone.utc)
            user.email_verify_code = None
            user.email_verify_expires_at = None
        if not user.phone and profile.get("phone"):
            user.phone = str(profile["phone"])[:40]
        db.add(user)
    else:
        location = ", ".join(str(profile[key]) for key in ("city", "country") if profile.get(key))
        user = User(
            name=(str(profile.get("name") or "").strip() or email.split("@")[0])[:120],
            email=email,
            cbc_id=cbc_id,
            phone=str(profile["phone"])[:40] if profile.get("phone") else None,
            location=location[:190] or None,
            status="active",
            role="user",
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        db.add(
            Notification(
                user_id=user.id,
                type="systeme",
                kind="systeme",
                message="Bienvenue sur Nogalix. Créez votre premier CV pour démarrer.",
                href="/cv/nouveau",
                actor="Nogalix",
            )
        )

    # Compte désactivé : on garde le lien CBC, sans changer le forfait ni ouvrir de session.
    offer = _align_cbc_plan(db, user, profile) if user.status == "active" else None
    db.commit()
    db.refresh(user)
    return user, offer


@router.get("/callback")
@limiter.limit("20/minute")
async def callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    stored = request.cookies.get(STATE_COOKIE) or ""
    stored_state, _, encoded_next = stored.partition(".")

    if error:
        return _login_error("cancelled")
    if not code or not state or not stored_state or not secrets.compare_digest(stored_state, state):
        return _login_error("invalid_state")
    if not settings.cbc_sso_enabled:
        return _login_error("not_configured")

    profile = await _exchange_code(code)
    if not profile:
        return _login_error("failed")

    try:
        user, offer = _find_or_create_user(db, profile)
    except CbcAccountConflict:
        return _login_error("account_conflict")
    if user.status != "active":
        return _login_error("account_disabled")

    token = issue_token(db, user)
    destination = _decode_next(encoded_next)
    if offer:
        destination = _with_query_flag(destination, "cbc_offer", offer)
    response = RedirectResponse(
        f"{settings.public_app_url}{destination}",
        status_code=303,
    )
    _clear_state_cookie(response)
    response.headers.append("set-cookie", set_cookie_header(token))
    return response
