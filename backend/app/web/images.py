"""Optimisation d'images à la volée (`/_image`), comme le composant <Image> du site.

Mêmes paramètres (`url`, `w`, `q`), mêmes largeurs autorisées, sortie WebP quand le
navigateur l'accepte, jamais d'agrandissement, cache disque dans storage/cache/images.
"""

from __future__ import annotations

import hashlib
import io
import logging
import os
import threading
from pathlib import Path

from fastapi import APIRouter, Query, Request
from fastapi.responses import PlainTextResponse, Response

from app.web.assets import BACKEND_ROOT, safe_dist_file

logger = logging.getLogger(__name__)

router = APIRouter(tags=["web"], include_in_schema=False)

DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384]
ALL_SIZES = sorted(IMAGE_SIZES + DEVICE_SIZES)
DEFAULT_QUALITY = 75
ALLOWED_QUALITIES = {DEFAULT_QUALITY}
CACHE_DIR = BACKEND_ROOT / "storage" / "cache" / "images"
CACHE_CONTROL = "public, max-age=60, must-revalidate"
# Caractères laissés tels quels par encodeURIComponent (en plus de lettres, chiffres et _.-~).
URI_COMPONENT_SAFE = "!'()*"
OPTIMIZABLE = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}

_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


# ---------------------------------------------------------------------------
# srcset (même algorithme que src/platform/imageSizes.ts) — utilisé pour les préchargements
# ---------------------------------------------------------------------------

def _get_widths(width: int | None, sizes: str | None) -> tuple[list[int], str]:
    import re

    if sizes:
        percents = [int(match.group(2)) for match in re.finditer(r"(^|\s)(1?\d?\d)vw", sizes)]
        if percents:
            smallest = min(percents) * 0.01
            return [size for size in ALL_SIZES if size >= DEVICE_SIZES[0] * smallest], "w"
        return list(ALL_SIZES), "w"
    if width is None:
        return list(DEVICE_SIZES), "w"
    widths: list[int] = []
    for target in (width, width * 2):
        chosen = next((size for size in ALL_SIZES if size >= target), ALL_SIZES[-1])
        if chosen not in widths:
            widths.append(chosen)
    return widths, "x"


def optimized_url(src: str, width: int, quality: int = DEFAULT_QUALITY) -> str:
    from urllib.parse import quote

    return f"/_image?url={quote(src, safe=URI_COMPONENT_SAFE)}&w={width}&q={quality}"


def image_srcset(src: str, width: int | None = None, sizes: str | None = None) -> tuple[str, str]:
    """(src, srcset) identiques à ceux générés par le composant <Image> du site."""
    widths, kind = _get_widths(width, sizes)
    srcset = ", ".join(
        f"{optimized_url(src, w)} {w if kind == 'w' else index + 1}{kind}" for index, w in enumerate(widths)
    )
    return optimized_url(src, widths[-1]), srcset


# ---------------------------------------------------------------------------
# Optimiseur
# ---------------------------------------------------------------------------

def _lock_for(key: str) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(key, threading.Lock())


def _render(source: Path, width: int, quality: int, fmt: str) -> bytes:
    from PIL import Image, ImageOps

    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        if image.width > width:
            height = max(1, round(image.height * width / image.width))
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        if fmt == "image/webp":
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA" if "A" in image.getbands() or image.mode == "P" else "RGB")
            image.save(output, "WEBP", quality=quality, method=4)
        elif fmt == "image/png":
            image.save(output, "PNG", optimize=True)
        else:
            if image.mode not in {"RGB", "L"}:
                image = image.convert("RGB")
            image.save(output, "JPEG", quality=quality, optimize=True, progressive=True)
        return output.getvalue()


@router.get("/_image")
def optimize_image(
    request: Request,
    url: str = Query(default=""),
    w: str = Query(default=""),
    q: str = Query(default=""),
):
    if not url:
        return PlainTextResponse('"url" parameter is required', status_code=400)
    src = url  # déjà décodé par Starlette
    if not src.startswith("/") or src.startswith("//"):
        return PlainTextResponse('"url" parameter is invalid', status_code=400)
    try:
        width = int(w)
    except ValueError:
        return PlainTextResponse('"w" parameter (width) is required', status_code=400)
    if width not in ALL_SIZES:
        return PlainTextResponse(f'"w" parameter (width) of {width} is not allowed', status_code=400)
    try:
        quality = int(q) if q else DEFAULT_QUALITY
    except ValueError:
        return PlainTextResponse('"q" parameter (quality) must be an integer between 1 and 100', status_code=400)
    if not 1 <= quality <= 100:
        return PlainTextResponse('"q" parameter (quality) must be an integer between 1 and 100', status_code=400)
    if quality not in ALLOWED_QUALITIES:
        # Liste fermée : évite de remplir le cache disque avec des variantes arbitraires.
        return PlainTextResponse(f'"q" parameter (quality) of {quality} is not allowed', status_code=400)

    path_only = src.split("?", 1)[0].split("#", 1)[0]
    source = safe_dist_file(path_only)
    if source is None:
        return PlainTextResponse("The requested resource isn't a valid image.", status_code=404)

    original_type = OPTIMIZABLE.get(source.suffix.lower())
    if original_type is None:
        # SVG, GIF animés… : servis tels quels.
        return Response(source.read_bytes(), media_type=_guess_type(source), headers={"Cache-Control": CACHE_CONTROL})

    accept = request.headers.get("accept", "")
    fmt = "image/webp" if "image/webp" in accept else original_type
    stat = source.stat()
    key = hashlib.sha256(
        f"{source.as_posix()}|{stat.st_mtime_ns}|{stat.st_size}|{width}|{quality}|{fmt}".encode()
    ).hexdigest()
    etag = f'"{key[:32]}"'
    headers = {"Cache-Control": CACHE_CONTROL, "ETag": etag, "Vary": "Accept"}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)

    extension = {"image/webp": "webp", "image/png": "png", "image/jpeg": "jpg"}[fmt]
    cached = CACHE_DIR / key[:2] / f"{key}.{extension}"
    if not cached.is_file():
        with _lock_for(key):
            if not cached.is_file():
                try:
                    data = _render(source, width, quality, fmt)
                except Exception:
                    logger.exception("Optimisation impossible pour %s", src)
                    return Response(source.read_bytes(), media_type=original_type, headers=headers)
                cached.parent.mkdir(parents=True, exist_ok=True)
                temporary = cached.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
                temporary.write_bytes(data)
                os.replace(temporary, cached)
    name = Path(path_only).stem or "image"
    headers["Content-Disposition"] = f'inline; filename="{_ascii(name)}.{extension}"'
    return Response(cached.read_bytes(), media_type=fmt, headers=headers)


def _ascii(value: str) -> str:
    return "".join(ch if ch.isascii() and ch not in '"\\' else "_" for ch in value)


def _guess_type(path: Path) -> str:
    import mimetypes

    return mimetypes.guess_type(path.name)[0] or "application/octet-stream"


# ---------------------------------------------------------------------------
# Images publiques servies en WebP (même URL, mêmes dimensions)
# ---------------------------------------------------------------------------

STATIC_WEBP_QUALITY = 90
STATIC_WEBP_MIN_BYTES = 20 * 1024
STATIC_WEBP_DIR = BACKEND_ROOT / "storage" / "cache" / "static-webp"
_STATIC_SKIP = ("favicon", "apple-touch-icon", "android-chrome")


def static_webp_variant(source: Path, relative: str) -> Path | None:
    """Version WebP (qualité 90, dimensions inchangées) d'une image PNG/JPEG publique.

    Les photos des modèles et illustrations sont des PNG de 0,2 à 1,8 Mo : en WebP elles
    pèsent 5 à 10 fois moins, sans différence visible. None si non applicable ou en échec.
    """
    if source.suffix.lower() not in {".png", ".jpg", ".jpeg"} or relative.startswith("assets/"):
        return None
    if any(part in relative for part in _STATIC_SKIP):
        return None
    try:
        stat = source.stat()
    except OSError:
        return None
    if stat.st_size < STATIC_WEBP_MIN_BYTES:
        return None
    key = hashlib.sha256(f"{relative}|{stat.st_mtime_ns}|{stat.st_size}|{STATIC_WEBP_QUALITY}".encode()).hexdigest()
    target = STATIC_WEBP_DIR / key[:2] / f"{key}.webp"
    if target.is_file():
        return target
    with _lock_for(key):
        if target.is_file():
            return target
        try:
            from PIL import Image

            with Image.open(source) as image:
                if image.mode not in {"RGB", "RGBA"}:
                    image = image.convert("RGBA" if "A" in image.getbands() or image.mode == "P" else "RGB")
                output = io.BytesIO()
                image.save(output, "WEBP", quality=STATIC_WEBP_QUALITY, method=4)
            data = output.getvalue()
        except Exception:
            logger.exception("Conversion WebP impossible pour %s", relative)
            return None
        if len(data) >= stat.st_size:
            return None
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
        temporary.write_bytes(data)
        os.replace(temporary, target)
        return target


def warm_static_webp() -> None:
    """Prépare en arrière-plan les versions WebP pour que le premier visiteur n'attende pas."""
    from app.web.assets import dist_dir

    root = dist_dir()
    if not root.is_dir():
        return
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
            static_webp_variant(path, path.relative_to(root).as_posix())
