from typing import Any, Optional


from app.core.config import settings
from app.core.http import async_client


LOCAL_ENVS = {"local", "development", "dev", "test"}


def _is_local_env() -> bool:
    return (settings.app_env or "").strip().lower() in LOCAL_ENVS


def _client_id() -> str:
    return (settings.google_client_id or "").strip()


def _require_client_id_outside_local() -> None:
    if not _client_id() and not _is_local_env():
        raise GoogleAuthError("Google OAuth non configuré.", "google_not_configured")


def _email_verified(value: Any) -> bool:
    return value is True or str(value or "").strip().lower() in {"true", "1"}


def _audience_ok(*values: Any) -> bool:
    """Vrai si GOOGLE_CLIENT_ID est vide (local uniquement) ou figure dans aud/azp."""
    client_id = _client_id()
    if not client_id:
        return _is_local_env()
    return any(str(value or "").strip() == client_id for value in values)


class GoogleAuthError(Exception):
    def __init__(self, message: str, code: str = "google_auth_failed"):
        super().__init__(message)
        self.message = message
        self.code = code


async def resolve_google_profile(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Accepts id_token / credential / access_token / code (CBC-compatible).
    Returns { google_id, email, name, avatar }.
    """
    id_token = payload.get("id_token") or payload.get("credential")
    access_token = payload.get("access_token")
    code = payload.get("code")

    if id_token:
        return await _from_id_token(str(id_token))
    if access_token:
        return await _from_access_token(str(access_token))
    if code:
        tokens = await _exchange_code(str(code))
        if tokens.get("id_token"):
            return await _from_id_token(str(tokens["id_token"]))
        if tokens.get("access_token"):
            return await _from_access_token(str(tokens["access_token"]))

    raise GoogleAuthError("Jeton Google manquant.", "google_auth_required")


async def _from_id_token(token: str) -> dict[str, Any]:
    _require_client_id_outside_local()

    async with async_client(timeout=15.0) as client:
        response = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": token},
        )
    if response.status_code != 200:
        raise GoogleAuthError("Jeton Google invalide.")
    data = response.json()
    if not _audience_ok(data.get("aud")):
        raise GoogleAuthError("Audience Google invalide.", "google_invalid_audience")
    if not _email_verified(data.get("email_verified")):
        raise GoogleAuthError("Email Google non vérifié.", "google_email_unverified")
    email = data.get("email")
    if not email:
        raise GoogleAuthError("Email Google introuvable.")
    return {
        "google_id": str(data.get("sub") or ""),
        "email": str(email).lower(),
        "name": str(data.get("name") or email.split("@")[0]),
        "avatar": data.get("picture"),
    }


async def _from_access_token(token: str) -> dict[str, Any]:
    _require_client_id_outside_local()
    async with async_client(timeout=15.0) as client:
        # Vérifie que le jeton a bien été émis pour NOTRE client OAuth (aud/azp),
        # sinon un jeton obtenu par une autre application pourrait être rejoué ici.
        info = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"access_token": token},
        )
        if info.status_code != 200:
            raise GoogleAuthError("Token Google invalide.")
        token_info = info.json()
        if not _audience_ok(token_info.get("aud"), token_info.get("azp")):
            raise GoogleAuthError("Audience Google invalide.", "google_invalid_audience")
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
        )
    if response.status_code != 200:
        raise GoogleAuthError("Token Google invalide.")
    data = response.json()
    if not _email_verified(data.get("email_verified", token_info.get("email_verified"))):
        raise GoogleAuthError("Email Google non vérifié.", "google_email_unverified")
    if token_info.get("sub") and data.get("sub") and str(token_info["sub"]) != str(data["sub"]):
        raise GoogleAuthError("Token Google invalide.")
    email = data.get("email")
    if not email:
        raise GoogleAuthError("Email Google introuvable.")
    return {
        "google_id": str(data.get("sub") or ""),
        "email": str(email).lower(),
        "name": str(data.get("name") or email.split("@")[0]),
        "avatar": data.get("picture"),
    }


async def _exchange_code(code: str) -> dict[str, Any]:
    if not settings.google_client_id or not settings.google_client_secret:
        raise GoogleAuthError("Google OAuth non configuré.")
    async with async_client(timeout=15.0) as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
    if response.status_code != 200:
        raise GoogleAuthError("Échange du code Google impossible.")
    return response.json()
