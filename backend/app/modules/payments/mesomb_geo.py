"""Pays, indicatifs et opérateurs couverts par MeSomb.

Aligné sur MeSombGeography de contactBusinessCenter.
Doc : https://docs.mesomb.com/development/payment
"""

from __future__ import annotations

import re
from typing import Any, Optional

COUNTRIES: dict[str, dict[str, Any]] = {
    "CM": {"name": "Cameroun", "iso2": "cm", "dial": "237", "currency": "XAF", "local_len": 9, "services": ["ORANGE", "MTN"]},
    "CI": {"name": "Côte d'Ivoire", "iso2": "ci", "dial": "225", "currency": "XOF", "local_len": 10, "services": ["ORANGE", "MTN", "MOOV", "WAVE"]},
    "SN": {"name": "Sénégal", "iso2": "sn", "dial": "221", "currency": "XOF", "local_len": 9, "services": ["ORANGE", "WAVE"]},
    "BJ": {"name": "Bénin", "iso2": "bj", "dial": "229", "currency": "XOF", "local_len": 10, "services": ["MTN", "MOOV", "WAVE"]},
    "BF": {"name": "Burkina Faso", "iso2": "bf", "dial": "226", "currency": "XOF", "local_len": 8, "services": ["ORANGE", "MOOV", "WAVE"]},
    "GA": {"name": "Gabon", "iso2": "ga", "dial": "241", "currency": "XAF", "local_len": 9, "services": ["AIRTEL"]},
    "CG": {"name": "Congo", "iso2": "cg", "dial": "242", "currency": "XAF", "local_len": 9, "services": ["MTN", "AIRTEL"]},
    "CD": {"name": "RD Congo", "iso2": "cd", "dial": "243", "currency": "CDF", "local_len": 9, "services": ["AIRTEL", "ORANGE", "VODACOM"]},
    "KE": {"name": "Kenya", "iso2": "ke", "dial": "254", "currency": "KES", "local_len": 9, "services": ["MPESA", "AIRTEL"]},
    "UG": {"name": "Ouganda", "iso2": "ug", "dial": "256", "currency": "UGX", "local_len": 9, "services": ["MTN", "AIRTEL"]},
    "RW": {"name": "Rwanda", "iso2": "rw", "dial": "250", "currency": "RWF", "local_len": 9, "services": ["MTN", "AIRTEL"]},
    "ZM": {"name": "Zambie", "iso2": "zm", "dial": "260", "currency": "ZMW", "local_len": 9, "services": ["MTN", "AIRTEL", "ZAMTEL"]},
    "SL": {"name": "Sierra Leone", "iso2": "sl", "dial": "232", "currency": "SLE", "local_len": 8, "services": ["ORANGE"]},
    "NG": {"name": "Nigeria", "iso2": "ng", "dial": "234", "currency": "NGN", "local_len": 10, "services": ["MTN", "AIRTEL"]},
    "TZ": {"name": "Tanzanie", "iso2": "tz", "dial": "255", "currency": "TZS", "local_len": 9, "services": ["VODACOM", "AIRTEL", "HALOTEL", "YAS"]},
    "MW": {"name": "Malawi", "iso2": "mw", "dial": "265", "currency": "MWK", "local_len": 9, "services": ["TNM", "AIRTEL"]},
}

_METHOD_TO_SERVICE = {
    "OM_CM": "ORANGE",
    "ORANGE": "ORANGE",
    "ORANGE_MONEY": "ORANGE",
    "MOMO_CM": "MTN",
    "MTN": "MTN",
    "MTN_MOMO": "MTN",
    "WAVE": "WAVE",
    "MOOV": "MOOV",
    "MOOV_MONEY": "MOOV",
    "AIRTEL": "AIRTEL",
    "MPESA": "MPESA",
    "M_PESA": "MPESA",
    "VODACOM": "VODACOM",
    "ZAMTEL": "ZAMTEL",
    "TNM": "TNM",
    "HALOTEL": "HALOTEL",
    "YAS": "YAS",
}


def map_method_to_service(method: str) -> str:
    key = (method or "").upper().replace("-", "_").replace(" ", "_")
    return _METHOD_TO_SERVICE.get(key, "")


def resolve_phone(phone: str, fallback_country: Optional[str] = None) -> dict[str, Any]:
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("00"):
        digits = digits[2:]
    fallback = (fallback_country or "CM").upper()
    sorted_countries = sorted(COUNTRIES.items(), key=lambda item: len(item[1]["dial"]), reverse=True)
    for iso, meta in sorted_countries:
        dial = meta["dial"]
        if digits and digits.startswith(dial):
            local = digits[len(dial):] if len(digits) > len(dial) else ""
            return _geo(iso, meta, local)
    iso = fallback if fallback in COUNTRIES else "CM"
    return _geo(iso, COUNTRIES[iso], digits)


def local_account(geo: dict[str, Any]) -> str:
    local = re.sub(r"\D", "", str(geo.get("local") or ""))
    dial = str(geo.get("dial") or "")
    iso = str(geo.get("country") or "").upper()
    expected = int(geo.get("local_len") or COUNTRIES.get(iso, {}).get("local_len") or 0)
    if not local:
        return ""
    if dial and local.startswith(dial) and len(local) > len(dial):
        local = local[len(dial):]
    if iso == "BJ":
        if len(local) == 8 and not local.startswith("01"):
            local = "01" + local
        return local
    if iso == "GA":
        if len(local) == 8 and not local.startswith("0"):
            local = "0" + local
        return local
    if iso == "CI":
        return local
    if local.startswith("0") and expected > 0 and len(local) == expected + 1:
        local = local[1:]
    return local


def payer_account(geo: dict[str, Any]) -> str:
    return local_account(geo)


def msisdn(geo: dict[str, Any]) -> str:
    dial = str(geo.get("dial") or "")
    iso = str(geo.get("country") or "").upper()
    local = local_account(geo)
    if not local:
        return ""
    if dial and local.startswith(dial):
        return local
    if iso == "GA" and local.startswith("0"):
        local = local[1:]
    return dial + local


def is_valid_local_account(geo: dict[str, Any]) -> bool:
    local = local_account(geo)
    iso = str(geo.get("country") or "").upper()
    expected = int(geo.get("local_len") or COUNTRIES.get(iso, {}).get("local_len") or 0)
    if expected > 0:
        return len(local) == expected
    return 8 <= len(local) <= 10


def country_supports_service(country: str, service: str) -> bool:
    meta = COUNTRIES.get((country or "").upper())
    if not meta:
        return False
    return (service or "").upper() in meta["services"]


def _geo(iso: str, meta: dict[str, Any], local: str) -> dict[str, Any]:
    return {
        "country": iso,
        "local": local,
        "currency": meta["currency"],
        "dial": meta["dial"],
        "name": meta["name"],
        "local_len": meta["local_len"],
        "services": list(meta["services"]),
    }
