"""Client PayPal Orders API v2 (sandbox / live) pour checkout Nogalix.

Doc : https://developer.paypal.com/docs/api/orders/v2/
  - POST /v1/oauth2/token
  - POST /v2/checkout/orders
  - POST /v2/checkout/orders/{id}/capture
  - GET  /v2/checkout/orders/{id}
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from app.core.config import settings
from app.core.http import sync_client

logger = logging.getLogger(__name__)


class PayPalError(Exception):
    def __init__(self, message: str, *, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def map_status(status: str) -> str:
    s = (status or "").strip().upper()
    if s in {"COMPLETED", "APPROVED"}:
        # APPROVED means buyer approved but not yet captured — treat as pending until capture.
        return "completed" if s == "COMPLETED" else "pending"
    if s in {"VOIDED", "DENIED"}:
        return "cancelled"
    if s in {"EXPIRED"}:
        return "expired"
    return "pending"


class PayPalClient:
    def _assert_configured(self) -> None:
        if not settings.paypal_enabled:
            raise PayPalError("PayPal n'est pas configuré.", status_code=503)

    def _base(self) -> str:
        mode = (settings.paypal_mode or "sandbox").strip().lower()
        if mode == "live":
            return "https://api-m.paypal.com"
        return "https://api-m.sandbox.paypal.com"

    def _access_token(self) -> str:
        self._assert_configured()
        url = f"{self._base()}/v1/oauth2/token"
        with sync_client(timeout=settings.paypal_timeout) as client:
            response = client.post(
                url,
                data={"grant_type": "client_credentials"},
                auth=(settings.paypal_client_id, settings.paypal_client_secret),
                headers={"Accept": "application/json", "Accept-Language": "en_US"},
            )
        if response.status_code >= 400:
            logger.warning("PayPal OAuth failed: %s %s", response.status_code, response.text[:300])
            raise PayPalError("Impossible d'obtenir un jeton PayPal.", status_code=502)
        token = (response.json() or {}).get("access_token")
        if not token:
            raise PayPalError("Réponse OAuth PayPal invalide.", status_code=502)
        return str(token)

    def _request(self, method: str, path: str, *, json: Optional[dict] = None) -> dict[str, Any]:
        token = self._access_token()
        url = f"{self._base()}{path}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        with sync_client(timeout=settings.paypal_timeout) as client:
            response = client.request(method, url, json=json, headers=headers)
        if response.status_code >= 400:
            detail = ""
            try:
                body = response.json()
                detail = str(body.get("message") or body.get("name") or body)[:240]
            except Exception:
                detail = response.text[:240]
            logger.warning("PayPal %s %s -> %s %s", method, path, response.status_code, detail)
            raise PayPalError(detail or "Erreur PayPal.", status_code=502 if response.status_code >= 500 else 422)
        if not response.content:
            return {}
        data = response.json()
        return data if isinstance(data, dict) else {}

    def create_order(
        self,
        *,
        amount_value: str,
        currency: str,
        reference: str,
        description: str,
        return_url: str,
        cancel_url: str,
    ) -> dict[str, Any]:
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": reference,
                    "description": description[:127],
                    "custom_id": reference,
                    "amount": {"currency_code": currency.upper(), "value": amount_value},
                }
            ],
            "application_context": {
                "brand_name": (settings.app_name or "Nogalix")[:127],
                "landing_page": "NO_PREFERENCE",
                "user_action": "PAY_NOW",
                "return_url": return_url,
                "cancel_url": cancel_url,
            },
        }
        logger.info("PayPal create order %s amount=%s %s", reference, amount_value, currency)
        raw = self._request("POST", "/v2/checkout/orders", json=payload)
        return self._to_result(raw)

    def capture(self, order_id: str) -> dict[str, Any]:
        raw = self._request("POST", f"/v2/checkout/orders/{order_id}/capture", json={})
        return self._to_result(raw)

    def get_order(self, order_id: str) -> dict[str, Any]:
        raw = self._request("GET", f"/v2/checkout/orders/{order_id}")
        return self._to_result(raw)

    def _to_result(self, raw: dict[str, Any]) -> dict[str, Any]:
        order_id = str(raw.get("id") or "")
        status = map_status(str(raw.get("status") or ""))
        approve_url = None
        for link in raw.get("links") or []:
            if isinstance(link, dict) and link.get("rel") == "approve" and link.get("href"):
                approve_url = str(link["href"])
                break
        return {
            "status": status,
            "provider_reference": order_id,
            "payment_url": approve_url,
            "order_id": order_id,
            "raw": raw,
            "message": None,
        }


paypal = PayPalClient()
