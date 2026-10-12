"""Bibliothèque Documents (lettres, exports, pièces jointes) et offres d'emploi enregistrées."""

import re
import shutil
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.documents.models import SavedJob, UserDocument
from app.modules.users.models import User
from app.support.uploads import (
    DOCUMENT_EXTENSIONS,
    IMAGE_EXTENSIONS,
    ensure_json_size,
    mime_for_extension,
    read_limited,
    require_kind,
)

router = APIRouter(tags=["documents"])

STORAGE_ROOT = Path(__file__).resolve().parents[3] / "storage" / "documents"
MAX_DOCUMENTS = 300
MAX_SAVED_JOBS = 300
FILE_KINDS = DOCUMENT_EXTENSIONS | IMAGE_EXTENSIONS


def user_documents_dir(user_id: int) -> Path:
    return STORAGE_ROOT / str(int(user_id))


def _safe_name(name: str, ext: str) -> str:
    stem = re.sub(r"[^\w .()-]+", "-", Path(name or "document").stem, flags=re.UNICODE).strip() or "document"
    return f"{stem[:120]}.{ext}"


def _own(db: Session, user: User, doc_id: str) -> UserDocument:
    doc = db.query(UserDocument).filter(UserDocument.id == doc_id, UserDocument.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail={"message": "Document introuvable."})
    return doc


def _ensure_quota(db: Session, user: User) -> None:
    if db.query(UserDocument).filter(UserDocument.user_id == user.id).count() >= MAX_DOCUMENTS:
        raise HTTPException(
            status_code=422,
            detail={"message": f"Limite de {MAX_DOCUMENTS} documents atteinte. Supprimez-en avant d'en ajouter."},
        )


class DocumentUpsert(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = Field(default=None, max_length=36)
    kind: Literal["lettre", "export", "piece"] = "lettre"
    title: str = Field(min_length=1, max_length=190)
    fileName: Optional[str] = Field(default=None, max_length=190)
    mime: Optional[str] = Field(default=None, max_length=120)
    cvId: Optional[str] = Field(default=None, max_length=36)
    body: Optional[str] = Field(default=None, max_length=200_000)


@router.get("/documents")
def list_documents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(UserDocument)
        .filter(UserDocument.user_id == user.id)
        .order_by(UserDocument.updated_at.desc())
        .all()
    )
    return {"data": [row.to_dict() for row in rows]}


@router.post("/documents", status_code=status.HTTP_201_CREATED)
def create_document(body: DocumentUpsert, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if body.id:
        existing = db.query(UserDocument).filter(UserDocument.id == body.id).first()
        if existing and existing.user_id == user.id:
            return update_document(body.id, body, db, user)
    _ensure_quota(db, user)
    text = body.body or ""
    doc = UserDocument(
        user_id=user.id,
        kind=body.kind,
        title=body.title.strip(),
        file_name=(body.fileName or f"{body.title.strip()}.txt")[:190],
        mime=body.mime or "text/plain",
        size=len(text.encode("utf-8")),
        cv_id=body.cvId,
        body=text,
    )
    if body.id and not db.query(UserDocument).filter(UserDocument.id == body.id).first():
        doc.id = body.id
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"message": "Document enregistré", "data": doc.to_dict()}


@router.put("/documents/{doc_id}")
def update_document(
    doc_id: str,
    body: DocumentUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = _own(db, user, doc_id)
    doc.title = body.title.strip()
    doc.kind = body.kind
    if body.fileName:
        doc.file_name = body.fileName[:190]
    if body.cvId is not None:
        doc.cv_id = body.cvId or None
    if body.body is not None and not doc.storage_path:
        doc.body = body.body
        doc.size = len(body.body.encode("utf-8"))
        if body.mime:
            doc.mime = body.mime
    db.commit()
    db.refresh(doc)
    return {"message": "Document mis à jour", "data": doc.to_dict()}


@router.post("/documents/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    kind: Literal["export", "piece", "lettre"] = Form(default="piece"),
    title: Optional[str] = Form(default=None, max_length=190),
    cvId: Optional[str] = Form(default=None, max_length=36),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_quota(db, user)
    content = await read_limited(file, settings.documents_max_bytes)
    ext = require_kind(content, FILE_KINDS, "Format non pris en charge (PDF, Word, JPG, PNG ou WebP).")
    file_name = _safe_name(file.filename or title or "document", ext)
    doc = UserDocument(
        user_id=user.id,
        kind=kind,
        title=(title or Path(file_name).stem).strip()[:190] or "Document",
        file_name=file_name,
        mime=mime_for_extension(ext),
        size=len(content),
        cv_id=cvId or None,
    )
    db.add(doc)
    db.flush()
    folder = user_documents_dir(user.id)
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"{doc.id}.{ext}"
    target.write_bytes(content)
    doc.storage_path = f"{user.id}/{target.name}"
    db.commit()
    db.refresh(doc)
    return {"message": "Document importé", "data": doc.to_dict()}


@router.get("/documents/{doc_id}/file")
def download_document(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = _own(db, user, doc_id)
    if not doc.storage_path:
        raise HTTPException(status_code=404, detail={"message": "Ce document n'a pas de fichier associé."})
    path = (STORAGE_ROOT / doc.storage_path).resolve()
    if STORAGE_ROOT.resolve() not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail={"message": "Fichier introuvable."})
    return FileResponse(path, media_type=doc.mime, filename=doc.file_name)


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = _own(db, user, doc_id)
    if doc.storage_path:
        path = (STORAGE_ROOT / doc.storage_path).resolve()
        if STORAGE_ROOT.resolve() in path.parents:
            path.unlink(missing_ok=True)
    db.delete(doc)
    db.commit()
    return {"message": "Document supprimé"}


def purge_documents(user_id: int) -> None:
    shutil.rmtree(user_documents_dir(user_id), ignore_errors=True)


# ---------------------------------------------------------------- offres enregistrées
class SavedJobRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=190)
    job: Optional[dict[str, Any]] = None

    @field_validator("job")
    @classmethod
    def _bounded(cls, value):
        return ensure_json_size(value, 32 * 1024, "Offre")


@router.get("/jobs/saved")
def list_saved_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(SavedJob).filter(SavedJob.user_id == user.id).order_by(SavedJob.created_at.desc()).all()
    return {"data": [row.to_dict() for row in rows]}


@router.post("/jobs/saved", status_code=status.HTTP_201_CREATED)
def save_job(body: SavedJobRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(SavedJob).filter(SavedJob.user_id == user.id, SavedJob.job_id == body.id).first()
    if row:
        if body.job:
            row.payload = body.job
            db.commit()
        return {"message": "Offre sauvegardée", "data": row.to_dict()}
    if db.query(SavedJob).filter(SavedJob.user_id == user.id).count() >= MAX_SAVED_JOBS:
        raise HTTPException(status_code=422, detail={"message": "Limite d'offres enregistrées atteinte."})
    row = SavedJob(user_id=user.id, job_id=body.id, payload=body.job)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"message": "Offre sauvegardée", "data": row.to_dict()}


@router.delete("/jobs/saved/{job_id:path}")
def unsave_job(job_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(SavedJob).filter(SavedJob.user_id == user.id, SavedJob.job_id == job_id).delete()
    db.commit()
    return {"message": "Offre retirée"}
