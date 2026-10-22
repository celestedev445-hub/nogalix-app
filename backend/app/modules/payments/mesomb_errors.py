"""Codes d'erreur MeSomb → message lisible pour le payeur.

Aligné sur MeSombClientErrors de contactBusinessCenter.
Doc : https://docs.mesomb.com/development/errors
"""

from __future__ import annotations

import re
from typing import Any, Optional

KNOWN_CODES = (
    "subscriber-insufficient-balance",
    "subscriber-not-found",
    "subscriber-internal-error",
    "subscriber-timeout",
    "subscriber-invalid-secret-code",
    "subscriber-limit-reached",
    "subscriber-invalid-min-amount",
    "subscriber-invalid-max-amount",
    "subscriber-invalid-length",
    "subscriber-withdrawal-failed",
    "provider-application-problem",
    "provider-second-number-not-found",
    "invalid-amount",
    "generic-error",
    "unknown-issue",
)

CODE_KEYS = ("code", "error_code", "errorCode", "failure_code", "failureCode")
MESSAGE_KEYS = ("details", "detail", "failure_message", "failureReason", "statusMessage", "comment")
FALLBACK = (
    "Le paiement a été refusé par l'opérateur. Causes fréquentes : solde insuffisant, "
    "code PIN incorrect ou demande annulée sur le téléphone."
)

_CLIENT_MESSAGES = {
    "subscriber-insufficient-balance": "Solde Mobile Money insuffisant. Rechargez votre compte, puis réessayez.",
    "subscriber-not-found": "Ce numéro Mobile Money n'existe pas. Vérifiez le numéro et réessayez.",
    "subscriber-internal-error": (
        "Le paiement n'a pas abouti (solde insuffisant, PIN incorrect ou délai dépassé). Vérifiez et réessayez."
    ),
    "subscriber-timeout": "La confirmation a expiré. Réessayez et validez plus vite sur votre téléphone.",
    "subscriber-invalid-secret-code": "Code PIN incorrect. Réessayez et saisissez le bon code.",
    "subscriber-limit-reached": "Ce compte a atteint sa limite de transactions. Réessayez plus tard ou avec un autre numéro.",
    "subscriber-invalid-min-amount": "Le montant est inférieur au minimum autorisé par l'opérateur.",
    "subscriber-invalid-max-amount": "Le montant dépasse le maximum autorisé par l'opérateur.",
    "subscriber-invalid-length": "Le numéro de téléphone Mobile Money est invalide.",
    "subscriber-withdrawal-failed": "Le virement Mobile Money a échoué.",
    "provider-application-problem": "L'opérateur Mobile Money a rencontré un problème. Réessayez plus tard.",
    "provider-second-number-not-found": "Le numéro indiqué n'est pas un compte opérateur valide.",
    "invalid-amount": "Le montant de la transaction est invalide.",
    "generic-error": FALLBACK,
    "unknown-issue": FALLBACK,
}


def is_generic_message(message: str) -> bool:
    hay = (message or "").strip().lower()
    if not hay:
        return True
    if hay.startswith("by ") or re.match(r"^paiements?\s+échou", hay):
        return True
    if hay.startswith("payment failed"):
        return True
    return hay in {"failed", "error", "errored", "cancelled", "canceled"}


def _normalize_code(code: str) -> Optional[str]:
    normalized = (code or "").strip().lower().replace("_", "-")
    return normalized if normalized in KNOWN_CODES else None


def _code_in_text(text: str) -> Optional[str]:
    hay = (text or "").lower().replace("_", "-")
    for code in KNOWN_CODES:
        if code in hay:
            return code
    return None


def _usable_message(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed if trimmed and not is_generic_message(trimmed) else None


def extract_code(payload: dict[str, Any]) -> Optional[str]:
    for key in CODE_KEYS:
        value = payload.get(key)
        if isinstance(value, str) and value:
            found = _normalize_code(value)
            if found:
                return found
    error = payload.get("error")
    if isinstance(error, dict):
        for key in (*CODE_KEYS, "type"):
            value = error.get(key)
            if isinstance(value, str) and value:
                found = _normalize_code(value)
                if found:
                    return found
    for key in (*MESSAGE_KEYS, "message"):
        value = payload.get(key)
        if isinstance(value, str) and value:
            found = _normalize_code(value) or _code_in_text(value)
            if found:
                return found
    return None


def extract_raw_message(payload: dict[str, Any]) -> Optional[str]:
    for key in MESSAGE_KEYS:
        found = _usable_message(payload.get(key))
        if found:
            return found
    error = payload.get("error")
    if isinstance(error, dict):
        for key in ("details", "detail", "message"):
            found = _usable_message(error.get(key))
            if found:
                return found
    message = payload.get("message")
    if isinstance(message, str):
        return _usable_message(message)
    if isinstance(message, list) and message:
        first = message[0]
        if isinstance(first, str):
            return _usable_message(first)
        if isinstance(first, list) and first and isinstance(first[0], str):
            return _usable_message(first[0])
    return None


def infer_code_from_message(raw: str) -> Optional[str]:
    hay = raw.lower()
    if "insufficient" in hay or "insuffisant" in hay or "solde" in hay:
        return "subscriber-insufficient-balance"
    if "secret code" in hay or "code secret" in hay or re.search(r"\bpin\b", hay):
        return "subscriber-invalid-secret-code"
    if "timeout" in hay or "expir" in hay:
        return "subscriber-timeout"
    if "not found" in hay or "does not exist" in hay or "n'existe" in hay or "n’existe" in hay:
        return "subscriber-not-found"
    return _code_in_text(raw)


def _scan_code(payload: Any, depth: int = 0) -> Optional[str]:
    if depth > 4:
        return None
    if isinstance(payload, list):
        for item in payload:
            found = _scan_code(item, depth + 1)
            if found:
                return found
        return None
    if not isinstance(payload, dict):
        return None
    for value in payload.values():
        found = None
        if isinstance(value, str):
            found = _normalize_code(value) or _code_in_text(value)
        elif isinstance(value, (dict, list)):
            found = _scan_code(value, depth + 1)
        if found:
            return found
    return None


def client_message(code: Optional[str], raw: Optional[str]) -> str:
    mapped = _CLIENT_MESSAGES.get(code or "")
    if mapped:
        return mapped
    trimmed = (raw or "").strip()
    if trimmed and not is_generic_message(trimmed) and not re.search(
        r"application[_ ]?key|hmac|signature|unauthorized|forbidden", trimmed, re.I
    ):
        return trimmed
    return FALLBACK


def explain(payload: dict[str, Any]) -> dict[str, Optional[str]]:
    code = extract_code(payload)
    raw = extract_raw_message(payload)
    if code is None and isinstance(raw, str):
        code = infer_code_from_message(raw)
    if code is None:
        code = _scan_code(payload)
    return {"code": code, "raw": raw, "message": client_message(code, raw)}
