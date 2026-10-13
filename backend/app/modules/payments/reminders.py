"""Rappels d'échéance des abonnements (pas de reconduction automatique) et expiration des plans.

Une tâche de fond passe toutes les heures : J-3 et J-1 avant la fin, un e-mail et une
notification invitent à renouveler ; à l'échéance, le compte repasse sur le plan Gratuit.
Chaque envoi est réservé par une mise à jour conditionnelle de `plan_reminder_stage`,
donc plusieurs workers (ou un redémarrage) n'envoient jamais deux fois le même rappel.
"""

from __future__ import annotations

import logging
import threading
from datetime import timedelta

from sqlalchemy import update

from app.core.database import SessionLocal
from app.modules.payments.service import (
    _aware,
    expire_plan_if_needed,
    reconcile_pending_payments,
    send_plan_reminder_email,
    utcnow,
)
from app.modules.plans.models import Plan
from app.modules.users.models import Notification, User

logger = logging.getLogger(__name__)

INTERVAL_SECONDS = 60 * 60
# (étape, délai avant l'échéance) : l'étape la plus avancée atteinte est la seule envoyée.
STAGES = ((2, timedelta(days=1)), (1, timedelta(days=3)))


def _due_stage(remaining: timedelta) -> int:
    for stage, window in STAGES:
        if remaining <= window:
            return stage
    return 0


def run_plan_reminders(db) -> dict[str, int]:
    now = utcnow()
    sent = 0
    expired = 0
    horizon = now + max(window for _stage, window in STAGES)
    users = (
        db.query(User)
        .filter(User.plan_expires_at.is_not(None), User.plan_expires_at <= horizon)
        .all()
    )
    for user in users:
        end = _aware(user.plan_expires_at)
        if end is None:
            continue
        if end <= now:
            if expire_plan_if_needed(db, user):
                expired += 1
            continue
        stage = _due_stage(end - now)
        if stage <= (user.plan_reminder_stage or 0):
            continue
        claimed = db.execute(
            update(User)
            .where(
                User.id == user.id,
                User.plan_expires_at == user.plan_expires_at,
                User.plan_reminder_stage < stage,
            )
            .values(plan_reminder_stage=stage)
            .execution_options(synchronize_session=False)
        ).rowcount
        if not claimed:
            db.rollback()
            continue
        plan = db.query(Plan).filter(Plan.id == user.plan_id).first() if user.plan_id else None
        plan_name = plan.name if plan else "payant"
        when = "demain" if stage == 2 else f"le {end:%d/%m/%Y}"
        db.add(
            Notification(
                user_id=user.id,
                type="payment",
                kind="systeme",
                message=f"Votre abonnement {plan_name} se termine {when}. Renouvelez-le pour garder vos avantages.",
                href="/plans",
                actor="Nogalix",
            )
        )
        db.commit()
        send_plan_reminder_email(user, plan_name=plan_name, end=end, expired=False)
        sent += 1
    return {"reminders": sent, "expired": expired}


def _loop(stop: threading.Event) -> None:
    # Premier passage peu après le démarrage, puis toutes les heures.
    if stop.wait(30):
        return
    while True:
        db = SessionLocal()
        try:
            result = run_plan_reminders(db)
            if result["reminders"] or result["expired"]:
                logger.info("Rappels d'échéance : %s", result)
        except Exception:
            logger.exception("Tâche des rappels d'échéance en échec")
            db.rollback()
        finally:
            db.close()
        if stop.wait(INTERVAL_SECONDS):
            return


def start_plan_reminders() -> threading.Event:
    stop = threading.Event()
    threading.Thread(target=_loop, args=(stop,), name="plan-reminders", daemon=True).start()
    return stop


RECONCILE_INTERVAL_SECONDS = 5 * 60


def _reconcile_loop(stop: threading.Event) -> None:
    """Toutes les 5 minutes, relit chez MeSomb les paiements restés en attente (webhook perdu,
    page fermée) et les clôtures récentes, comme payments:reconcile-mesomb de CBC."""
    if stop.wait(60):
        return
    while True:
        db = SessionLocal()
        try:
            result = reconcile_pending_payments(db)
            if result["updated"] or result["errors"]:
                logger.info("Réconciliation MeSomb : %s", result)
        except Exception:
            logger.exception("Réconciliation MeSomb en échec")
            db.rollback()
        finally:
            db.close()
        if stop.wait(RECONCILE_INTERVAL_SECONDS):
            return


def start_payment_reconciliation() -> threading.Event:
    stop = threading.Event()
    threading.Thread(target=_reconcile_loop, args=(stop,), name="mesomb-reconcile", daemon=True).start()
    return stop
