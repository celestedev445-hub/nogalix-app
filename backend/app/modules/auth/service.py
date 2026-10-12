import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_token, hash_password, hash_token, token_expires_at, verify_password
from app.modules.users.models import Notification, PersonalAccessToken, User
from app.support.google_auth import GoogleAuthError, resolve_google_profile
from app.support.mail import reset_password_email_html, send_html_mail, verify_email_html
from app.support.otp import (
    clear_otp_attempts,
    generate_otp_code,
    has_too_many_otp_attempts,
    record_otp_attempt,
)

logger = logging.getLogger(__name__)

GENERIC_FORGOT_MESSAGE = (
    "Si cet e-mail est associé à un compte, un code de réinitialisation vous a été envoyé."
)
INVALID_RESET_MESSAGE = "Code de réinitialisation invalide ou expiré."
INVALID_VERIFY_MESSAGE = "Code de confirmation invalide ou expiré."
VERIFY_CODE_TTL = timedelta(hours=24)


LOCAL_ENVS = {"local", "development", "dev", "test"}


def _sync_admin_role(user: User, *, google_verified: bool = False) -> bool:
    """Promeut un compte ADMIN_EMAILS en role=admin. Retourne True si le rôle a changé.

    Uniquement après une authentification Google (e-mail vérifié par Google) :
    une inscription e-mail / mot de passe n'est jamais promue automatiquement,
    sinon n'importe qui pourrait créer un compte avec l'adresse d'un admin.
    """
    if not google_verified:
        return False
    allowlist = {
        item.strip().lower()
        for item in (settings.admin_emails or "").split(",")
        if item.strip()
    }
    email = (user.email or "").strip().lower()
    if email and email in allowlist and (user.role or "").lower() != "admin":
        user.role = "admin"
        return True
    return False


def issue_token(db: Session, user: User, name: str = "authToken") -> str:
    plain = generate_token()
    row = PersonalAccessToken(
        user_id=user.id,
        name=name,
        token_hash=hash_token(plain),
        expires_at=token_expires_at(),
    )
    db.add(row)
    db.commit()
    return plain


def auth_payload(
    db: Session,
    user: User,
    token: str,
    message: str,
    *,
    google_verified: bool = False,
) -> dict:
    from app.modules.plans.capability import capabilities_payload, get_user_plan, plan_summary
    from app.modules.plans.seed import get_default_free_plan

    dirty = False
    if not user.plan_id:
        free = get_default_free_plan(db)
        if free:
            user.plan_id = free.id
            dirty = True
    if _sync_admin_role(user, google_verified=google_verified):
        dirty = True
    if dirty:
        db.add(user)
        db.commit()
        db.refresh(user)

    plan = get_user_plan(db, user)
    user_dict = user.to_auth_dict()
    user_dict["plan"] = plan_summary(plan)
    user_dict["capabilities"] = capabilities_payload(plan, user)
    return {
        "message": message,
        "token": token,
        "access_token": token,
        "user": user_dict,
        "data": {
            "token": token,
            "user": user_dict,
        },
        "plan": plan_summary(plan),
        "capabilities": capabilities_payload(plan, user),
    }


def register_user(db: Session, *, name: str, email: str, password: str) -> dict:
    email_norm = email.lower().strip()
    if db.query(User).filter(User.email == email_norm).first():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Cet email est déjà utilisé.",
                "code": "email_taken",
                "errors": {"email": ["Cet email est déjà utilisé."]},
            },
        )

    user = User(
        name=name.strip(),
        email=email_norm,
        password_hash=hash_password(password),
        status="active",
        role="user",
        # Confirmé par le code envoyé par e-mail (POST /auth/verify-email).
        email_verified_at=None,
    )
    db.add(user)
    db.flush()
    from app.modules.plans.seed import get_default_free_plan

    free = get_default_free_plan(db)
    if free:
        user.plan_id = free.id
        db.add(user)
    db.add(
        Notification(
            user_id=user.id,
            type="systeme",
            kind="systeme",
            message="Bienvenue sur Nogalix. Créez votre premier CV pour démarrer.",
            href="/cv/nouveau",
            actor="Nogalix",
        )
    )
    db.commit()
    db.refresh(user)
    send_verification_code(db, user)
    token = issue_token(db, user)
    return auth_payload(db, user, token, "Inscription réussie")


def send_verification_code(db: Session, user: User) -> None:
    """Génère un nouveau code de confirmation d'e-mail et l'envoie (l'ancien devient invalide)."""
    code = generate_otp_code()
    user.email_verify_code = hash_password(code)
    user.email_verify_expires_at = datetime.now(timezone.utc) + VERIFY_CODE_TTL
    db.add(user)
    db.commit()
    clear_otp_attempts("verify", user.email)

    sent = send_html_mail(
        to_email=user.email,
        subject=f"Confirmez votre adresse e-mail pour {settings.app_name}",
        html_body=verify_email_html(user_name=user.name, code=code),
    )
    if not sent and (settings.app_env or "").strip().lower() in LOCAL_ENVS:
        logger.warning("Code de confirmation pour %s (mail non envoyé, debug local): %s", user.email, code)


def resend_verification_code(db: Session, user: User) -> dict:
    if user.email_verified_at is not None:
        return {"message": "Votre adresse e-mail est déjà confirmée.", "email_verified": True}
    send_verification_code(db, user)
    return {"message": f"Un nouveau code a été envoyé à {user.email}.", "email_verified": False}


def verify_email(db: Session, user: User, *, code: str) -> dict:
    if user.email_verified_at is not None:
        return {"message": "Votre adresse e-mail est déjà confirmée.", "email_verified": True}

    if has_too_many_otp_attempts("verify", user.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Trop de tentatives. Demandez un nouveau code.",
                "code": "otp_rate_limited",
            },
        )

    expires = user.email_verify_expires_at
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if (
        not user.email_verify_code
        or expires is None
        or datetime.now(timezone.utc) > expires
        or not verify_password(code.strip(), user.email_verify_code)
    ):
        record_otp_attempt("verify", user.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": INVALID_VERIFY_MESSAGE, "code": "invalid_verify_code"},
        )

    user.email_verified_at = datetime.now(timezone.utc)
    user.email_verify_code = None
    user.email_verify_expires_at = None
    db.add(user)
    db.commit()
    clear_otp_attempts("verify", user.email)
    return {"message": "Adresse e-mail confirmée.", "email_verified": True}


def login_user(db: Session, *, email: str, password: str) -> dict:
    email_norm = email.lower().strip()
    user = db.query(User).filter(User.email == email_norm).first()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Email ou mot de passe incorrect.", "code": "invalid_credentials"},
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Compte désactivé.", "code": "account_disabled"},
        )
    token = issue_token(db, user)
    return auth_payload(db, user, token, "Connexion réussie")


def logout_user(db: Session, authorization: str | None) -> dict:
    if not authorization:
        return {"message": "Déconnexion réussie"}
    parts = authorization.split(" ", 1)
    if len(parts) != 2:
        return {"message": "Déconnexion réussie"}
    token_hash = hash_token(parts[1].strip())
    row = db.query(PersonalAccessToken).filter(PersonalAccessToken.token_hash == token_hash).first()
    if row:
        db.delete(row)
        db.commit()
    return {"message": "Déconnexion réussie"}


async def login_with_google(db: Session, payload: dict) -> dict:
    try:
        profile = await resolve_google_profile(payload)
    except GoogleAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": exc.message, "code": exc.code},
        ) from exc

    user = None
    if profile.get("google_id"):
        user = db.query(User).filter(User.google_id == profile["google_id"]).first()
    if not user:
        user = db.query(User).filter(User.email == profile["email"]).first()

    if user:
        user.has_google = True
        if user.email_verified_at is None:
            # Google a vérifié cette adresse.
            user.email_verified_at = datetime.now(timezone.utc)
            user.email_verify_code = None
            user.email_verify_expires_at = None
        if profile.get("google_id"):
            user.google_id = profile["google_id"]
        if profile.get("avatar") and not user.avatar:
            user.avatar = profile["avatar"]
        if not user.name and profile.get("name"):
            user.name = profile["name"]
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user = User(
            name=profile["name"],
            email=profile["email"],
            google_id=profile.get("google_id"),
            has_google=True,
            avatar=profile.get("avatar"),
            status="active",
            role="user",
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        from app.modules.plans.seed import get_default_free_plan

        free = get_default_free_plan(db)
        if free:
            user.plan_id = free.id
            db.add(user)
        db.add(
            Notification(
                user_id=user.id,
                type="systeme",
                kind="systeme",
                message="Bienvenue sur Nogalix. Créez votre premier CV pour démarrer.",
                href="/cv/nouveau",
                actor="Nogalix",
            )
        )
        db.commit()
        db.refresh(user)

    token = issue_token(db, user)
    return auth_payload(db, user, token, "Connexion Google réussie", google_verified=True)


def forgot_password(db: Session, *, email: str) -> dict:
    email_norm = email.lower().strip()
    user = db.query(User).filter(User.email == email_norm).first()
    if not user:
        return {"message": GENERIC_FORGOT_MESSAGE}

    reset_code = generate_otp_code()
    user.reset_code = hash_password(reset_code)
    user.reset_code_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.add(user)
    db.commit()
    clear_otp_attempts("reset", email_norm)

    sent = send_html_mail(
        to_email=user.email,
        subject=f"Réinitialisation de mot de passe pour {settings.app_name}",
        html_body=reset_password_email_html(user_name=user.name, reset_code=reset_code),
    )
    if not sent and (settings.app_env or "").strip().lower() in LOCAL_ENVS:
        logger.warning(
            "Reset OTP pour %s (mail non envoyé, debug local): %s",
            user.email,
            reset_code,
        )

    return {"message": GENERIC_FORGOT_MESSAGE}


def reset_password(db: Session, *, email: str, code: str, password: str) -> dict:
    email_norm = email.lower().strip()

    if has_too_many_otp_attempts("reset", email_norm):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Trop de tentatives. Réessayez dans quelques minutes ou demandez un nouveau code.",
                "code": "otp_rate_limited",
            },
        )

    user = db.query(User).filter(User.email == email_norm).first()
    if not user or not user.reset_code or not user.reset_code_expires_at:
        record_otp_attempt("reset", email_norm)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": INVALID_RESET_MESSAGE, "code": "invalid_reset_code"},
        )

    expires = user.reset_code_expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        record_otp_attempt("reset", email_norm)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": INVALID_RESET_MESSAGE, "code": "invalid_reset_code"},
        )

    if not verify_password(code.strip(), user.reset_code):
        record_otp_attempt("reset", email_norm)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": INVALID_RESET_MESSAGE, "code": "invalid_reset_code"},
        )

    user.password_hash = hash_password(password)
    user.reset_code = None
    user.reset_code_expires_at = None
    db.add(user)
    db.query(PersonalAccessToken).filter(PersonalAccessToken.user_id == user.id).delete()
    db.commit()
    clear_otp_attempts("reset", email_norm)

    return {"message": "Mot de passe réinitialisé avec succès"}
