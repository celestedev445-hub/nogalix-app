from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.modules.profile.account import purge_user_files
from app.modules.profile.schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    PreferencesUpdateRequest,
    ProfileUpdateRequest,
)
from app.modules.users.models import PersonalAccessToken, User
from app.support.cloudinary_storage import cloudinary_storage
from app.support.uploads import IMAGE_EXTENSIONS, read_limited, require_kind

router = APIRouter(prefix="/profile", tags=["profile"])

ALLOWED_AVATAR = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_AVATAR_BYTES = 5 * 1024 * 1024


def _full_payload(db: Session, user: User) -> dict:
    """Profil + plan + capacités : même forme que GET /auth/user (le front remplace l'utilisateur)."""
    from app.modules.plans.capability import capabilities_payload, get_user_plan, plan_summary

    plan = get_user_plan(db, user)
    payload = user.to_auth_dict()
    payload["plan"] = plan_summary(plan)
    payload["capabilities"] = capabilities_payload(plan, user)
    return payload


def _apply_preferences(user: User, body) -> None:
    if body.notifyEmail is not None:
        user.notify_email = body.notifyEmail
    if body.notifyJobs is not None:
        user.notify_jobs = body.notifyJobs
    if body.notifyAnalysis is not None:
        user.notify_analysis = body.notifyAnalysis


@router.get("")
def show(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    payload = _full_payload(db, user)
    return {"data": payload, **payload}


@router.put("")
def update(
    body: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    email_norm = str(body.email).lower().strip()
    existing = (
        db.query(User)
        .filter(User.email == email_norm, User.id != user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Cet email est déjà utilisé.",
                "errors": {"email": ["Cet email est déjà utilisé."]},
            },
        )

    user.name = body.name.strip()
    user.email = email_norm
    user.phone = body.phone
    user.location = body.location
    _apply_preferences(user, body)
    db.add(user)
    db.commit()
    db.refresh(user)
    payload = _full_payload(db, user)
    return {"message": "Profil mis à jour", "data": payload, "user": payload}


@router.put("/preferences")
def update_preferences(
    body: PreferencesUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _apply_preferences(user, body)
    db.add(user)
    db.commit()
    db.refresh(user)
    payload = _full_payload(db, user)
    return {"message": "Préférences enregistrées", "data": payload, "user": payload}


@router.delete("")
def delete_account(
    body: DeleteAccountRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.confirm.strip().upper() != "SUPPRIMER":
        raise HTTPException(
            status_code=422,
            detail={"message": "Tapez SUPPRIMER pour confirmer la suppression du compte."},
        )
    if user.password_hash and not verify_password(body.password or "", user.password_hash):
        raise HTTPException(
            status_code=400,
            detail={"message": "Mot de passe incorrect.", "code": "invalid_current_password"},
        )
    if user.avatar:
        try:
            cloudinary_storage.delete(user.avatar, resource_type="image")
        except Exception:
            pass
    purge_user_files(user.id)
    db.delete(user)
    db.commit()
    return {"message": "Votre compte et vos données ont été supprimés."}


@router.post("/password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Ce compte n'a pas encore de mot de passe. Utilisez « Mot de passe oublié » pour en créer un.",
                "code": "no_password",
            },
        )
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Mot de passe actuel incorrect.",
                "code": "invalid_current_password",
            },
        )

    user.password_hash = hash_password(body.password)
    db.add(user)
    db.query(PersonalAccessToken).filter(PersonalAccessToken.user_id == user.id).delete()
    db.commit()
    return {"message": "Mot de passe mis à jour. Reconnectez-vous."}


@router.post("/avatar")
async def avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content_type = (avatar.content_type or "").lower()
    if content_type not in ALLOWED_AVATAR:
        raise HTTPException(
            status_code=422,
            detail={"message": "Format d'image non supporté (jpeg, png, webp)."},
        )

    raw = await read_limited(avatar, MAX_AVATAR_BYTES)
    require_kind(raw, IMAGE_EXTENSIONS, "Format d'image non supporté (jpeg, png, webp).")
    result = await cloudinary_storage.upload_detailed(avatar, "avatars", "image", content=raw)
    url = str(result.get("url") or "")
    previous = user.avatar
    user.avatar = url
    db.add(user)
    db.commit()
    db.refresh(user)
    if previous and previous != url:
        try:
            cloudinary_storage.delete(previous, resource_type="image")
        except Exception:
            pass
    payload = _full_payload(db, user)
    return {"message": "Avatar mis à jour", "data": payload, "avatar": url, "user": payload}
