"""Lecture bornée des uploads et détection de type par magic bytes."""

from __future__ import annotations

import io
import json
import zipfile
from typing import Any, Optional

from fastapi import HTTPException, UploadFile

CHUNK_SIZE = 64 * 1024
DEFAULT_MAX_BYTES = 5 * 1024 * 1024

IMAGE_EXTENSIONS = {"jpg", "png", "webp"}
AUDIO_EXTENSIONS = {"webm", "ogg", "mp3", "wav", "m4a"}
DOCUMENT_EXTENSIONS = {"pdf", "docx"}

MIME_BY_EXTENSION = {
    "jpg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "webm": "audio/webm",
    "ogg": "audio/ogg",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "m4a": "audio/mp4",
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class UploadRejected(HTTPException, ValueError):
    """Fichier refusé : HTTP 422 avec message français (reste un ValueError)."""

    def __init__(self, message: str, status_code: int = 422):
        HTTPException.__init__(self, status_code=status_code, detail={"success": False, "message": message})
        self.message = message

    def __str__(self) -> str:
        return self.message


def _size_label(max_bytes: int) -> str:
    mb = max_bytes / (1024 * 1024)
    return f"{mb:g} Mo"


async def read_limited(
    file: UploadFile,
    max_bytes: int = DEFAULT_MAX_BYTES,
    *,
    allow_empty: bool = False,
) -> bytes:
    """Lit un UploadFile par morceaux et refuse au-delà de max_bytes (422)."""
    buffer = bytearray()
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > max_bytes:
            raise UploadRejected(f"Fichier trop lourd ({_size_label(max_bytes)} max).")
    if not buffer and not allow_empty:
        raise UploadRejected("Fichier vide.")
    return bytes(buffer)


def _is_docx(content: bytes) -> bool:
    if not content.startswith(b"PK\x03\x04"):
        return False
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            names = archive.namelist()
    except (zipfile.BadZipFile, ValueError, OSError):
        return False
    return "word/document.xml" in names


def sniff_extension(content: bytes) -> Optional[str]:
    """Extension canonique déduite du contenu (jamais du nom client)."""
    if not content:
        return None
    head = content[:16]
    if head.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    if head[:4] == b"RIFF" and content[8:12] == b"WAVE":
        return "wav"
    if head.startswith(b"\x1a\x45\xdf\xa3"):
        return "webm"
    if head.startswith(b"OggS"):
        return "ogg"
    if head.startswith(b"ID3") or (len(head) > 1 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0):
        return "mp3"
    if content[4:8] == b"ftyp":
        return "m4a"
    if head.startswith(b"%PDF"):
        return "pdf"
    if _is_docx(content):
        return "docx"
    return None


def require_kind(content: bytes, allowed: set[str], message: str) -> str:
    ext = sniff_extension(content)
    if ext not in allowed:
        raise UploadRejected(message)
    return ext  # type: ignore[return-value]


def mime_for_extension(ext: str) -> str:
    return MIME_BY_EXTENSION.get(ext, "application/octet-stream")


def ensure_json_size(value: Any, max_bytes: int, label: str = "Contenu") -> Any:
    """Validateur pydantic : borne la taille JSON sérialisée d'un dict/list."""
    if value is None:
        return value
    try:
        size = len(json.dumps(value, ensure_ascii=False, default=str).encode("utf-8"))
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} invalide.") from exc
    if size > max_bytes:
        raise ValueError(f"{label} trop volumineux ({max_bytes // 1024} Ko max).")
    return value
