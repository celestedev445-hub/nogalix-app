"""Client HTTP KeyPay / MasterKey — paiement par carte uniquement.

Doc : https://keypay.masterkeycm.com/dev-platform
  - POST /api/v1/payments/collect              : initier un paiement CARD
  - GET  /api/v1/payments/{reference}          : statut
  - POST /api/v1/payments/{reference}/cancel   : annulation

Auth : en-têtes X-API-Key + X-API-Secret.
La collecte CARD renvoie un clientSecret Stripe + stripePublishableKey
à confirmer côté frontend via Stripe.js (confirmCardPayment).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any, Optional
from urllib.parse import quote, urlparse

import httpx

from app.core.config import settings
from app.core.http import sync_client

logger = logging.getLogger(__name__)

CARD_METHOD = "CARD"


class KeyPayError(Exception):
    def __init__(self, message: str, *, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def map_status(status: str) -> str:
    s = (status or "").strip().lower()
    if s in {"completed", "success", "successful", "succeeded"}:
        return "completed"
    if s in {"failed", "fail", "error", "errored"}:
        return "failed"
    if s in {"cancelled", "canceled", "refunded"}:
        return "cancelled"
    if s in {"expired"}:
        return "expired"
    return "pending"


def _unwrap(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    data = payload.get("data")
    if isinstance(data, dict):
        inner = data.get("object")
        return inner if isinstance(inner, dict) else data
    return payload


def _is_public_url(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    if not host:
        return False
    return host not in {"localhost", "127.0.0.1", "0.0.0.0", "::1"} and not host.endswith(
        (".local", ".test")
    )


class KeyPayClient:
    def collect(
        self,
        *,
        amount: int,
        reference: str,
        description: str,
        customer_email: str,
        customer_phone: Optional[str] = None,
    ) -> dict[str, Any]:
        self._assert_configured()
        body: dict[str, Any] = {
            "amount": int(round(amount)),
            "paymentMethod": CARD_METHOD,
            "externalReference": reference,
            "customerEmail": customer_email,
            "description": description,
        }
        if customer_phone:
            body["customerPhone"] = customer_phone
        callback = self.webhook_url()
        if callback:
            body["callbackUrl"] = callback
        logger.info("KeyPay POST /collect CARD %s amount=%s", reference, amount)
        raw = self._request("POST", "/api/v1/payments/collect", json=body)
        return self._to_result(raw)

    def get_status(self, reference_or_id: str) -> dict[str, Any]:
        self._assert_configured()
        raw = self._request("GET", f"/api/v1/payments/{quote(reference_or_id, safe='')}")
        return self._to_result(raw)

    def cancel(self, reference_or_id: str) -> None:
        self._assert_configured()
        try:
            self._request("POST", f"/api/v1/payments/{quote(reference_or_id, safe='')}/cancel")
        except KeyPayError as exc:
            if exc.status_code in {404, 405, 409}:
                return
            raise

    def verify_webhook(self, raw_body: bytes, signature: Optional[str]) -> bool:
        secret = (settings.keypay_webhook_secret or settings.keypay_api_secret or "").encode()
        if not secret or not signature:
            return False
        expected = "sha256=" + hmac.new(secret, raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature.strip())

    def webhook_url(self) -> Optional[str]:
        configured = (settings.keypay_webhook_url or "").strip()
        if configured:
            return configured if _is_public_url(configured) else None
        base = (settings.app_url or "").rstrip("/")
        if not base:
            return None
        url = f"{base}/api/payments/keypay/webhook"
        return url if _is_public_url(url) else None

    def _assert_configured(self) -> None:
        if not settings.keypay_enabled:
            raise KeyPayError(
                "Le paiement par carte n'est pas encore activé. Contactez le support.",
                status_code=503,
            )

    def _headers(self) -> dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-API-Key": settings.keypay_api_key,
            "X-API-Secret": settings.keypay_api_secret,
        }

    def _request(self, method: str, path: str, *, json: Optional[dict] = None) -> dict[str, Any]:
        url = settings.keypay_api_base_url.rstrip("/") + path
        timeout = max(15, int(settings.keypay_timeout or 60))
        try:
            with sync_client(timeout=timeout) as client:
                response = client.request(method, url, headers=self._headers(), json=json)
        except httpx.RequestError as exc:
            logger.warning("KeyPay connexion impossible (%s) : %s", path, exc)
            raise KeyPayError(
                "Impossible de joindre le service de paiement par carte. Réessayez plus tard.",
                status_code=503,
            ) from exc
        payload: Any
        try:
            payload = response.json()
        except ValueError:
            payload = {}
        if response.is_error:
            raise self._error_from(response.status_code, payload)
        return payload if isinstance(payload, dict) else {}

    def _error_from(self, status_code: int, payload: Any) -> KeyPayError:
        data = payload if isinstance(payload, dict) else {}
        message = data.get("message") or data.get("error")
        if isinstance(message, list):
            message = message[0] if message else None
        if not isinstance(message, str) or not message.strip():
            message = "Service de paiement indisponible. Réessayez plus tard."
        trace = data.get("traceId")
        if trace:
            message = f"{message} (traceId: {trace})"
        logger.warning("KeyPay erreur HTTP %s : %s", status_code, message)
        return KeyPayError(f"KeyPay : {message}" if not message.startswith("KeyPay") else message, status_code=status_code)

    def _to_result(self, payload: dict[str, Any]) -> dict[str, Any]:
        data = _unwrap(payload)
        status = map_status(str(data.get("status") or ""))
        provider_ref = data.get("reference") or data.get("transactionId") or data.get("id")
        return {
            "status": status,
            "provider_reference": str(provider_ref) if provider_ref else None,
            "message": data.get("failureReason") or data.get("statusMessage") or data.get("message"),
            "client_secret": data.get("clientSecret") or data.get("client_secret"),
            "stripe_publishable_key": data.get("stripePublishableKey") or data.get("stripe_publishable_key"),
            "raw": data,
        }


keypay = KeyPayClient()
