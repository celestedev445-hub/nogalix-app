import base64
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool

from app.core.ai import AiError
from app.core.limiter import limiter
from app.modules.convert.detect import (
    ConvertKind,
    ConvertKindError,
    detect_kind,
    mime_for,
    opposite_kind,
)
from app.modules.convert.image_text import (
    detect_image_mime,
    extract_image_markdown,
    read_image_layout,
)
from app.modules.cv.pdf_to_docx import convert_pdf_to_docx
from app.modules.cv.pdf_to_editable import convert_pdf_to_editable
from app.support.uploads import read_limited

router = APIRouter(prefix="/convert", tags=["convert"])

MAX_BYTES = 5 * 1024 * 1024
MAX_IMAGE_BYTES = 8 * 1024 * 1024


class ConvertResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fileName: str
    mimeType: str
    contentBase64: str = Field(min_length=1)
    source: ConvertKind
    target: ConvertKind


def _normalize_target(raw: Optional[str], source: ConvertKind) -> ConvertKind:
    if raw is None or raw.strip() == "" or raw.strip().lower() in {"auto", "other"}:
        return opposite_kind(source)
    wanted = raw.strip().lower()
    if wanted in {"word", "doc"}:
        return "docx"
    if wanted == "pdf":
        return "pdf"
    if wanted == "docx":
        return "docx"
    raise HTTPException(status_code=422, detail={"message": "Choisissez le format PDF ou Word."})


@router.post("/pdf-to-editable")
@limiter.limit("8/minute")
async def public_pdf_to_editable(
    request: Request,
    file: UploadFile = File(...),
):
    content = await read_limited(file, MAX_BYTES)
    try:
        kind = detect_kind(content, file.filename or "document.pdf", file.content_type or "")
    except ConvertKindError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc
    if kind != "pdf":
        raise HTTPException(status_code=422, detail={"message": "Seuls les fichiers PDF sont acceptés."})
    try:
        return await run_in_threadpool(convert_pdf_to_editable, content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc


@router.post("/pdf-to-docx")
@limiter.limit("8/minute")
async def public_pdf_to_docx(
    request: Request,
    file: UploadFile = File(...),
):
    content = await read_limited(file, MAX_BYTES)
    try:
        kind = detect_kind(content, file.filename or "document.pdf", file.content_type or "")
    except ConvertKindError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc
    if kind != "pdf":
        raise HTTPException(status_code=422, detail={"message": "Seuls les fichiers PDF sont acceptés."})
    try:
        docx_bytes = await run_in_threadpool(convert_pdf_to_docx, content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc

    base_name = Path(file.filename or "document").stem.strip() or "document"
    return {
        "fileName": f"{base_name}.docx",
        "contentBase64": base64.b64encode(docx_bytes).decode("ascii"),
        "mimeType": mime_for("docx"),
    }


@router.post("", response_model=ConvertResponse)
@limiter.limit("8/minute")
async def convert_file(
    request: Request,
    file: UploadFile = File(...),
    target: Optional[str] = Form(None),
) -> ConvertResponse:
    content = await read_limited(file, MAX_BYTES)

    source_name = file.filename or "document"
    try:
        source = detect_kind(content, source_name, file.content_type or "")
    except ConvertKindError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc

    wanted = _normalize_target(target, source)
    base_name = Path(source_name).stem.strip() or "document"

    if wanted != source:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "La conversion fidèle se fait dans le navigateur, comme dans l’éditeur."
            },
        )

    return ConvertResponse(
        fileName=f"{base_name}.{'pdf' if wanted == 'pdf' else 'docx'}",
        mimeType=mime_for(wanted),
        contentBase64=base64.b64encode(content).decode("ascii"),
        source=source,
        target=wanted,
    )


@router.post("/image-text")
@limiter.limit("6/minute")
async def image_text(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form("layout"),
):
    """Texte d'une image : `layout` = lignes positionnées pour l'édition, `extract` = Markdown structuré."""
    content = await read_limited(file, MAX_IMAGE_BYTES)
    mime = detect_image_mime(content)
    if not mime:
        raise HTTPException(status_code=422, detail={"message": "Formats acceptés : PNG, JPG ou WebP."})
    try:
        if mode == "extract":
            return {"markdown": await extract_image_markdown(content, mime)}
        if mode == "layout":
            return {"lines": await read_image_layout(content, mime)}
    except AiError as exc:
        raise HTTPException(status_code=503, detail={"message": str(exc)}) from exc
    raise HTTPException(status_code=422, detail={"message": "Mode inconnu."})
