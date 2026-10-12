"""Accès au site compilé (frontend/dist) : dossier, table des routes, manifeste Vite, page modèle."""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def dist_dir() -> Path:
    configured = (settings.web_dist_dir or "").strip()
    if configured:
        path = Path(configured)
        return path if path.is_absolute() else (BACKEND_ROOT / path).resolve()
    return (BACKEND_ROOT.parent / "frontend" / "dist").resolve()


def safe_dist_file(relative: str) -> Optional[Path]:
    """Fichier public du site, ou None (chemin hors du dossier, fichier caché, dossier…)."""
    relative = relative.lstrip("/")
    if not relative:
        return None
    parts = relative.split("/")
    if any(part in {"", ".", ".."} or part.startswith(".") for part in parts):
        return None
    root = dist_dir()
    candidate = (root / relative).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


@dataclass
class _Cached:
    mtime: float = -1.0
    value: Any = None


@dataclass
class BuildFiles:
    """Fichiers générés par `vite build`, relus automatiquement après un nouveau build."""

    _lock: threading.Lock = field(default_factory=threading.Lock)
    _index: _Cached = field(default_factory=_Cached)
    _routes: _Cached = field(default_factory=_Cached)
    _manifest: _Cached = field(default_factory=_Cached)
    _prerender_index: _Cached = field(default_factory=_Cached)
    _prerender_pages: dict = field(default_factory=dict)

    def _load(self, cache: _Cached, path: Path, parse) -> Any:
        try:
            mtime = path.stat().st_mtime
        except OSError:
            return None
        if cache.mtime != mtime:
            with self._lock:
                if cache.mtime != mtime:
                    cache.value = parse(path.read_text(encoding="utf-8"))
                    cache.mtime = mtime
        return cache.value

    def index_html(self) -> Optional[str]:
        return self._load(self._index, dist_dir() / "index.html", lambda text: text)

    def route_table(self) -> Optional[dict]:
        return self._load(self._routes, dist_dir() / ".vite" / "routes.json", json.loads)

    def manifest(self) -> Optional[dict]:
        return self._load(self._manifest, dist_dir() / ".vite" / "manifest.json", json.loads)

    def prerender_index(self) -> Optional[dict]:
        return self._load(self._prerender_index, dist_dir() / ".vite" / "prerender" / "index.json", json.loads)

    def prerendered(self, key: str) -> Optional[str]:
        """HTML pré-rendu d'une route (clé = chemin de routes.json, ou « * » pour la page 404)."""
        index = self.prerender_index()
        name = (index or {}).get("pages", {}).get(key)
        if not name or "/" in name or "\\" in name:
            return None
        cache = self._prerender_pages.setdefault(name, _Cached())
        return self._load(cache, dist_dir() / ".vite" / "prerender" / name, lambda text: text)


build_files = BuildFiles()


def log_build_status() -> None:
    root = dist_dir()
    if (root / "index.html").is_file():
        logger.info("Site compilé servi depuis %s", root)
        from app.web.public_config import render_fingerprint

        index = build_files.prerender_index()
        if not index:
            logger.info("Pas de pages pré-rendues : affichage par le navigateur uniquement.")
        elif index.get("config") != render_fingerprint():
            logger.warning(
                "Pages pré-rendues ignorées : la configuration (nom, e-mails de contact…) a changé depuis la "
                "compilation. Recompilez le site (start.bat build) pour retrouver l'affichage instantané."
            )
    else:
        logger.warning(
            "Site non compilé (%s introuvable) : lancez « npm run build » dans frontend/ "
            "(l'API reste disponible sur /api).",
            root / "index.html",
        )
