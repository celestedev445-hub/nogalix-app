from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_token
from app.modules.users.models import PersonalAccessToken, User


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Non authentifié."},
        )

    token_hash = hash_token(token)
    row = (
        db.query(PersonalAccessToken)
        .filter(PersonalAccessToken.token_hash == token_hash)
        .first()
    )
    if not row or row.is_expired:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Veuillez vous reconnecter."},
        )

    user = db.query(User).filter(User.id == row.user_id).first()
    if not user or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Compte indisponible."},
        )

    # Évite une écriture en base à chaque requête : last_used_at à 5 minutes près suffit.
    last = row.last_used_at
    if last is not None and last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    if last is None or last < datetime.now(timezone.utc) - timedelta(minutes=5):
        row.touch()
        db.add(row)
        db.commit()

    if user.plan_expires_at is not None:
        from app.modules.payments.service import expire_plan_if_needed

        expire_plan_if_needed(db, user)
    return user


def get_optional_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    token = _extract_bearer(authorization)
    if not token:
        return None
    try:
        return get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None


def user_is_admin(user: User, db: Session) -> bool:
    # Le rôle est la seule source de vérité. La promotion via ADMIN_EMAILS se fait
    # uniquement à la connexion Google (e-mail vérifié), ou via scripts/create_admin.py.
    return user.is_admin()


def require_admin(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if user_is_admin(user, db):
        return user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"message": "Accès administrateur requis.", "code": "admin_required"},
    )
