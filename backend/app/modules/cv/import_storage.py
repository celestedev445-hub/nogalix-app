from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from app.modules.cv.pdf_to_docx import convert_pdf_to_docx
from app.support.uploads import DOCUMENT_EXTENSIONS, mime_for_extension, require_kind

ImportVariant = Literal["original", "editable"]

STORAGE_ROOT = Path(__file__).resolve().parents[3] / "storage" / "imports"
META_FILE = "meta.json"
EDITABLE_NAME = "editable.docx"


@dataclass
class ImportMeta:
    original_name: str
    original_mime: str
    version: int = 1

    def to_dict(self) -> dict:
        return {
            "originalName": self.original_name,
            "originalMime": self.original_mime,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, data: dict) -> ImportMeta:
        return cls(
            original_name=str(data.get("originalName") or "CV"),
            original_mime=str(data.get("originalMime") or "application/octet-stream"),
            version=int(data.get("version") or 1),
        )


def _safe_segment(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip())
    return cleaned[:120] or "cv"


def import_dir(user_id: int, cv_id: str) -> Path:
    path = STORAGE_ROOT / str(user_id) / _safe_segment(cv_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def meta_path(user_id: int, cv_id: str) -> Path:
    return import_dir(user_id, cv_id) / META_FILE


def read_meta(user_id: int, cv_id: str) -> ImportMeta | None:
    path = meta_path(user_id, cv_id)
    if not path.is_file():
        return None
    try:
        return ImportMeta.from_dict(json.loads(path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, TypeError, ValueError):
        return None


def write_meta(user_id: int, cv_id: str, meta: ImportMeta) -> None:
    meta_path(user_id, cv_id).write_text(
        json.dumps(meta.to_dict(), ensure_ascii=False),
        encoding="utf-8",
    )


def original_path(user_id: int, cv_id: str) -> Path | None:
    directory = import_dir(user_id, cv_id)
    for candidate in directory.iterdir():
        if candidate.is_file() and candidate.name.startswith("original."):
            return candidate
    return None


def editable_path(user_id: int, cv_id: str) -> Path:
    return import_dir(user_id, cv_id) / EDITABLE_NAME


def has_import_files(user_id: int, cv_id: str) -> bool:
    return original_path(user_id, cv_id) is not None


def save_original_file(
    user_id: int,
    cv_id: str,
    content: bytes,
    file_name: str,
    mime_type: str,
) -> ImportMeta:
    if not content:
        raise ValueError("Fichier vide.")

    # Type déduit des magic bytes, pas du nom ni du content-type client.
    detected = require_kind(content, DOCUMENT_EXTENSIONS, "Seuls les fichiers PDF et Word (.docx) sont acceptés.")

    directory = import_dir(user_id, cv_id)
    for candidate in directory.glob("original.*"):
        if candidate.is_file():
            candidate.unlink()

    target = directory / f"original.{detected}"
    target.write_bytes(content)

    previous = read_meta(user_id, cv_id)
    version = (previous.version if previous else 0) + 1
    safe_name = (file_name or "cv").replace("\\", "/").rsplit("/", 1)[-1][:200] or "cv"
    meta = ImportMeta(original_name=safe_name, original_mime=mime_for_extension(detected), version=version)
    write_meta(user_id, cv_id, meta)
    return meta


def ensure_editable_document(user_id: int, cv_id: str) -> Path:
    editable = editable_path(user_id, cv_id)
    if editable.is_file():
        return editable

    original = original_path(user_id, cv_id)
    if not original or not original.is_file():
        raise ValueError("Fichier original introuvable.")

    content = original.read_bytes()
    suffix = original.suffix.lower()

    if suffix == ".docx":
        shutil.copyfile(original, editable)
        return editable

    if suffix == ".pdf":
        docx_bytes = convert_pdf_to_docx(content)
        editable.write_bytes(docx_bytes)
        return editable

    raise ValueError("Seuls les fichiers PDF et Word (.docx) sont éditables comme un document Word.")


def resolve_document_path(user_id: int, cv_id: str, variant: ImportVariant) -> Path:
    if variant == "editable":
        return ensure_editable_document(user_id, cv_id)

    original = original_path(user_id, cv_id)
    if not original or not original.is_file():
        raise ValueError("Fichier original introuvable.")
    return original


def delete_import_dir(user_id: int, cv_id: str) -> None:
    path = STORAGE_ROOT / str(user_id) / _safe_segment(cv_id)
    if path.is_dir():
        shutil.rmtree(path, ignore_errors=True)


def copy_import_dir(user_id: int, source_cv_id: str, target_cv_id: str) -> None:
    """Copie les fichiers importés (original, version éditable) d'un CV vers son double."""
    source = STORAGE_ROOT / str(user_id) / _safe_segment(source_cv_id)
    if not source.is_dir():
        return
    target = STORAGE_ROOT / str(user_id) / _safe_segment(target_cv_id)
    shutil.copytree(source, target, dirs_exist_ok=True)


def bump_version(user_id: int, cv_id: str) -> ImportMeta:
    meta = read_meta(user_id, cv_id)
    if not meta:
        raise ValueError("Métadonnées import introuvables.")
    meta.version += 1
    write_meta(user_id, cv_id, meta)
    return meta
