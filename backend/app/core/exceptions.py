import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.responses import fail

logger = logging.getLogger(__name__)

FIELD_LABELS = {
    "email": "email",
    "password": "mot de passe",
    "password_confirmation": "confirmation du mot de passe",
    "current_password": "mot de passe actuel",
    "name": "nom",
    "nom": "nom",
    "message": "message",
    "sujet": "sujet",
    "code": "code",
    "phone": "téléphone",
    "file": "fichier",
    "audio": "fichier audio",
    "avatar": "avatar",
}

STATUS_MESSAGES = {
    400: "Requête invalide.",
    401: "Non authentifié.",
    403: "Accès refusé.",
    404: "Ressource introuvable.",
    405: "Méthode non autorisée.",
    413: "Contenu trop volumineux.",
    429: "Trop de requêtes. Réessayez dans quelques instants.",
}

# Libellés anglais par défaut de Starlette (remplacés par STATUS_MESSAGES).
STARLETTE_DEFAULT_DETAILS = {
    "Bad Request",
    "Unauthorized",
    "Forbidden",
    "Not Found",
    "Method Not Allowed",
    "Request Entity Too Large",
    "Too Many Requests",
    "Internal Server Error",
}


def _french_message(item: dict[str, Any]) -> str:
    kind = str(item.get("type") or "")
    ctx = item.get("ctx") or {}
    raw = str(item.get("msg") or "Valeur invalide")

    if kind == "missing":
        return "champ requis"
    if kind == "value_error":
        # Messages métier levés par nos validateurs (déjà en français).
        text = raw.split("Value error, ", 1)[-1]
        if "email address" in text.lower():
            return "adresse invalide"
        return text
    if kind == "string_too_short":
        return f"doit contenir au moins {ctx.get('min_length', '?')} caractères"
    if kind == "string_too_long":
        return f"ne doit pas dépasser {ctx.get('max_length', '?')} caractères"
    if kind == "too_short":
        return f"doit contenir au moins {ctx.get('min_length', '?')} élément(s)"
    if kind == "too_long":
        return f"ne doit pas dépasser {ctx.get('max_length', '?')} élément(s)"
    if kind in {"string_type", "str_type"}:
        return "texte attendu"
    if kind in {"int_parsing", "int_type", "int_from_float"}:
        return "nombre entier attendu"
    if kind in {"float_parsing", "float_type"}:
        return "nombre attendu"
    if kind in {"bool_parsing", "bool_type"}:
        return "valeur vrai/faux attendue"
    if kind in {"greater_than_equal", "greater_than"}:
        return f"doit être supérieur ou égal à {ctx.get('ge', ctx.get('gt', '?'))}"
    if kind in {"less_than_equal", "less_than"}:
        return f"doit être inférieur ou égal à {ctx.get('le', ctx.get('lt', '?'))}"
    if kind in {"literal_error", "enum"}:
        return "valeur non autorisée"
    if kind in {"dict_type", "model_type", "model_attributes_type"}:
        return "objet attendu"
    if kind == "list_type":
        return "liste attendue"
    if kind == "json_invalid":
        return "JSON invalide"
    if "email" in raw.lower():
        return "adresse invalide"
    return "valeur invalide"


def _field_name(loc: tuple) -> str:
    parts = [str(part) for part in loc if not isinstance(part, int)]
    if parts and parts[0] in {"body", "query", "path", "header", "cookie", "form"}:
        parts = parts[1:]
    return parts[-1] if parts else "body"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_: Request, exc: StarletteHTTPException):
        detail = exc.detail
        if isinstance(detail, dict):
            payload = detail
        elif isinstance(detail, str) and detail and detail not in STARLETTE_DEFAULT_DETAILS:
            payload = fail(detail)
        else:
            payload = fail(STATUS_MESSAGES.get(exc.status_code, "Une erreur est survenue."))
        return JSONResponse(status_code=exc.status_code, content=payload, headers=getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError):
        errors: dict[str, list[str]] = {}
        first_message = ""
        for item in exc.errors():
            field = _field_name(tuple(item.get("loc") or ()))
            text = _french_message(item)
            errors.setdefault(field, []).append(text)
            if not first_message:
                if field == "body":
                    first_message = text[:1].upper() + text[1:]
                else:
                    first_message = f"{FIELD_LABELS.get(field, field)} : {text}"
        return JSONResponse(
            status_code=422,
            content=fail(
                first_message or "Les informations saisies sont invalides.",
                code="validation_error",
                errors=errors,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Erreur non gérée sur %s %s", request.method, request.url.path)
        payload = fail("Une erreur inattendue s'est produite.")
        if settings.app_debug:
            payload["error"] = str(exc)
        return JSONResponse(status_code=500, content=payload)
