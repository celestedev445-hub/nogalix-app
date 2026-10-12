import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, user_is_admin
from app.modules.plans.capability import allows, get_user_plan
from app.modules.support.models import SupportTicket, SupportTicketReply
from app.modules.support.schemas import (
    ALLOWED_STATUS,
    ALLOWED_SUJETS,
    SupportCreateRequest,
    SupportReplyRequest,
    SupportUpdateRequest,
)
from app.modules.users.models import Notification, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/supports", tags=["support"])

MAX_PER_PAGE = 100


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def reply_to_dict(reply: SupportTicketReply) -> dict:
    author = reply.author
    return {
        "id": reply.id,
        "message": reply.message,
        "is_staff": bool(reply.is_staff),
        "created_at": _iso(reply.created_at),
        "author": {"id": author.id, "name": author.name} if author else None,
    }


def ticket_to_dict(ticket: SupportTicket) -> dict:
    user = ticket.user
    return {
        "id": ticket.id,
        "code": ticket.code,
        "nom": ticket.nom,
        "email": ticket.email,
        "sujet": ticket.sujet,
        "message": ticket.message,
        "status": ticket.status,
        "is_priority": bool(ticket.is_priority),
        "created_at": _iso(ticket.created_at),
        "updated_at": _iso(ticket.updated_at),
        "user_id": ticket.user_id,
        "user": (
            {"id": user.id, "name": user.name, "email": user.email} if user else None
        ),
        "replies": [reply_to_dict(item) for item in ticket.replies or []],
    }


def _ticket_query(db: Session):
    return db.query(SupportTicket).options(
        joinedload(SupportTicket.user),
        selectinload(SupportTicket.replies).joinedload(SupportTicketReply.author),
    )


def _code_for_id(ticket_id: int) -> str:
    return f"TICKET-{ticket_id:06d}"


def _temporary_code() -> str:
    return f"TMP-{uuid4().hex[:24]}"


def _parse_int(value: str, label: str, low: int, high: int) -> int:
    try:
        number = int(str(value).strip())
    except (TypeError, ValueError):
        number = None
    if number is None or number < low or number > high:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": f"{label} invalide.", "code": "validation_error"},
        )
    return number


def _validate_sujet(raw: str) -> str:
    sujet = raw.strip()
    if sujet not in ALLOWED_SUJETS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Sujet invalide."},
        )
    return sujet


def _notify_admins(db: Session, ticket: SupportTicket, author: User) -> None:
    admins = (
        db.query(User)
        .filter(func.lower(User.role) == "admin", User.status == "active", User.id != author.id)
        .all()
    )
    prefix = "[Prioritaire] " if ticket.is_priority else ""
    for admin in admins:
        db.add(
            Notification(
                user_id=admin.id,
                type="support_ticket",
                kind="systeme",
                message=f"{prefix}Nouveau ticket {ticket.code} ({ticket.sujet}) de {ticket.nom}.",
                href="/support",
                actor=author.name,
            )
        )


def _can_access(user: User, ticket: SupportTicket, db: Session) -> bool:
    return ticket.user_id == user.id or user_is_admin(user, db)


def _get_ticket_or_404(db: Session, ticket_id: int) -> SupportTicket:
    ticket = _ticket_query(db).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Ticket introuvable."},
        )
    return ticket


def _week_start(now: datetime) -> datetime:
    start = now - timedelta(days=now.weekday())
    return start.replace(hour=0, minute=0, second=0, microsecond=0)


@router.get("")
def index(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    search: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    sujet: Optional[str] = Query(default=None),
    period: Optional[str] = Query(default=None),
    year: Optional[str] = Query(default=None),
    month: Optional[str] = Query(default=None),
    page: Optional[int] = Query(default=None, ge=1),
    per_page: Optional[int] = Query(default=None, ge=1, le=MAX_PER_PAGE),
):
    query = _ticket_query(db)
    if not user_is_admin(user, db):
        query = query.filter(SupportTicket.user_id == user.id)

    if search and search.strip():
        like = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SupportTicket.nom.ilike(like),
                SupportTicket.email.ilike(like),
                SupportTicket.sujet.ilike(like),
                SupportTicket.code.ilike(like),
                SupportTicket.message.ilike(like),
            )
        )
    if status_filter and status_filter != "all":
        query = query.filter(SupportTicket.status == status_filter)
    if sujet and sujet != "all":
        query = query.filter(SupportTicket.sujet == sujet)

    use_year_month = year and year != "all" and month and month != "all"
    if use_year_month:
        query = query.filter(
            extract("year", SupportTicket.created_at) == _parse_int(year, "Année", 2000, 2100),
            extract("month", SupportTicket.created_at) == _parse_int(month, "Mois", 1, 12),
        )
    elif period == "week":
        query = query.filter(SupportTicket.created_at >= _week_start(datetime.now(timezone.utc)))
    elif period == "month":
        now = datetime.now(timezone.utc)
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(SupportTicket.created_at >= start)
    elif year and year != "all":
        query = query.filter(
            extract("year", SupportTicket.created_at) == _parse_int(year, "Année", 2000, 2100)
        )

    ordered = query.order_by(SupportTicket.created_at.desc(), SupportTicket.id.desc())
    if page is None and per_page is None:
        # Réponse historique : liste brute.
        return [ticket_to_dict(item) for item in ordered.all()]

    current = page or 1
    size = per_page or 20
    total = ordered.order_by(None).count()
    tickets = ordered.offset((current - 1) * size).limit(size).all()
    return {
        "data": [ticket_to_dict(item) for item in tickets],
        "meta": {
            "page": current,
            "per_page": size,
            "total": total,
            "last_page": max(1, (total + size - 1) // size),
        },
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    body: SupportCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sujet = _validate_sujet(body.sujet)
    plan = get_user_plan(db, user)
    ticket = SupportTicket(
        code=_temporary_code(),
        user_id=user.id,
        nom=body.nom.strip() or user.name,
        email=str(body.email).strip() or user.email,
        sujet=sujet,
        message=body.message.strip(),
        status="en attente",
        is_priority=allows(plan, "support.priority"),
    )
    db.add(ticket)
    db.flush()
    # Code dérivé de l'id auto-incrémenté : pas de collision entre requêtes concurrentes.
    ticket.code = _code_for_id(ticket.id)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        logger.warning("Code ticket %s déjà pris, repli sur un code unique.", _code_for_id(ticket.id or 0))
        ticket = SupportTicket(
            code=f"TICKET-{uuid4().hex[:12].upper()}",
            user_id=user.id,
            nom=body.nom.strip() or user.name,
            email=str(body.email).strip() or user.email,
            sujet=sujet,
            message=body.message.strip(),
            status="en attente",
            is_priority=allows(plan, "support.priority"),
        )
        db.add(ticket)
        db.flush()
    _notify_admins(db, ticket, user)
    db.commit()
    created = _get_ticket_or_404(db, ticket.id)
    return ticket_to_dict(created)


@router.get("/{ticket_id}")
def show(
    ticket_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = _get_ticket_or_404(db, ticket_id)
    if not _can_access(user, ticket, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Accès non autorisé"},
        )
    return ticket_to_dict(ticket)


@router.put("/{ticket_id}")
def update(
    ticket_id: int,
    body: SupportUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = _get_ticket_or_404(db, ticket_id)
    if not _can_access(user, ticket, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Accès non autorisé"},
        )
    admin = user_is_admin(user, db)
    if body.nom is not None:
        ticket.nom = body.nom.strip()
    if body.email is not None:
        ticket.email = str(body.email).strip()
    if body.sujet is not None:
        ticket.sujet = _validate_sujet(body.sujet)
    if body.message is not None:
        ticket.message = body.message.strip()
    if body.status is not None:
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Seul un administrateur peut changer le statut."},
            )
        if body.status not in ALLOWED_STATUS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "Statut invalide."},
            )
        ticket.status = body.status
    db.add(ticket)
    db.commit()
    updated = _get_ticket_or_404(db, ticket.id)
    return {
        "message": "Ticket mis à jour avec succès",
        "data": ticket_to_dict(updated),
    }


@router.delete("/{ticket_id}")
def destroy(
    ticket_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Ticket introuvable."},
        )
    if not _can_access(user, ticket, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Vous n'êtes pas autorisé à supprimer ce ticket."},
        )
    code = ticket.code
    support_id = ticket.id
    db.delete(ticket)
    db.commit()
    return {
        "message": "Le ticket a été supprimé avec succès.",
        "support_id": support_id,
        "code": code,
    }


@router.post("/{ticket_id}/replies", status_code=status.HTTP_201_CREATED)
def reply(
    ticket_id: int,
    body: SupportReplyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = _get_ticket_or_404(db, ticket_id)
    if not _can_access(user, ticket, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Accès non autorisé"},
        )
    staff = user_is_admin(user, db)
    row = SupportTicketReply(
        support_ticket_id=ticket.id,
        user_id=user.id,
        message=body.message.strip(),
        is_staff=staff,
    )
    db.add(row)
    if staff and ticket.status == "en attente":
        ticket.status = "en traitement"
        db.add(ticket)
    if staff and ticket.user_id != user.id:
        snippet = body.message.strip()[:120]
        db.add(
            Notification(
                user_id=ticket.user_id,
                type="support_reply",
                kind="systeme",
                message=f"Réponse sur votre ticket {ticket.code} : {snippet}",
                href="/support",
                actor=user.name,
            )
        )
    db.commit()
    db.refresh(row)
    if row.author is None:
        row.author = user
    return reply_to_dict(row)
