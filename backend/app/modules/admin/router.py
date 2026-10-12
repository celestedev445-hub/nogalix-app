"""Back-office : statistiques, utilisateurs, CV et messages de contact."""

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.responses import iso_utc
from app.modules.contact.models import MESSAGE_STATUSES, ContactMessage
from app.modules.payments.models import PAYMENT_COMPLETED, Payment
from app.modules.plans.models import Plan
from app.modules.users.models import CurriculumVitae, PersonalAccessToken, User

router = APIRouter(prefix="/admin", tags=["admin"])


def _iso(value: Optional[datetime]) -> Optional[str]:
    return iso_utc(value)


def _paginate(query, page: int, per_page: int):
    total = query.order_by(None).count()
    return total, query.offset((page - 1) * per_page).limit(per_page).all()


# ---------------------------------------------------------------- stats
@router.get("/stats")
def stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    users_total = db.query(func.count(User.id)).scalar() or 0
    users_active = db.query(func.count(User.id)).filter(User.status == "active").scalar() or 0
    users_new = db.query(func.count(User.id)).filter(User.created_at >= since).scalar() or 0
    cvs_total = db.query(func.count(CurriculumVitae.id)).scalar() or 0
    cvs_avg = db.query(func.avg(CurriculumVitae.completion)).scalar() or 0
    messages_total = db.query(func.count(ContactMessage.id)).scalar() or 0
    messages_new = (
        db.query(func.count(ContactMessage.id)).filter(ContactMessage.status == "nouveau").scalar() or 0
    )
    paid_users = (
        db.query(func.count(User.id))
        .join(Plan, Plan.id == User.plan_id)
        .filter(Plan.price > 0)
        .scalar()
        or 0
    )
    revenue_total = (
        db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == PAYMENT_COMPLETED).scalar()
        or 0
    )
    revenue_30d = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.status == PAYMENT_COMPLETED, Payment.paid_at >= since)
        .scalar()
        or 0
    )
    plans = (
        db.query(Plan.name, func.count(User.id))
        .outerjoin(User, User.plan_id == Plan.id)
        .group_by(Plan.id, Plan.name)
        .order_by(Plan.level.asc())
        .all()
    )
    return {
        "data": {
            "usersTotal": int(users_total),
            "usersActive": int(users_active),
            "usersNew30d": int(users_new),
            "cvsTotal": int(cvs_total),
            "cvsAvgCompletion": int(round(float(cvs_avg))),
            "messagesNew": int(messages_new),
            "messagesTotal": int(messages_total),
            "plansPaid": int(paid_users),
            "revenueTotal": int(revenue_total),
            "revenue30d": int(revenue_30d),
            "plans": [{"name": name, "users": int(count)} for name, count in plans],
            "activity": _activity(db),
        }
    }


_MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
_DAYS_FR = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _activity(db: Session) -> dict:
    """Séries pour le graphique du tableau de bord : 7 j (jour), 30 j (5 j), 6 mois (mois)."""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    six_months_ago = month_start
    for _ in range(5):
        six_months_ago = (six_months_ago - timedelta(days=1)).replace(day=1)

    signups = [_as_utc(v) for (v,) in db.query(User.created_at).filter(User.created_at >= six_months_ago).all()]
    cvs = [
        _as_utc(v)
        for (v,) in db.query(CurriculumVitae.created_at).filter(CurriculumVitae.created_at >= six_months_ago).all()
    ]
    payments = [
        (_as_utc(paid_at), int(amount or 0))
        for paid_at, amount in db.query(Payment.paid_at, Payment.amount)
        .filter(Payment.status == PAYMENT_COMPLETED, Payment.paid_at >= six_months_ago)
        .all()
    ]

    def bucketize(bounds: list[tuple[datetime, datetime, str]]) -> list[dict]:
        rows = []
        for start, end, label in bounds:
            rows.append(
                {
                    "label": label,
                    "users": sum(1 for d in signups if d and start <= d < end),
                    "cvs": sum(1 for d in cvs if d and start <= d < end),
                    "revenue": sum(a for d, a in payments if d and start <= d < end),
                    "payments": sum(1 for d, _ in payments if d and start <= d < end),
                }
            )
        return rows

    week = []
    for i in range(6, -1, -1):
        start = today - timedelta(days=i)
        week.append((start, start + timedelta(days=1), _DAYS_FR[start.weekday()]))

    month = []
    for i in range(5, -1, -1):
        end = today + timedelta(days=1) - timedelta(days=5 * i)
        start = end - timedelta(days=5)
        month.append((start, end, f"{start.day}/{start.month:02d}"))

    months = []
    cursor = six_months_ago
    for _ in range(6):
        nxt = (cursor + timedelta(days=32)).replace(day=1)
        months.append((cursor, nxt, _MONTHS_FR[cursor.month - 1]))
        cursor = nxt

    return {"week": bucketize(week), "month": bucketize(month), "semester": bucketize(months)}


# ---------------------------------------------------------------- users
class AdminUserUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Optional[Literal["active", "disabled"]] = None
    role: Optional[Literal["user", "admin"]] = None


def _user_rows(db: Session, users: list[User]) -> list[dict]:
    ids = [u.id for u in users]
    if not ids:
        return []
    cv_counts = dict(
        db.query(CurriculumVitae.user_id, func.count(CurriculumVitae.id))
        .filter(CurriculumVitae.user_id.in_(ids))
        .group_by(CurriculumVitae.user_id)
        .all()
    )
    last_seen = dict(
        db.query(PersonalAccessToken.user_id, func.max(PersonalAccessToken.last_used_at))
        .filter(PersonalAccessToken.user_id.in_(ids))
        .group_by(PersonalAccessToken.user_id)
        .all()
    )
    plans = {p.id: p for p in db.query(Plan).all()}
    rows = []
    for u in users:
        plan = plans.get(u.plan_id) if u.plan_id else None
        rows.append(
            {
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "status": "active" if u.status == "active" else "disabled",
                "role": u.role or "user",
                "cvCount": int(cv_counts.get(u.id, 0)),
                "createdAt": _iso(u.created_at),
                "lastSeenAt": _iso(last_seen.get(u.id) or u.updated_at),
                "plan": plan.name if plan else "Gratuit",
                "planId": plan.id if plan else None,
                "planSlug": plan.slug if plan else "gratuit",
                "planExpiresAt": _iso(u.plan_expires_at),
                "hasGoogle": bool(u.has_google),
            }
        )
    return rows


@router.get("/users")
def list_users(
    q: Optional[str] = Query(default=None, max_length=120),
    status: Optional[Literal["active", "disabled"]] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(User)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like)))
    if status == "active":
        query = query.filter(User.status == "active")
    elif status == "disabled":
        query = query.filter(User.status != "active")
    total, users = _paginate(query.order_by(User.created_at.desc()), page, per_page)
    return {"data": _user_rows(db, users), "meta": {"total": total, "page": page, "per_page": per_page}}


def _target_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail={"message": "Utilisateur introuvable."})
    return user


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = _target_user(db, user_id)
    if user.id == admin.id and (body.status == "disabled" or body.role == "user"):
        raise HTTPException(
            status_code=422,
            detail={"message": "Vous ne pouvez pas désactiver ou rétrograder votre propre compte."},
        )
    if body.status:
        user.status = body.status
        if body.status == "disabled":
            db.query(PersonalAccessToken).filter(PersonalAccessToken.user_id == user.id).delete()
    if body.role:
        user.role = body.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Utilisateur mis à jour", "data": _user_rows(db, [user])[0]}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = _target_user(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=422, detail={"message": "Vous ne pouvez pas supprimer votre propre compte."})
    from app.modules.profile.account import purge_user_files

    purge_user_files(user.id)
    db.delete(user)
    db.commit()
    return {"message": "Utilisateur supprimé"}


# ---------------------------------------------------------------- cvs
@router.get("/cvs")
def list_cvs(
    q: Optional[str] = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(CurriculumVitae, User).join(User, User.id == CurriculumVitae.user_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(CurriculumVitae.title.ilike(like), User.name.ilike(like), User.email.ilike(like))
        )
    total, rows = _paginate(query.order_by(CurriculumVitae.updated_at.desc()), page, per_page)
    return {
        "data": [
            {
                "id": cv.id,
                "title": cv.title,
                "ownerName": owner.name,
                "ownerEmail": owner.email,
                "templateId": cv.template_id,
                "templateName": cv.template_id,
                "completion": int(cv.completion or 0),
                "updatedAt": _iso(cv.updated_at),
                "principal": bool(cv.principal),
            }
            for cv, owner in rows
        ],
        "meta": {"total": total, "page": page, "per_page": per_page},
    }


@router.delete("/cvs/{cv_id}")
def delete_cv(cv_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    cv = db.query(CurriculumVitae).filter(CurriculumVitae.id == cv_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail={"message": "CV introuvable."})
    db.delete(cv)
    db.commit()
    return {"message": "CV supprimé"}


# ---------------------------------------------------------------- messages
class MessageUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Literal["nouveau", "lu", "répondu"]


@router.get("/messages")
def list_messages(
    q: Optional[str] = Query(default=None, max_length=120),
    status: Optional[str] = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(ContactMessage)
    if status in MESSAGE_STATUSES:
        query = query.filter(ContactMessage.status == status)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                ContactMessage.name.ilike(like),
                ContactMessage.email.ilike(like),
                ContactMessage.objet.ilike(like),
                ContactMessage.message.ilike(like),
            )
        )
    total, rows = _paginate(query.order_by(ContactMessage.created_at.desc()), page, per_page)
    return {"data": [row.to_dict() for row in rows], "meta": {"total": total, "page": page, "per_page": per_page}}


@router.post("/messages/read-all")
def read_all_messages(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    count = (
        db.query(ContactMessage)
        .filter(ContactMessage.status == "nouveau")
        .update({ContactMessage.status: "lu"}, synchronize_session=False)
    )
    db.commit()
    return {"message": "Messages marqués comme lus", "data": {"updated": int(count)}}


def _message(db: Session, message_id: int) -> ContactMessage:
    row = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not row:
        raise HTTPException(status_code=404, detail={"message": "Message introuvable."})
    return row


@router.patch("/messages/{message_id}")
def update_message(
    message_id: int,
    body: MessageUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = _message(db, message_id)
    row.status = body.status
    db.commit()
    db.refresh(row)
    return {"message": "Message mis à jour", "data": row.to_dict()}


@router.delete("/messages/{message_id}")
def delete_message(message_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    db.delete(_message(db, message_id))
    db.commit()
    return {"message": "Message supprimé"}
