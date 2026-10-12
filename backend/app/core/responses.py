from typing import Any, Optional


def ok(
    data: Any = None,
    message: Optional[str] = None,
    **extra: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if message is not None:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    payload.update(extra)
    return payload


def fail(
    message: str,
    *,
    code: Optional[str] = None,
    errors: Optional[dict[str, Any]] = None,
    **extra: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"message": message}
    if code:
        payload["code"] = code
    if errors:
        payload["errors"] = errors
    payload.update(extra)
    return payload


def iso_utc(value) -> Optional[str]:
    """ISO 8601 explicite en UTC (MySQL renvoie des datetimes naïfs stockés en UTC)."""
    if value is None:
        return None
    from datetime import timezone

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
