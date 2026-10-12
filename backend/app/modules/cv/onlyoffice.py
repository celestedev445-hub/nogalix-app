from __future__ import annotations

import hashlib
import hmac
import logging
import os
import secrets
import time
from typing import Any, Optional
from urllib.parse import urlencode, urlsplit


from app.core.config import settings
from app.modules.cv.import_storage import ImportMeta, ImportVariant, read_meta, resolve_document_path
from app.core.http import async_client

logger = logging.getLogger(__name__)

TOKEN_TTL_SECONDS = 60 * 60
MAX_EDITED_DOCUMENT_BYTES = 20 * 1024 * 1024
LOCAL_ENVS = {"local", "development", "dev", "test"}

# Secret éphémère (un par processus) utilisé uniquement en environnement local.
_EPHEMERAL_SECRET: Optional[bytes] = None


class ImportAccessNotConfigured(RuntimeError):
    """Aucun secret de signature configuré hors environnement local."""


def onlyoffice_enabled() -> bool:
    return bool(settings.onlyoffice_url.strip())


def _signing_secret() -> bytes:
    global _EPHEMERAL_SECRET
    secret = settings.import_access_secret.strip() or settings.onlyoffice_jwt_secret.strip()
    if secret:
        return secret.encode("utf-8")
    if (settings.app_env or "").strip().lower() in LOCAL_ENVS:
        if _EPHEMERAL_SECRET is None:
            _EPHEMERAL_SECRET = secrets.token_bytes(32)
            logger.warning(
                "IMPORT_ACCESS_SECRET et ONLYOFFICE_JWT_SECRET vides : secret éphémère généré (local uniquement)."
            )
        return _EPHEMERAL_SECRET
    raise ImportAccessNotConfigured(
        "IMPORT_ACCESS_SECRET (ou ONLYOFFICE_JWT_SECRET) doit être défini hors environnement local."
    )


def create_document_access_token(user_id: int, cv_id: str, variant: ImportVariant) -> str:
    expires_at = int(time.time()) + TOKEN_TTL_SECONDS
    payload = f"{user_id}:{cv_id}:{variant}:{expires_at}"
    signature = hmac.new(_signing_secret(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{signature}"


def verify_document_access_token(token: str) -> tuple[int, str, ImportVariant]:
    parts = token.split(":")
    if len(parts) != 5:
        raise ValueError("Token invalide.")
    user_id_raw, cv_id, variant_raw, expires_raw, signature = parts
    if variant_raw not in {"original", "editable"}:
        raise ValueError("Variante invalide.")
    payload = f"{user_id_raw}:{cv_id}:{variant_raw}:{expires_raw}"
    try:
        secret = _signing_secret()
    except ImportAccessNotConfigured as exc:
        raise ValueError("Accès aux documents non configuré.") from exc
    expected = hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise ValueError("Signature invalide.")
    try:
        user_id = int(user_id_raw)
        expires_at = int(expires_raw)
    except ValueError as exc:
        raise ValueError("Token invalide.") from exc
    if expires_at < int(time.time()):
        raise ValueError("Token expiré.")
    return user_id, cv_id, variant_raw  # type: ignore[return-value]


def document_key(user_id: int, cv_id: str, meta: ImportMeta) -> str:
    raw = f"{user_id}:{cv_id}:{meta.version}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


def _internal_api_base() -> str:
    return settings.app_internal_url.rstrip("/")


def build_document_url(user_id: int, cv_id: str, variant: ImportVariant) -> str:
    token = create_document_access_token(user_id, cv_id, variant)
    query = urlencode({"variant": variant, "token": token})
    return f"{_internal_api_base()}/api/cv/import/document/{cv_id}?{query}"


def build_callback_url(user_id: int, cv_id: str) -> str:
    token = create_document_access_token(user_id, cv_id, "editable")
    query = urlencode({"cv_id": cv_id, "token": token})
    return f"{_internal_api_base()}/api/cv/import/onlyoffice/callback?{query}"


def build_editor_config(
    *,
    user_id: int,
    cv_id: str,
    user_name: str,
    meta: ImportMeta,
    title: str,
) -> dict[str, Any]:
    document_url = build_document_url(user_id, cv_id, "editable")
    config: dict[str, Any] = {
        "document": {
            "fileType": "docx",
            "key": document_key(user_id, cv_id, meta),
            "title": title or meta.original_name,
            "url": document_url,
            "permissions": {
                "edit": True,
                "download": True,
                "print": True,
                "review": False,
                "comment": False,
            },
        },
        "documentType": "word",
        "editorConfig": {
            "callbackUrl": build_callback_url(user_id, cv_id),
            "mode": "edit",
            "lang": "fr",
            "customization": {
                "autosave": True,
                "forcesave": True,
                "compactHeader": False,
                "toolbarNoTabs": False,
            },
            "user": {
                "id": str(user_id),
                "name": user_name or "Utilisateur",
            },
        },
        "height": "100%",
        "width": "100%",
    }
    if settings.onlyoffice_jwt_secret.strip():
        config["token"] = sign_onlyoffice_payload(config)
    return config


def sign_onlyoffice_payload(payload: dict[str, Any]) -> str:
    import jwt

    return jwt.encode(payload, settings.onlyoffice_jwt_secret, algorithm="HS256")


def verify_onlyoffice_callback(body: dict[str, Any], authorization: Optional[str]) -> dict[str, Any]:
    """Vérifie le JWT OnlyOffice du callback si ONLYOFFICE_JWT_SECRET est défini.

    OnlyOffice envoie le jeton dans le champ `token` du corps ou dans l'en-tête
    `Authorization: Bearer <jwt>` (charge utile encapsulée dans `payload`).
    Retourne le corps de confiance (celui du JWT) ; lève ValueError sinon.
    """
    secret = settings.onlyoffice_jwt_secret.strip()
    if not secret:
        return body

    import jwt

    raw_token: Optional[str] = None
    from_header = False
    if isinstance(body.get("token"), str) and body["token"].strip():
        raw_token = body["token"].strip()
    elif authorization:
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1].strip():
            raw_token = parts[1].strip()
            from_header = True
    if not raw_token:
        raise ValueError("Jeton OnlyOffice manquant.")

    try:
        decoded = jwt.decode(raw_token, secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise ValueError("Jeton OnlyOffice invalide.") from exc
    if not isinstance(decoded, dict):
        raise ValueError("Jeton OnlyOffice invalide.")
    if from_header and isinstance(decoded.get("payload"), dict):
        decoded = decoded["payload"]
    return decoded


def _origin(url: str) -> Optional[tuple[str, str, int]]:
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return None
    scheme = (parts.scheme or "").lower()
    if scheme not in {"http", "https"} or not parts.hostname:
        return None
    try:
        port = parts.port or (443 if scheme == "https" else 80)
    except ValueError:
        return None
    return scheme, parts.hostname.lower(), port


def _allowed_download_origins() -> set[tuple[str, str, int]]:
    candidates = [
        settings.onlyoffice_url,
        getattr(settings, "onlyoffice_internal_url", "") or os.getenv("ONLYOFFICE_INTERNAL_URL", ""),
    ]
    origins: set[tuple[str, str, int]] = set()
    for item in candidates:
        if item and item.strip():
            origin = _origin(item)
            if origin:
                origins.add(origin)
    return origins


def is_allowed_download_url(url: str) -> bool:
    origin = _origin(url)
    return bool(origin) and origin in _allowed_download_origins()


async def download_edited_document(url: str) -> bytes:
    """Télécharge le document édité, uniquement depuis le serveur OnlyOffice (anti-SSRF)."""
    if not is_allowed_download_url(url):
        raise ValueError("URL de document OnlyOffice non autorisée.")
    async with async_client(timeout=60.0, follow_redirects=False) as client:
        async with client.stream("GET", url) as response:
            if response.is_redirect:
                raise ValueError("Redirection refusée pour le document OnlyOffice.")
            response.raise_for_status()
            buffer = bytearray()
            async for chunk in response.aiter_bytes():
                buffer.extend(chunk)
                if len(buffer) > MAX_EDITED_DOCUMENT_BYTES:
                    raise ValueError("Document OnlyOffice trop volumineux.")
    if not buffer:
        raise ValueError("Document OnlyOffice vide.")
    return bytes(buffer)


def callback_response(error: int = 0) -> dict[str, int]:
    return {"error": error}
