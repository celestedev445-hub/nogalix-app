"""Souscriptions payantes via MeSomb : création, suivi, activation et expiration du plan."""

from __future__ import annotations

import html
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.payments.keypay import KeyPayError, keypay
from app.modules.payments.mesomb import MeSombError, guess_service, local_phone, mesomb
from app.modules.payments import mesomb_geo
from app.modules.payments.models import (
    PAYMENT_CANCELLED,
    PAYMENT_COMPLETED,
    PAYMENT_EXPIRED,
    PAYMENT_FAILED,
    PAYMENT_PENDING,
    Payment,
)
from app.modules.plans.models import Plan
from app.modules.users.models import Notification, User

logger = logging.getLogger(__name__)

ALLOWED_MONTHS = (1, 12)
# Au-delà, un paiement resté en attente est considéré comme expiré (l'utilisateur n'a pas validé).
PENDING_TTL = timedelta(minutes=30)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def add_months(start: datetime, months: int) -> datetime:
    month_index = start.month - 1 + months
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    days_in_month = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                     31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
    return start.replace(year=year, month=month, day=min(start.day, days_in_month))


def price_for(plan: Plan, months: int) -> int:
    base = int(plan.price or 0) * months
    if months >= 12:
        discount = max(0, min(90, int(settings.yearly_discount_percent or 0)))
        base = int(round(base * (100 - discount) / 100))
    return base


def payment_config() -> dict[str, Any]:
    return {
        "enabled": settings.mesomb_enabled,
        "card_enabled": settings.keypay_enabled,
        "provider": "mesomb",
        "card_provider": "keypay",
        "currency": settings.mesomb_currency or settings.keypay_currency or "XAF",
        "country": settings.mesomb_country or "CM",
        "yearly_discount_percent": int(settings.yearly_discount_percent or 0),
        "months": list(ALLOWED_MONTHS),
        "services": [
            {"id": key, "label": label}
            for key, label in (
                ("MTN", "MTN Mobile Money"),
                ("ORANGE", "Orange Money"),
                ("WAVE", "Wave"),
                ("MOOV", "Moov Money"),
                ("AIRTEL", "Airtel Money"),
                ("MPESA", "M-Pesa"),
                ("VODACOM", "M-Pesa Vodacom"),
            )
        ],
    }


def checkout_public_dict(payment: Payment) -> dict[str, Any]:
    payload = payment.to_dict()
    if payment.provider == "keypay" and isinstance(payment.raw, dict):
        client_secret = payment.raw.get("clientSecret") or payment.raw.get("client_secret")
        publishable = payment.raw.get("stripePublishableKey") or payment.raw.get("stripe_publishable_key")
        if client_secret:
            payload["client_secret"] = client_secret
        if publishable:
            payload["stripe_publishable_key"] = publishable
    return payload


def _new_reference() -> str:
    return f"NGX-{utcnow():%Y%m%d}-{secrets.token_hex(5).upper()}"


def _notify(db: Session, user_id: int, message: str, kind: str = "systeme") -> None:
    db.add(
        Notification(
            user_id=user_id,
            type="payment",
            kind=kind,
            message=message,
            href="/profil?onglet=facturation",
            actor=settings.app_name,
        )
    )


def create_checkout(
    db: Session,
    user: User,
    *,
    plan_slug: str,
    phone: Optional[str],
    service: Optional[str],
    months: int,
    method: Optional[str] = None,
) -> Payment:
    if (method or "").strip().upper() == "CARD":
        return _create_card_checkout(db, user, plan_slug=plan_slug, months=months)
    if not settings.mesomb_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message": "Le paiement Mobile Money n'est pas encore activé. Contactez le support.",
                "code": "payments_disabled",
            },
        )
    if months not in ALLOWED_MONTHS:
        raise HTTPException(status_code=422, detail={"message": "Durée invalide : 1 ou 12 mois."})

    plan = (
        db.query(Plan)
        .filter(Plan.slug == (plan_slug or "").strip().lower(), Plan.is_active.is_(True))
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail={"message": "Plan introuvable."})
    if int(plan.price or 0) <= 0:
        raise HTTPException(status_code=422, detail={"message": "Ce plan est gratuit : aucun paiement requis."})

    try:
        payer = local_phone(phone or "")
    except MeSombError as exc:
        raise HTTPException(status_code=422, detail={"message": exc.message, "errors": {"phone": [exc.message]}})

    geo = mesomb_geo.resolve_phone(phone or "", settings.mesomb_country or "CM")
    chosen = mesomb_geo.map_method_to_service(service or "") or guess_service(phone or "") or ""
    if not chosen and geo.get("services"):
        chosen = str(geo["services"][0])
    if not chosen or not mesomb_geo.country_supports_service(str(geo.get("country") or ""), chosen):
        raise HTTPException(
            status_code=422,
            detail={"message": "Choisissez un opérateur Mobile Money disponible pour ce numéro."},
        )

    # Une seule tentative en attente à la fois : on clôt les précédentes.
    for stale in (
        db.query(Payment)
        .filter(Payment.user_id == user.id, Payment.status == PAYMENT_PENDING)
        .all()
    ):
        refresh_payment(db, stale, commit=False)
        if stale.status == PAYMENT_PENDING:
            stale.status = PAYMENT_CANCELLED
            stale.failure_reason = "Remplacé par une nouvelle tentative."
    db.flush()

    amount = price_for(plan, months)
    payment = Payment(
        reference=_new_reference(),
        user_id=user.id,
        plan_id=plan.id,
        plan_slug=plan.slug,
        plan_name=plan.name,
        months=months,
        amount=amount,
        currency=settings.mesomb_currency or "XAF",
        provider="mesomb",
        service=chosen,
        phone=payer,
        status=PAYMENT_PENDING,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    label = f"{settings.app_name} {plan.name} - {months} mois"
    try:
        result = mesomb.collect(
            amount=amount,
            service=chosen,
            phone=payer,
            reference=payment.reference,
            description=label,
            customer_email=user.email,
            customer_name=user.name,
        )
    except MeSombError as exc:
        payment.status = PAYMENT_FAILED
        payment.failure_reason = exc.message
        db.commit()
        raise HTTPException(
            status_code=exc.status_code if exc.status_code in (503,) else 422,
            detail={"message": exc.message, "code": exc.code or "payment_failed", "payment": payment.to_dict()},
        )

    _apply_result(db, payment, result)
    db.commit()
    db.refresh(payment)
    return payment


def _paid_plan(db: Session, plan_slug: str) -> Plan:
    plan = (
        db.query(Plan)
        .filter(Plan.slug == (plan_slug or "").strip().lower(), Plan.is_active.is_(True))
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail={"message": "Plan introuvable."})
    if int(plan.price or 0) <= 0:
        raise HTTPException(status_code=422, detail={"message": "Ce plan est gratuit : aucun paiement requis."})
    return plan


def _close_stale_pending(db: Session, user_id: int) -> None:
    for stale in (
        db.query(Payment)
        .filter(Payment.user_id == user_id, Payment.status == PAYMENT_PENDING)
        .all()
    ):
        refresh_payment(db, stale, commit=False)
        if stale.status == PAYMENT_PENDING:
            stale.status = PAYMENT_CANCELLED
            stale.failure_reason = "Remplacé par une nouvelle tentative."
    db.flush()


def _create_card_checkout(db: Session, user: User, *, plan_slug: str, months: int) -> Payment:
    if not settings.keypay_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message": "Le paiement par carte n'est pas encore activé. Contactez le support.",
                "code": "card_payments_disabled",
            },
        )
    if months not in ALLOWED_MONTHS:
        raise HTTPException(status_code=422, detail={"message": "Durée invalide : 1 ou 12 mois."})
    email = (user.email or "").strip()
    if not email or "@" not in email:
        raise HTTPException(
            status_code=422,
            detail={"message": "Une adresse e-mail est requise sur votre compte pour le paiement par carte."},
        )

    plan = _paid_plan(db, plan_slug)
    _close_stale_pending(db, user.id)

    amount = price_for(plan, months)
    payment = Payment(
        reference=_new_reference(),
        user_id=user.id,
        plan_id=plan.id,
        plan_slug=plan.slug,
        plan_name=plan.name,
        months=months,
        amount=amount,
        currency=settings.keypay_currency or "XAF",
        provider="keypay",
        service="CARD",
        phone="",
        status=PAYMENT_PENDING,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    label = f"{settings.app_name} {plan.name} - {months} mois"
    try:
        result = keypay.collect(
            amount=amount,
            reference=payment.reference,
            description=label,
            customer_email=email,
        )
    except KeyPayError as exc:
        payment.status = PAYMENT_FAILED
        payment.failure_reason = exc.message
        db.commit()
        raise HTTPException(
            status_code=exc.status_code if exc.status_code in (503,) else 422,
            detail={"message": exc.message, "code": "payment_failed", "payment": payment.to_dict()},
        )

    if not result.get("client_secret") or not result.get("stripe_publishable_key"):
        payment.status = PAYMENT_FAILED
        payment.failure_reason = "Le prestataire n'a pas renvoyé les informations Stripe."
        payment.raw = result.get("raw")
        db.commit()
        raise HTTPException(
            status_code=502,
            detail={"message": payment.failure_reason, "code": "payment_failed", "payment": payment.to_dict()},
        )

    _apply_result(db, payment, result)
    db.commit()
    db.refresh(payment)
    return payment


def _apply_result(db: Session, payment: Payment, result: dict[str, Any]) -> None:
    new_status = result.get("status") or PAYMENT_PENDING
    if new_status == PAYMENT_COMPLETED:
        activate_payment(db, payment)
    if result.get("provider_reference"):
        payment.provider_reference = result["provider_reference"]
    if result.get("raw"):
        raw = dict(result["raw"])
        if result.get("client_secret"):
            raw.setdefault("clientSecret", result["client_secret"])
        if result.get("stripe_publishable_key"):
            raw.setdefault("stripePublishableKey", result["stripe_publishable_key"])
        payment.raw = raw
    if new_status == PAYMENT_COMPLETED:
        return
    if new_status in (PAYMENT_FAILED, PAYMENT_CANCELLED, PAYMENT_EXPIRED):
        if payment.status == PAYMENT_PENDING:
            payment.status = new_status
            fallback = (
                "Paiement refusé par la banque."
                if payment.provider == "keypay"
                else "Paiement refusé ou annulé sur le téléphone."
            )
            payment.failure_reason = result.get("message") or fallback
            _notify(db, payment.user_id, f"Paiement {payment.reference} non abouti : {payment.failure_reason}")


def activate_payment(db: Session, payment: Payment) -> None:
    """Passe le paiement en « completed » et prolonge le plan (idempotent)."""
    if payment.id is not None:
        # Verrou ligne : un webhook et un polling simultanés ne prolongent qu'une fois.
        db.flush()
        db.refresh(payment, with_for_update=True)
    if payment.status == PAYMENT_COMPLETED:
        return
    user = db.query(User).filter(User.id == payment.user_id).with_for_update().first()
    if not user:
        return
    now = utcnow()
    current_end = _aware(user.plan_expires_at)
    # Renouvellement du même plan encore actif : on prolonge à partir de l'échéance.
    start = current_end if (user.plan_id == payment.plan_id and current_end and current_end > now) else now
    end = add_months(start, payment.months)

    payment.status = PAYMENT_COMPLETED
    payment.failure_reason = None
    payment.paid_at = now
    payment.period_start = start
    payment.period_end = end
    if payment.plan_id:
        user.plan_id = payment.plan_id
    user.plan_expires_at = end
    # Nouveau palier : on remet le compteur d'essais IA à zéro.
    user.ai_trials_used = 0
    user.ai_trials_period = None
    db.add(user)
    _notify(
        db,
        user.id,
        f"Paiement confirmé : plan {payment.plan_name} actif jusqu'au {end:%d/%m/%Y}.",
        kind="succes",
    )
    _send_receipt(user, payment)


def _send_receipt(user: User, payment: Payment) -> None:
    if not user.notify_email:
        return
    try:
        from app.support.mail import send_html_mail

        amount = f"{payment.amount:,}".replace(",", " ")
        end = payment.period_end.strftime("%d/%m/%Y") if payment.period_end else ""
        body = (
            f"<p>Bonjour {html.escape(user.name or '')},</p>"
            f"<p>Nous confirmons la réception de votre paiement de <strong>{amount} {html.escape(payment.currency)}</strong> "
            f"pour le plan <strong>{html.escape(payment.plan_name)}</strong> ({payment.months} mois).</p>"
            f"<p>Référence : {html.escape(payment.reference)}<br/>Valable jusqu'au : {end}</p>"
            f"<p>Merci de votre confiance,<br/>L'équipe {html.escape(settings.app_name)}</p>"
        )
        send_html_mail(to_email=user.email, subject=f"Reçu de paiement {settings.app_name}", html_body=body)
    except Exception:  # l'e-mail ne doit jamais bloquer l'activation
        logger.exception("Envoi du reçu impossible (%s)", payment.reference)


def refresh_payment(db: Session, payment: Payment, *, commit: bool = True) -> Payment:
    """Relit le statut auprès du prestataire si le paiement est encore en attente."""
    if payment.status != PAYMENT_PENDING:
        return payment
    result = None
    if payment.provider == "keypay":
        lookup = payment.provider_reference or payment.reference
        try:
            result = keypay.get_status(lookup)
        except KeyPayError as exc:
            logger.warning("Statut KeyPay indisponible pour %s : %s", payment.reference, exc.message)
    else:
        try:
            result = mesomb.transaction(payment.reference, payment.provider_reference)
        except MeSombError as exc:
            logger.warning("Statut MeSomb indisponible pour %s : %s", payment.reference, exc.message)
            result = None
    if result:
        _apply_result(db, payment, result)
    if payment.status == PAYMENT_PENDING and _aware(payment.created_at) < utcnow() - PENDING_TTL:
        payment.status = PAYMENT_EXPIRED
        payment.failure_reason = "Délai de validation dépassé."
    if commit:
        db.commit()
        db.refresh(payment)
    return payment


def cancel_payment(db: Session, payment: Payment) -> Payment:
    refresh_payment(db, payment, commit=False)
    if payment.status == PAYMENT_PENDING:
        if payment.provider == "keypay" and (payment.provider_reference or payment.reference):
            try:
                keypay.cancel(payment.provider_reference or payment.reference)
            except KeyPayError as exc:
                logger.warning("Annulation KeyPay ignorée pour %s : %s", payment.reference, exc.message)
        payment.status = PAYMENT_CANCELLED
        payment.failure_reason = "Annulé par l'utilisateur."
    db.commit()
    db.refresh(payment)
    return payment


def handle_webhook(db: Session, payload: dict[str, Any]) -> Optional[Payment]:
    obj: dict[str, Any] = payload
    data = payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("object"), dict):
        obj = data["object"]
    elif isinstance(payload.get("transaction"), dict):
        obj = payload["transaction"]

    candidates = [
        value
        for value in (obj.get("trxID"), payload.get("trxID"), obj.get("external_id"), obj.get("reference"))
        if isinstance(value, str) and value.startswith("NGX-")
    ]
    payment = None
    for ref in candidates:
        payment = db.query(Payment).filter(Payment.reference == ref).first()
        if payment:
            break
    pk = obj.get("pk") or obj.get("id")
    if not payment and pk:
        payment = db.query(Payment).filter(Payment.provider_reference == str(pk)).first()
    if not payment:
        logger.warning("Webhook MeSomb : paiement introuvable (%s)", candidates or pk)
        return None
    if pk and not payment.provider_reference:
        payment.provider_reference = str(pk)
    # On ne fait jamais confiance au contenu du webhook : on relit le statut chez MeSomb.
    return refresh_payment(db, payment)


def handle_keypay_webhook(db: Session, payload: dict[str, Any]) -> Optional[Payment]:
    external = payload.get("externalReference") or payload.get("external_reference")
    provider_ref = payload.get("reference") or payload.get("transactionId")
    payment = None
    if isinstance(external, str) and external.startswith("NGX-"):
        payment = db.query(Payment).filter(Payment.reference == external).first()
    if not payment and isinstance(provider_ref, str) and provider_ref:
        payment = db.query(Payment).filter(Payment.provider_reference == provider_ref).first()
    if not payment:
        logger.warning("Webhook KeyPay : paiement introuvable (%s / %s)", external, provider_ref)
        return None
    if isinstance(provider_ref, str) and provider_ref and not payment.provider_reference:
        payment.provider_reference = provider_ref
    return refresh_payment(db, payment)


def expire_plan_if_needed(db: Session, user: User) -> bool:
    """Repasse l'utilisateur sur le plan gratuit quand son abonnement est échu."""
    end = _aware(user.plan_expires_at)
    if not end or end > utcnow():
        return False
    free = db.query(Plan).filter(Plan.slug == "gratuit").first()
    user.plan_id = free.id if free else None
    user.plan_expires_at = None
    user.ai_trials_used = 0
    user.ai_trials_period = None
    db.add(user)
    _notify(db, user.id, "Votre abonnement est arrivé à échéance : vous êtes repassé sur le plan Gratuit.")
    db.commit()
    db.refresh(user)
    return True
