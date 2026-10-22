from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.responses import iso_utc


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


PAYMENT_PENDING = "pending"
PAYMENT_COMPLETED = "completed"
PAYMENT_FAILED = "failed"
PAYMENT_CANCELLED = "cancelled"
PAYMENT_EXPIRED = "expired"

FINAL_STATUSES = frozenset({PAYMENT_COMPLETED, PAYMENT_FAILED, PAYMENT_CANCELLED, PAYMENT_EXPIRED})


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reference: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    plan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    plan_slug: Mapped[str] = mapped_column(String(80), nullable=False)
    plan_name: Mapped[str] = mapped_column(String(120), nullable=False)
    months: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="XAF")
    provider: Mapped[str] = mapped_column(String(30), nullable=False, default="mesomb")
    service: Mapped[str] = mapped_column(String(30), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=PAYMENT_PENDING, index=True)
    provider_reference: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user = relationship("User")

    @property
    def is_final(self) -> bool:
        return self.status in FINAL_STATUSES

    @property
    def payment_url(self) -> Optional[str]:
        raw = self.raw if isinstance(self.raw, dict) else {}
        meta = raw.get("_meta") if isinstance(raw.get("_meta"), dict) else {}
        for candidate in (meta.get("payment_url"), raw.get("payment_url"), raw.get("redirect")):
            if isinstance(candidate, str) and candidate.startswith("http"):
                return candidate
        return None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "reference": self.reference,
            "plan_slug": self.plan_slug,
            "plan_name": self.plan_name,
            "months": self.months,
            "amount": self.amount,
            "currency": self.currency,
            "provider": self.provider,
            "service": self.service,
            "phone": self.phone,
            "status": self.status,
            "failure_reason": self.failure_reason,
            "payment_url": self.payment_url,
            "paid_at": iso_utc(self.paid_at),
            "period_start": iso_utc(self.period_start),
            "period_end": iso_utc(self.period_end),
            "created_at": iso_utc(self.created_at),
        }

    def to_admin_dict(self) -> dict:
        payload = self.to_dict()
        payload["provider_reference"] = self.provider_reference
        if self.user is not None:
            payload["user"] = {"id": self.user.id, "name": self.user.name, "email": self.user.email}
        return payload
