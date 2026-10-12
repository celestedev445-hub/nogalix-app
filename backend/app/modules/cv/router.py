from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
import base64
import binascii
import json
import logging

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.modules.cv import service as cv_service
from app.modules.cv.analyse_schemas import (
    CvAnalyseRequest,
    CvImportParseRequest,
    CvImportParseResponse,
    CvMatchAnalyseRequest,
    CvRewriteAnalyseRequest,
    CvTranslateRequest,
    CvTranslateResponse,
    CvUploadAnalyseRequest,
)
from app.modules.cv.import_parse import ImportedCvAiError, parse_imported_cv
from app.modules.cv.translate import CvTranslateError, translate_cv
from app.modules.cv.import_storage import (
    ImportVariant,
    bump_version,
    editable_path,
    has_import_files,
    read_meta,
    save_original_file,
)
from app.modules.cv.onlyoffice import (
    ImportAccessNotConfigured,
    build_editor_config,
    callback_response,
    download_edited_document,
    onlyoffice_enabled,
    verify_document_access_token,
    verify_onlyoffice_callback,
)
from app.modules.cv.schemas import CvPayload
from app.modules.cv.text_extract import extract_resume_text
from app.modules.cv.extract_photo import extract_cv_photo
from app.modules.cv.pdf_to_docx import convert_pdf_to_docx
from app.modules.cv.pdf_to_editable import convert_pdf_to_editable
from app.modules.plans.capability import ensure_ai_trial, refund_ai_trial
from app.modules.users.models import User
from app.support.uploads import UploadRejected, read_limited, sniff_extension

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cv", tags=["cv"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_CALLBACK_BYTES = 256 * 1024
AI_RATE = "20/minute"
IMPORT_RATE = "20/minute"


def _is_local_result(result: object) -> bool:
    return isinstance(result, dict) and result.get("source") == "local"


@router.get("")
def index(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return cv_service.list_cvs(db, user)


@router.get("/{cv_id}")
def show(cv_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return cv_service.get_cv(db, user, cv_id)


@router.post("")
def store(body: CvPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return cv_service.create_cv(db, user, body)


@router.put("/{cv_id}")
def update(
    cv_id: str,
    body: CvPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return cv_service.update_cv(db, user, cv_id, body)


@router.post("/{cv_id}/duplicate", status_code=201)
def duplicate(cv_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return cv_service.duplicate_cv(db, user, cv_id)


@router.delete("/{cv_id}")
def destroy(cv_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return cv_service.delete_cv(db, user, cv_id)


@router.post("/translate", response_model=CvTranslateResponse)
@limiter.limit(AI_RATE)
async def translate_cv_content(
    request: Request,
    body: CvTranslateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    consumed = ensure_ai_trial(db, user)
    try:
        return await translate_cv(
            cv=body.cv,
            language_name=body.languageName,
            language_code=body.languageCode,
        )
    except CvTranslateError as exc:
        refund_ai_trial(db, user, consumed)
        raise HTTPException(status_code=503, detail={"message": str(exc)}) from exc
    except Exception:
        refund_ai_trial(db, user, consumed)
        raise


@router.post("/analyse/rewrite")
@limiter.limit(AI_RATE)
async def analyse_rewrite(
    request: Request,
    body: CvRewriteAnalyseRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    consumed = ensure_ai_trial(db, user)
    try:
        result = await cv_service.rewrite_from_analyse(db, user, body)
    except Exception:
        refund_ai_trial(db, user, consumed)
        raise
    if _is_local_result(result):
        # L'IA n'a pas répondu : repli local, l'action IA n'est pas décomptée.
        refund_ai_trial(db, user, consumed)
    return result


@router.post("/analyse/match")
@limiter.limit(AI_RATE)
async def analyse_match(
    request: Request,
    body: CvMatchAnalyseRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    consumed = ensure_ai_trial(db, user)
    try:
        result = await cv_service.match_analyse(db, user, body)
    except Exception:
        refund_ai_trial(db, user, consumed)
        raise
    if _is_local_result(result):
        refund_ai_trial(db, user, consumed)
    return result


async def _extract_text_or_422(file_name: str, content: bytes) -> str:
    try:
        text = await run_in_threadpool(extract_resume_text, file_name, content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc

    if len(text) < 80:
        raise HTTPException(
            status_code=422,
            detail={"message": "Le document ne contient pas assez de texte pour une analyse fiable."},
        )
    return text


@router.post("/analyse/upload")
@limiter.limit(AI_RATE)
async def analyse_upload(
    request: Request,
    body: CvUploadAnalyseRequest,
    user: User = Depends(get_current_user),
):
    try:
        content = base64.b64decode(body.contentBase64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=422, detail={"message": "Fichier invalide."}) from exc

    if not content:
        raise HTTPException(status_code=422, detail={"message": "Fichier vide."})
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=422, detail={"message": "Fichier trop lourd (5 Mo max)."})

    text = await _extract_text_or_422(body.fileName or "cv.txt", content)
    return {"text": text, "fileName": body.fileName or "document", "jobOffer": body.jobOffer}


@router.post("/analyse/upload-multipart")
@limiter.limit(AI_RATE)
async def analyse_upload_multipart(
    request: Request,
    file: UploadFile = File(...),
    job_offer: str = Form("", max_length=20000),
    user: User = Depends(get_current_user),
):
    content = await read_limited(file, MAX_UPLOAD_BYTES)
    text = await _extract_text_or_422(file.filename or "cv.txt", content)
    return {"text": text, "fileName": file.filename or "document", "jobOffer": job_offer}


@router.post("/import/parse", response_model=CvImportParseResponse)
@limiter.limit(IMPORT_RATE)
async def import_parse(
    request: Request,
    body: CvImportParseRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    text = (body.text or "").strip()
    if len(text) < 20:
        raise HTTPException(
            status_code=422,
            detail={"message": "Pas assez de texte pour pré-remplir le modèle."},
        )
    consumed = ensure_ai_trial(db, user) if body.requireAi else False
    try:
        return await parse_imported_cv(text, body.fileName or "", require_ai=body.requireAi)
    except ImportedCvAiError as exc:
        refund_ai_trial(db, user, consumed)
        raise HTTPException(status_code=503, detail={"message": str(exc)}) from exc
    except Exception as exc:
        refund_ai_trial(db, user, consumed)
        logger.exception("Extraction des sections du CV impossible.")
        raise HTTPException(
            status_code=422,
            detail={"message": "Impossible d'extraire les sections de ce CV."},
        ) from exc


@router.post("/import/pdf-to-docx")
@limiter.limit(IMPORT_RATE)
async def import_pdf_to_docx(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Pas de contrôle export.word : cette conversion sert à ÉDITER un PDF importé (outil gratuit).
    content = await read_limited(file, MAX_UPLOAD_BYTES)
    if sniff_extension(content) != "pdf":
        raise HTTPException(status_code=422, detail={"message": "Seuls les fichiers PDF sont acceptés."})

    try:
        docx_bytes = await run_in_threadpool(convert_pdf_to_docx, content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc

    file_name = file.filename or "cv.pdf"
    base_name = file_name.rsplit(".", 1)[0] or "cv"
    return {
        "fileName": f"{base_name}.docx",
        "contentBase64": base64.b64encode(docx_bytes).decode("ascii"),
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }


@router.post("/import/pdf-to-editable")
@limiter.limit(IMPORT_RATE)
async def import_pdf_to_editable(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    content = await read_limited(file, MAX_UPLOAD_BYTES)
    if sniff_extension(content) != "pdf":
        raise HTTPException(status_code=422, detail={"message": "Seuls les fichiers PDF sont acceptés."})

    try:
        return await run_in_threadpool(convert_pdf_to_editable, content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc


@router.post("/import/extract-photo")
@limiter.limit(IMPORT_RATE)
async def import_extract_photo(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    content = await read_limited(file, MAX_UPLOAD_BYTES)
    kind = sniff_extension(content)
    if kind not in {"pdf", "docx"}:
        raise HTTPException(status_code=422, detail={"message": "PDF ou Word uniquement."})

    photo = await run_in_threadpool(extract_cv_photo, content, f"cv.{kind}")
    return {"photo": photo}


@router.get("/import/document/{cv_id}")
def serve_import_document(
    cv_id: str,
    token: str = Query(...),
    variant: ImportVariant = Query("editable"),
):
    try:
        user_id, token_cv_id, token_variant = verify_document_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail={"message": str(exc)}) from exc

    if token_cv_id != cv_id or token_variant != variant:
        raise HTTPException(status_code=403, detail={"message": "Accès refusé."})

    try:
        from app.modules.cv.import_storage import resolve_document_path

        path = resolve_document_path(user_id, cv_id, variant)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail={"message": str(exc)}) from exc

    media_type = (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if path.suffix.lower() == ".docx"
        else "application/pdf"
        if path.suffix.lower() == ".pdf"
        else "application/octet-stream"
    )
    return FileResponse(path, media_type=media_type, filename=path.name)


@router.post("/import/onlyoffice/callback")
async def onlyoffice_callback(
    request: Request,
    cv_id: str = Query(...),
    token: str = Query(...),
    authorization: Optional[str] = Header(default=None),
):
    try:
        user_id, token_cv_id, _variant = verify_document_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail={"message": str(exc)}) from exc

    if token_cv_id != cv_id:
        raise HTTPException(status_code=403, detail={"message": "Accès refusé."})

    raw = await request.body()
    if len(raw) > MAX_CALLBACK_BYTES:
        return callback_response(1)
    try:
        body = json.loads(raw or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return callback_response(1)
    if not isinstance(body, dict):
        return callback_response(1)

    # Si ONLYOFFICE_JWT_SECRET est défini, seul le contenu signé fait foi.
    try:
        body = verify_onlyoffice_callback(body, authorization)
    except ValueError as exc:
        logger.warning("Callback OnlyOffice refusé (%s) pour %s", exc, cv_id)
        raise HTTPException(status_code=403, detail={"message": str(exc)}) from exc

    try:
        callback_status = int(body.get("status") or 0)
    except (TypeError, ValueError):
        return callback_response(1)

    if callback_status in {2, 6}:
        download_url = body.get("url")
        if not isinstance(download_url, str) or not download_url.strip():
            return callback_response(1)
        try:
            content = await download_edited_document(download_url)
            if sniff_extension(content) != "docx":
                raise ValueError("Document OnlyOffice invalide.")
            editable_path(user_id, cv_id).write_bytes(content)
            bump_version(user_id, cv_id)
        except Exception as exc:
            logger.warning("Callback OnlyOffice : enregistrement impossible (%s)", exc)
            return callback_response(1)

    return callback_response(0)


@router.post("/{cv_id}/import/upload")
@limiter.limit(IMPORT_RATE)
async def upload_import_file(
    request: Request,
    cv_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 404 si le CV n'existe pas ou n'appartient pas à l'utilisateur.
    cv_service.get_cv(db, user, cv_id)

    content = await read_limited(file, MAX_UPLOAD_BYTES)

    try:
        meta = await run_in_threadpool(
            save_original_file,
            user.id,
            cv_id,
            content,
            file.filename or "cv",
            file.content_type or "application/octet-stream",
        )
    except UploadRejected:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc

    return {"ok": True, "meta": meta.to_dict()}


@router.get("/{cv_id}/import/editor-config")
def import_editor_config(
    cv_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cv = cv_service.get_cv(db, user, cv_id)

    if not onlyoffice_enabled():
        return {"enabled": False, "ready": False}

    if not has_import_files(user.id, cv_id):
        return {
            "enabled": True,
            "ready": False,
            "documentServerUrl": settings.onlyoffice_url.rstrip("/") + "/",
        }

    meta = read_meta(user.id, cv_id)
    if not meta:
        return {
            "enabled": True,
            "ready": False,
            "documentServerUrl": settings.onlyoffice_url.rstrip("/") + "/",
        }

    display_name = user.name or user.email or "Utilisateur"
    try:
        config = build_editor_config(
            user_id=user.id,
            cv_id=cv_id,
            user_name=display_name,
            meta=meta,
            title=str(cv.get("title") or meta.original_name),
        )
    except ImportAccessNotConfigured as exc:
        logger.error("%s", exc)
        raise HTTPException(
            status_code=503,
            detail={"message": "L'édition en ligne n'est pas configurée sur le serveur."},
        ) from exc
    return {
        "enabled": True,
        "ready": True,
        "documentServerUrl": settings.onlyoffice_url.rstrip("/") + "/",
        "config": config,
    }


@router.post("/{cv_id}/analyse")
def analyse(
    cv_id: str,
    body: CvAnalyseRequest = CvAnalyseRequest(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    job_offer = body.jobOffer or ""
    return cv_service.analyze_cv(db, user, cv_id, job_offer=job_offer)
