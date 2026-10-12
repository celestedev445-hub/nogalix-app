import html
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_optional_user
from app.core.limiter import limiter
from app.modules.contact.models import ContactMessage
from app.modules.users.models import Notification, User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["contact"])


class ContactRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    objet: str = Field(min_length=2, max_length=190)
    message: str = Field(min_length=5, max_length=5000)


def _mail_team(row: ContactMessage) -> None:
    from app.support.mail import send_html_mail

    if not settings.contact_to_email:
        return
    body = (
        f"<p><strong>De :</strong> {html.escape(row.name)} &lt;{html.escape(row.email)}&gt;</p>"
        f"<p><strong>Objet :</strong> {html.escape(row.objet)}</p>"
        f"<p style=\"white-space:pre-wrap\">{html.escape(row.message)}</p>"
    )
    send_html_mail(
        to_email=settings.contact_to_email,
        subject=f"[{settings.app_name}] Contact : {row.objet[:120]}",
        html_body=body,
    )


@router.post("/contact", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def contact(
    request: Request,
    body: ContactRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    row = ContactMessage(
        user_id=user.id if user else None,
        name=body.name.strip(),
        email=str(body.email).lower(),
        objet=body.objet.strip(),
        message=body.message.strip(),
    )
    db.add(row)
    for admin in db.query(User).filter(User.role == "admin").all():
        db.add(
            Notification(
                user_id=admin.id,
                type="contact",
                kind="systeme",
                message=f"Nouveau message de {row.name} : {row.objet[:120]}",
                href="/admin/messages",
                actor=row.name,
            )
        )
    db.commit()
    db.refresh(row)

    try:
        await run_in_threadpool(_mail_team, row)
    except Exception:
        logger.exception("Envoi du message de contact %s par e-mail impossible", row.id)

    return {
        "message": "Message reçu. Nous vous répondrons rapidement.",
        "data": {"id": str(row.id), "name": row.name, "email": row.email, "objet": row.objet},
    }
