"""Client HTTP MeSomb (Mobile Money), aligné sur contactBusinessCenter.

Doc : https://docs.mesomb.com/fr
  - POST /{locale}/api/v1.1/payment/collect/        : collecter un paiement
  - GET  /api/v1.1/payment/transactions/?ids=…       : statut d'une transaction
  - GET  /api/v1.1/payment/transactions/check/?ids=… : revalidation opérateur

Auth : HMAC-SHA1 (MESOMB_AUTH=hmac) comme le SDK officiel / CBC.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import re
import secrets
import string
import time
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import quote, urlparse

import httpx

from app.core.config import settings
from app.modules.payments import mesomb_errors, mesomb_geo
from app.core.http import sync_client

logger = logging.getLogger(__name__)

SERVICES: dict[str, str] = {"MTN": "MTN Mobile Money", "ORANGE": "Orange Money"}

CM_DIAL = "237"
CM_LOCAL_LEN = 9
_MTN_PREFIXES = ("67", "650", "651", "652", "653", "654", "680", "681", "682", "683", "684")
_ORANGE_PREFIXES = ("69", "655", "656", "657", "658", "659", "640", "686", "687", "688", "689")


class MeSombError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        code: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


def local_phone(raw: str) -> str:
    """Numéro Mobile Money au format local MeSomb (sans indicatif)."""
    geo = mesomb_geo.resolve_phone(raw, settings.mesomb_country or "CM")
    if not mesomb_geo.is_valid_local_account(geo):
        raise MeSombError("Numéro Mobile Money invalide pour ce pays.")
    return mesomb_geo.payer_account(geo)


def guess_service(phone: str) -> Optional[str]:
    geo = mesomb_geo.resolve_phone(phone, settings.mesomb_country or "CM")
    if geo.get("country") != "CM":
        return None
    try:
        local = local_phone(phone)
    except MeSombError:
        return None
    if local.startswith(_ORANGE_PREFIXES):
        return "ORANGE"
    if local.startswith(_MTN_PREFIXES):
        return "MTN"
    return None


def map_status(status: str) -> str:
    s = (status or "").strip().lower()
    if s in {"success", "successful", "succeeded", "completed"}:
        return "completed"
    if s in {"failed", "fail", "error", "errored"}:
        return "failed"
    if s in {"cancelled", "canceled"}:
        return "cancelled"
    if s == "expired":
        return "expired"
    if s in {"pending", "initiated", "processing"}:
        return "pending"
    return "pending"


def _encode_body(body: Optional[dict[str, Any]]) -> str:
    if body is None:
        return "{}"
    return json.dumps(body, separators=(",", ":"), ensure_ascii=True)


def _nonce(length: int = 40) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class MeSombClient:
    def __init__(self) -> None:
        self.base_url = (settings.mesomb_api_base_url or "").rstrip("/")
        self.api_key = settings.mesomb_api_key
        self.api_secret = settings.mesomb_api_secret
        self.application_key = settings.mesomb_application_key
        self.auth_mode = (settings.mesomb_auth or "hmac").strip().lower()
        self.locale = (settings.mesomb_locale or "").strip("/")
        self.language = settings.mesomb_language or "fr"
        self.version = settings.mesomb_api_version or "v1.1"
        self.timeout = max(15, int(settings.mesomb_timeout or 120))
        self.connect_timeout = max(5, int(getattr(settings, "mesomb_connect_timeout", 15) or 15))

    def _uses_bearer(self) -> bool:
        if self.auth_mode == "hmac":
            return False
        if self.auth_mode == "bearer":
            return True
        return self.api_key.startswith("sk_")

    def _collect_mode(self) -> str:
        mode = (settings.mesomb_collect_mode or "asynchronous").strip().lower()
        return mode if mode in {"asynchronous", "synchronous"} else "asynchronous"

    def _sign(self, method: str, url: str, ts: int, nonce: str, body: Optional[dict[str, Any]]) -> str:
        parsed = urlparse(url)
        host = f"{parsed.scheme}://{parsed.hostname}"
        if parsed.port:
            host += f":{parsed.port}"
        sign_headers: dict[str, Any] = {}
        if method != "GET":
            sign_headers["content-type"] = "application/json"
        sign_headers.update({"host": host, "x-mesomb-date": ts, "x-mesomb-nonce": nonce})

        canonical_headers = "\n".join(f"{k}:{v}" for k, v in sign_headers.items())
        signed_headers = ";".join(sign_headers.keys())
        payload_hash = hashlib.sha1(_encode_body(body).encode()).hexdigest()
        path = "/".join(quote(seg, safe="") for seg in (parsed.path or "/").split("/"))
        canonical_request = "\n".join(
            [method, path, parsed.query or "", canonical_headers, signed_headers, payload_hash]
        )
        day = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y%m%d")
        scope = f"{day}/payment/mesomb_request"
        to_sign = "\n".join(
            ["HMAC-SHA1", str(ts), scope, hashlib.sha1(canonical_request.encode()).hexdigest()]
        )
        signature = hmac.new(self.api_secret.encode(), to_sign.encode(), hashlib.sha1).hexdigest()
        return (
            f"HMAC-SHA1 Credential={self.api_key}/{scope}, "
            f"SignedHeaders={signed_headers}, Signature={signature}"
        )

    def _assert_configured(self) -> None:
        if not settings.mesomb_enabled or not self.base_url:
            raise MeSombError(
                "Le paiement Mobile Money n'est pas encore configuré. Contactez le support.",
                status_code=503,
                code="payments_disabled",
            )

    def _headers(
        self,
        method: str,
        url: str,
        ts: int,
        nonce: str,
        body: Optional[dict[str, Any]],
        *,
        mode: str,
        trx_id: Optional[str],
        force_hmac: bool = False,
    ) -> dict[str, str]:
        headers = {
            "Accept": "application/json",
            "Accept-Language": self.language,
            "X-MeSomb-OperationMode": mode,
            "X-MeSomb-Source": "Nogalix/1.0",
        }
        bearer = self._uses_bearer() and not force_hmac
        if self.application_key:
            headers["X-MeSomb-Application"] = self.application_key
        elif not bearer:
            headers["X-MeSomb-Application"] = self.api_key
        if trx_id:
            headers["X-MeSomb-TrxID"] = trx_id
        if bearer:
            headers["Authorization"] = f"Bearer {self.api_key}"
            headers["X-API-Key"] = self.api_key
            headers["X-API-Secret"] = self.api_secret
        else:
            headers["Authorization"] = self._sign(method, url, ts, nonce, body)
            headers["x-mesomb-date"] = str(ts)
            headers["x-mesomb-nonce"] = nonce
        if method != "GET":
            headers["Content-Type"] = "application/json"
        return headers

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[dict[str, Any]] = None,
        *,
        trx_id: Optional[str] = None,
        mode: Optional[str] = None,
    ) -> Any:
        self._assert_configured()
        method = method.upper()
        mode = mode or self._collect_mode()
        if method == "GET":
            url = f"{self.base_url}/api/{self.version}/{path.lstrip('/')}"
            nonce = ""
        else:
            prefix = f"/{self.locale}" if self.locale else ""
            url = f"{self.base_url}{prefix}/api/{self.version}/{path.lstrip('/')}"
            nonce = _nonce()
        ts = int(time.time())
        headers = self._headers(method, url, ts, nonce, body, mode=mode, trx_id=trx_id)
        data = self._send(method, url, headers, body)
        if (
            isinstance(data, dict)
            and data.get("_http_status") in {401, 403}
            and self._uses_bearer()
            and self.auth_mode == "auto"
        ):
            logger.info("MeSomb : nouvel essai HMAC après 401/403 Bearer")
            nonce = _nonce() if method != "GET" else ""
            ts = int(time.time())
            headers = self._headers(
                method, url, ts, nonce, body, mode=mode, trx_id=trx_id, force_hmac=True
            )
            data = self._send(method, url, headers, body)
        if isinstance(data, dict) and data.get("_error"):
            raise data["_error"]
        return data

    def _send(self, method: str, url: str, headers: dict[str, str], body: Optional[dict[str, Any]]) -> Any:
        content = None
        if method != "GET":
            content = _encode_body(body).encode()
        timeout = httpx.Timeout(self.timeout, connect=self.connect_timeout)
        try:
            with sync_client(timeout=timeout) as client:
                response = client.request(method, url, headers=headers, content=content)
        except httpx.HTTPError as exc:
            logger.error("MeSomb injoignable (%s %s) : %s", method, url, exc)
            raise MeSombError(
                "Impossible de joindre l'API MeSomb. Vérifiez votre connexion internet, pare-feu ou VPN.",
                status_code=503,
            ) from exc

        try:
            payload = response.json()
        except ValueError:
            payload = {}
        if response.status_code >= 400:
            explained = mesomb_errors.explain(payload if isinstance(payload, dict) else {})
            message = explained["raw"] or explained["message"] or "Service de paiement indisponible. Réessayez plus tard."
            if isinstance(message, str) and "application" in message.lower():
                message += (
                    " Vérifiez MESOMB_APPLICATION_KEY (clé d'application du dashboard MeSomb, "
                    "distincte de l'API Key / Access Key)."
                )
            client_message = explained["message"] if explained["code"] else (
                f"MeSomb : {message}" if message else "Service de paiement indisponible. Réessayez plus tard."
            )
            logger.warning("MeSomb HTTP %s : %s", response.status_code, client_message)
            error = MeSombError(
                client_message,
                status_code=response.status_code,
                code=explained["code"] or (payload.get("code") if isinstance(payload, dict) else None),
            )
            if self._uses_bearer() and self.auth_mode == "auto" and response.status_code in {401, 403}:
                return {"_http_status": response.status_code, "_error": error}
            raise error
        return payload

    def collect(
        self,
        *,
        amount: int,
        service: str,
        phone: str,
        reference: str,
        description: str,
        customer_email: Optional[str] = None,
        customer_name: Optional[str] = None,
    ) -> dict[str, Any]:
        mapped = mesomb_geo.map_method_to_service(service) or service.upper()
        geo = mesomb_geo.resolve_phone(phone, settings.mesomb_country or "CM")
        if not mesomb_geo.is_valid_local_account(geo):
            raise MeSombError("Un numéro de téléphone Mobile Money valide est requis.")
        payer = mesomb_geo.payer_account(geo)
        if not mapped or not mesomb_geo.country_supports_service(geo["country"], mapped):
            raise MeSombError(f"L'opérateur n'est pas disponible au {geo['name']} via MeSomb.")

        currency = settings.mesomb_currency or "XAF"
        conversion = str(geo["currency"]).upper() != str(currency).upper()
        mode = self._collect_mode()
        body: dict[str, Any] = {
            "amount": int(amount),
            "service": mapped,
            "payer": payer,
            "country": geo["country"],
            "currency": currency,
            "amount_currency": currency,
            "fees": True,
            "conversion": conversion,
            "trxID": reference,
            "reference": description,
            "products": [{"name": description, "quantity": 1, "amount": int(amount)}],
        }
        if mapped == "WAVE":
            redirect = (settings.frontend_url or "").rstrip("/")
            if redirect:
                body["redirect"] = redirect
        if customer_email:
            parts = (customer_name or "").strip().split(None, 1)
            customer = {
                "email": customer_email,
                "first_name": parts[0] if parts else "",
                "last_name": parts[1] if len(parts) > 1 else "",
                "country": geo["country"],
            }
            body["customer"] = {k: v for k, v in customer.items() if v}
            if "email" not in body["customer"]:
                body.pop("customer", None)

        logger.info(
            "MeSomb POST /payment/collect %s amount=%s service=%s country=%s mode=%s",
            reference,
            amount,
            mapped,
            geo["country"],
            mode,
        )
        raw = self._request_collect_with_payer_fallback(body, mode, reference, geo)
        return self.normalize(raw)

    def _request_collect_with_payer_fallback(
        self,
        body: dict[str, Any],
        mode: str,
        trx_id: str,
        geo: dict[str, Any],
    ) -> Any:
        try:
            return self._request("POST", "payment/collect/", body, trx_id=trx_id, mode=mode)
        except MeSombError as exc:
            if not self._is_payer_format_error(exc):
                raise
            current = str(body.get("payer") or "")
            local = mesomb_geo.local_account(geo)
            intl = mesomb_geo.msisdn(geo)
            alt = intl if current == local else local
            if not alt or alt == current:
                raise
            logger.info("MeSomb : nouvel essai avec l'autre format de numéro")
            body = {**body, "payer": alt}
            return self._request("POST", "payment/collect/", body, trx_id=trx_id, mode=mode)

    @staticmethod
    def _is_payer_format_error(exc: MeSombError) -> bool:
        hay = (exc.message or "").lower()
        return (
            "format local" in hay
            or "local format" in hay
            or "international format" in hay
            or "invalid-length" in hay
            or ("payer" in hay and "invalid" in hay)
        )

    def transaction(self, reference: str, provider_reference: Optional[str] = None) -> Optional[dict[str, Any]]:
        """Relit une transaction : EXTERNAL (trxID) puis MESOMB (pk), avec check opérateur."""
        attempts: list[tuple[str, str]] = [(reference, "EXTERNAL")]
        if provider_reference:
            attempts.append((provider_reference, "MESOMB"))
        elif self._looks_like_uuid(reference):
            attempts = [(reference, "MESOMB"), (reference, "EXTERNAL")]
        last_error: Optional[MeSombError] = None
        prefixes = ("payment/transactions/?", "payment/transactions/check/?")
        for ident, source in attempts:
            for prefix in prefixes:
                try:
                    raw = self._request("GET", f"{prefix}ids={ident}&source={source}", mode="asynchronous")
                except MeSombError as exc:
                    last_error = exc
                    if exc.status_code and exc.status_code >= 500:
                        raise
                    continue
                tx = self._first_transaction(raw)
                if tx:
                    return self.normalize(tx)
        if last_error and last_error.status_code not in (400, 404):
            raise last_error
        return None

    @staticmethod
    def _looks_like_uuid(value: str) -> bool:
        return bool(
            re.match(
                r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                value or "",
                re.I,
            )
        )

    @staticmethod
    def _first_transaction(raw: Any) -> dict[str, Any]:
        if isinstance(raw, list):
            return raw[0] if raw and isinstance(raw[0], dict) else {}
        if not isinstance(raw, dict):
            return {}
        if isinstance(raw.get("transaction"), dict):
            return raw["transaction"]
        if isinstance(raw.get("results"), list) and raw["results"]:
            first = raw["results"][0]
            return first if isinstance(first, dict) else {}
        if "pk" in raw or "status" in raw:
            return raw
        return {}

    def normalize(self, raw: Any) -> dict[str, Any]:
        tx = self._first_transaction(raw)
        explained = mesomb_errors.explain(tx if tx else (raw if isinstance(raw, dict) else {}))
        status = map_status(str(tx.get("status") or (raw.get("status") if isinstance(raw, dict) else "") or ""))
        failed = status in {"failed", "expired", "cancelled"}
        message = explained["message"] if (failed or explained["code"]) else explained["raw"]
        if isinstance(raw, dict) and not message:
            raw_msg = raw.get("message") or raw.get("detail")
            message = raw_msg if isinstance(raw_msg, str) else None
        return {
            "status": status,
            "provider_reference": str(tx.get("pk") or tx.get("id") or "") or None,
            "message": message if isinstance(message, str) else None,
            "code": explained["code"],
            "raw": tx or (raw if isinstance(raw, dict) else {}),
        }

    def verify_webhook(self, raw_body: bytes, signature: Optional[str]) -> bool:
        secret = settings.mesomb_webhook_secret
        if not secret or not signature:
            return False
        header = signature.strip()
        if "v1=" in header:
            parts = dict(
                item.split("=", 1) for item in (p.strip() for p in header.split(",")) if "=" in item
            )
            ts, received = parts.get("t"), parts.get("v1")
            if not ts or not received or not ts.isdigit() or abs(time.time() - int(ts)) > 300:
                return False
            expected = hmac.new(secret.encode(), f"{ts}.".encode() + raw_body, hashlib.sha256).hexdigest()
            return hmac.compare_digest(expected, received)
        expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, header)


mesomb = MeSombClient()
