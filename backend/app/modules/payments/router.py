import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.limiter import limiter
from app.modules.payments import service
from app.modules.payments.keypay import keypay as keypay_client
from app.modules.payments.mesomb import mesomb
from app.modules.payments.models import Payment
from app.modules.users.models import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    plan: str = Field(min_length=2, max_length=80)
    phone: Optional[str] = Field(default=None, max_length=40)
    service: Optional[str] = Field(default=None, max_length=20)
    months: int = Field(default=1)
    method: Optional[str] = Field(default=None, max_length=20)


def _own_payment(db: Session, user: User, reference: str) -> Payment:
    payment = (
        db.query(Payment)
        .filter(Payment.reference == reference, Payment.user_id == user.id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail={"message": "Paiement introuvable."})
    return payment


def _me_payload(db: Session, user: User) -> dict:
    from app.modules.plans.capability import capabilities_payload, get_user_plan, plan_summary

    db.refresh(user)
    plan = get_user_plan(db, user)
    payload = user.to_auth_dict()
    payload["plan"] = plan_summary(plan)
    payload["capabilities"] = capabilities_payload(plan, user)
    return payload


@router.get("/payments/config")
def config():
    return {"data": service.payment_config()}


@router.get("/payments")
def my_payments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(Payment)
        .filter(Payment.user_id == user.id)
        .order_by(Payment.created_at.desc())
        .limit(100)
        .all()
    )
    return {"data": [row.to_dict() for row in rows]}


@router.post("/payments/checkout", status_code=status.HTTP_201_CREATED)
@limiter.limit("6/minute")
def checkout(
    request: Request,
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    payment = service.create_checkout(
        db,
        user,
        plan_slug=body.plan,
        phone=body.phone,
        service=body.service,
        months=body.months,
        method=body.method,
    )
    if payment.provider == "keypay":
        message = (
            "Paiement confirmé."
            if payment.status == "completed"
            else "Saisissez les informations de votre carte pour confirmer le paiement."
        )
    elif payment.provider == "paypal":
        message = (
            "Paiement confirmé."
            if payment.status == "completed"
            else "Confirmez le paiement avec PayPal."
        )
    else:
        message = (
            "Paiement confirmé."
            if payment.status == "completed"
            else "Validez le paiement sur votre téléphone (composez le code reçu ou confirmez la notification)."
        )
    return {"message": message, "data": service.checkout_public_dict(payment), "user": _me_payload(db, user)}


@router.get("/payments/{reference}")
@limiter.limit("40/minute")
def show(
    request: Request,
    reference: str,
    verify: bool = Query(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    payment = _own_payment(db, user, reference)
    # Écoute courante : lecture en base (tenue à jour par le webhook). `verify` relit MeSomb,
    # comme payments/status puis payments/verify de CBC.
    if verify or payment.provider != "mesomb":
        payment = service.refresh_payment(db, payment, recheck_closed=True)
    return {"data": payment.to_dict(), "user": _me_payload(db, user)}


@router.post("/payments/{reference}/paypal/capture")
@limiter.limit("10/minute")
def paypal_capture(
    request: Request,
    reference: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    payment = service.capture_paypal_payment(db, _own_payment(db, user, reference))
    message = (
        "Paiement confirmé."
        if payment.status == "completed"
        else "Paiement PayPal en cours de confirmation."
    )
    return {"message": message, "data": service.checkout_public_dict(payment), "user": _me_payload(db, user)}


@router.post("/payments/{reference}/cancel")
def cancel(reference: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    payment = service.cancel_payment(db, _own_payment(db, user, reference))
    return {"message": "Paiement annulé." if payment.status == "cancelled" else None, "data": payment.to_dict()}


@router.post("/payments/webhook")
async def webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_mesomb_webhook_signature: Optional[str] = Header(default=None),
):
    raw = await request.body()
    if len(raw) > 64 * 1024:
        raise HTTPException(status_code=413, detail={"message": "Charge utile trop volumineuse."})
    trusted = False
    if settings.mesomb_webhook_secret:
        if not mesomb.verify_webhook(raw, x_mesomb_webhook_signature):
            logger.warning("Webhook MeSomb : signature invalide")
            raise HTTPException(status_code=401, detail={"message": "Signature de webhook invalide."})
        trusted = True
    else:
        logger.warning("Webhook MeSomb : aucun secret configuré, statut relu chez MeSomb")
    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(status_code=422, detail={"message": "JSON invalide."})
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail={"message": "JSON invalide."})
    try:
        # Signature valide : le payload signé fait foi. Sinon, relecture MeSomb hors de la boucle.
        await run_in_threadpool(service.handle_webhook, db, payload, trusted)
    except Exception:
        # Erreur passagère (base de données…) : 500 pour que MeSomb renvoie l'évènement.
        logger.exception("Webhook MeSomb : erreur de traitement")
        return JSONResponse(status_code=500, content={"received": False})
    return {"received": True}


@router.post("/payments/keypay/webhook")
async def keypay_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_keypay_signature: Optional[str] = Header(default=None),
):
    raw = await request.body()
    if len(raw) > 64 * 1024:
        raise HTTPException(status_code=413, detail={"message": "Charge utile trop volumineuse."})
    if not keypay_client.verify_webhook(raw, x_keypay_signature):
        logger.warning("Webhook KeyPay : signature invalide")
        raise HTTPException(status_code=401, detail={"message": "Signature de webhook invalide."})
    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except ValueError:
        raise HTTPException(status_code=422, detail={"message": "JSON invalide."})
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail={"message": "JSON invalide."})
    try:
        await run_in_threadpool(service.handle_keypay_webhook, db, payload)
    except Exception:
        logger.exception("Webhook KeyPay : erreur de traitement")
    return {"received": True}


@router.get("/admin/payments")
def admin_payments(
    q: Optional[str] = Query(default=None, max_length=120),
    status_filter: Optional[str] = Query(default=None, alias="status", max_length=20),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Payment).options(joinedload(Payment.user))
    if status_filter:
        query = query.filter(Payment.status == status_filter)
    if q:
        like = f"%{q.strip()}%"
        query = query.join(User, User.id == Payment.user_id).filter(
            (Payment.reference.ilike(like)) | (User.email.ilike(like)) | (User.name.ilike(like)) | (Payment.phone.ilike(like))
        )
    total = query.count()
    rows = query.order_by(Payment.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "data": [row.to_admin_dict() for row in rows],
        "meta": {"total": total, "page": page, "per_page": per_page},
    }
