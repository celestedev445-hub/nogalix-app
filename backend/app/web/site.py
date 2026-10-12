"""Pages et fichiers du site.

- fichiers statiques de frontend/dist (versions .br/.gz précompressées, cache long pour /assets) ;
- pages : garde de session, balises SEO de la route, préchargements
  (module de la page, images prioritaires), configuration publique, statut 404 ;
- /manifest.webmanifest et /app-config.js.
"""

from __future__ import annotations

import hashlib
import html
import json
import re
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response

from app.core.config import settings
from app.web.assets import build_files, safe_dist_file
from app.web.images import image_srcset, static_webp_variant
from app.web.public_config import public_config, public_config_script, render_fingerprint
from app.web.session import AUTH_COOKIE, clear_cookie_header, is_plausible_token, read_cookie_token

router = APIRouter(include_in_schema=False)

CONTENT_TYPES = {
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".map": "application/json",
    ".webmanifest": "application/manifest+json",
    ".html": "text/html; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".pdf": "application/pdf",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".wasm": "application/wasm",
}

# Revalidation à chaque visite (ETag) ; pas de no-store pour garder le cache « page précédente » du navigateur.
HTML_CACHE_CONTROL = "no-cache"
SITE_NOT_BUILT = (
    "Le site n'est pas encore compilé. Lancez « npm run build » dans le dossier frontend "
    "(ou start.bat), puis rechargez la page."
)


# ---------------------------------------------------------------------------
# Fichiers statiques
# ---------------------------------------------------------------------------

def _content_type(path: Path) -> str:
    return CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream")


def _cache_control(relative: str) -> str:
    if relative.startswith("assets/"):
        return "public, max-age=31536000, immutable"
    if relative == "sw.js":
        return "no-cache, no-store, must-revalidate"
    return "public, max-age=0"


def _etag(path: Path, suffix: str = "") -> str:
    stat = path.stat()
    digest = hashlib.md5(f"{stat.st_mtime_ns}-{stat.st_size}".encode(), usedforsecurity=False).hexdigest()
    return f'W/"{digest}{suffix}"'


def static_response(request: Request, file: Path, relative: str) -> Response:
    headers = {"Cache-Control": _cache_control(relative)}
    if relative == "sw.js":
        headers["Service-Worker-Allowed"] = "/"
    media_type = _content_type(file)

    served = file
    if "image/webp" in request.headers.get("accept", ""):
        webp = static_webp_variant(file, relative)
        if webp is not None:
            served = webp
            media_type = "image/webp"
            headers["Vary"] = "Accept"
            headers["ETag"] = _etag(webp, "webp")
            if request.headers.get("if-none-match") == headers["ETag"]:
                return Response(status_code=304, headers=headers)
            return FileResponse(webp, media_type=media_type, headers=headers, stat_result=webp.stat())
    elif _content_type(file).startswith("image/") and file.suffix.lower() in {".png", ".jpg", ".jpeg"}:
        headers["Vary"] = "Accept"

    accepted = request.headers.get("accept-encoding", "")
    for encoding, extension in (("br", ".br"), ("gzip", ".gz")):
        variant = file.with_name(file.name + extension)
        if encoding in accepted and variant.is_file():
            served = variant
            headers["Content-Encoding"] = encoding
            headers["Vary"] = "Accept-Encoding"
            break
    if served is file and file.with_name(file.name + ".gz").is_file():
        headers["Vary"] = "Accept-Encoding"

    etag = _etag(served, headers.get("Content-Encoding", ""))
    headers["ETag"] = etag
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return FileResponse(served, media_type=media_type, headers=headers, stat_result=served.stat())


# ---------------------------------------------------------------------------
# Routes du site (table partagée avec le front : frontend/src/app/routes.json)
# ---------------------------------------------------------------------------

def _segments(path: str) -> list[str]:
    return [part for part in path.split("/") if part]


def find_route(table: dict, pathname: str) -> Optional[dict]:
    actual = _segments(pathname)
    candidates = []
    for route in table.get("routes", []):
        expected = _segments(route["path"])
        if len(expected) == len(actual) and all(
            part.startswith(":") or part == actual[index] for index, part in enumerate(expected)
        ):
            candidates.append(route)
    candidates.sort(key=lambda route: sum(part.startswith(":") for part in _segments(route["path"])))
    return candidates[0] if candidates else None


def _is_protected(table: dict, pathname: str) -> bool:
    return any(pathname == prefix or pathname.startswith(f"{prefix}/") for prefix in table.get("protectedPrefixes", []))


def _is_safe_internal_path(value: str) -> bool:
    path = (value or "").strip()
    return (
        path.startswith("/")
        and not path.startswith("//")
        and "://" not in path
        and not re.search(r"[\0\r\n\\]", path)
    )


# ---------------------------------------------------------------------------
# Rendu de la page
# ---------------------------------------------------------------------------

def _attr(value: str) -> str:
    return html.escape(value, quote=True)


def _interpolate(value: str) -> str:
    return value.replace("{app}", settings.app_name)


def route_meta(table: dict, route: Optional[dict]) -> dict[str, Any]:
    defaults = table.get("defaults", {})
    raw_title = route.get("title") if route and route.get("title") else _interpolate(defaults.get("title", "{app}"))
    title = f"{_interpolate(raw_title)} · {settings.app_name}"
    description = _interpolate((route or {}).get("description") or defaults.get("description", ""))
    base = settings.public_app_url
    url = f"{base}{(route or {}).get('ogPath', '')}" if base else ""
    return {"title": title, "description": description, "url": url, "not_found": route is None}


def _seo_block(meta: dict[str, Any]) -> str:
    name = _attr(settings.app_name)
    lines = [
        f"<title>{html.escape(meta['title'])}</title>",
        f'<meta name="description" content="{_attr(meta["description"])}" />',
        f'<meta name="application-name" content="{name}" />',
        f'<meta name="author" content="{name}" />',
    ]
    if meta["not_found"]:
        lines.append('<meta name="robots" content="noindex" />')
    return "\n    ".join(lines)


def _og_block(meta: dict[str, Any]) -> str:
    title = _attr(meta["title"])
    description = _attr(meta["description"])
    lines = [
        f'<meta property="og:title" content="{title}" />',
        f'<meta property="og:description" content="{description}" />',
    ]
    if meta["url"]:
        lines.append(f'<meta property="og:url" content="{_attr(meta["url"])}" />')
    lines += [
        f'<meta property="og:site_name" content="{_attr(settings.app_name)}" />',
        '<meta property="og:locale" content="fr_FR" />',
        '<meta property="og:type" content="website" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{title}" />',
        f'<meta name="twitter:description" content="{description}" />',
    ]
    return "\n    ".join(lines)


def _module_preloads(manifest: Optional[dict], module_keys: list[str], loaded: set[str]) -> list[str]:
    """modulepreload + feuilles de style du module de la page (et de ses imports dynamiques directs)."""
    if not manifest:
        return []
    files: list[str] = []
    styles: list[str] = []

    def visit(key: str, seen: set[str]) -> None:
        if key in seen or key not in manifest:
            return
        seen.add(key)
        chunk = manifest[key]
        if chunk.get("file") and chunk["file"] not in loaded:
            files.append(chunk["file"])
        for css in chunk.get("css", []):
            if css not in loaded and css not in styles:
                styles.append(css)
        for imported in chunk.get("imports", []):
            visit(imported, seen)

    seen: set[str] = set()
    for key in module_keys:
        visit(key, seen)
        for dynamic in manifest.get(key, {}).get("dynamicImports", []):
            visit(dynamic, seen)

    links = [f'<link rel="stylesheet" crossorigin href="/{_attr(css)}" />' for css in styles]
    links += [f'<link rel="modulepreload" crossorigin href="/{_attr(file)}" />' for file in files]
    return links


def _entry_files(manifest: Optional[dict]) -> set[str]:
    """Fichiers déjà chargés par la page (point d'entrée et ses imports statiques)."""
    loaded: set[str] = set()
    if not manifest:
        return loaded

    def visit(key: str) -> None:
        chunk = manifest.get(key)
        if not chunk or chunk.get("file") in loaded:
            return
        loaded.add(chunk["file"])
        loaded.update(chunk.get("css", []))
        for imported in chunk.get("imports", []):
            visit(imported)

    for key, chunk in manifest.items():
        if chunk.get("isEntry"):
            visit(key)
    return loaded


def _image_preloads(route: Optional[dict]) -> list[str]:
    links = []
    for image in (route or {}).get("preloadImages", []):
        src, srcset = image_srcset(image["src"], image.get("width"), image.get("sizes"))
        sizes = image.get("sizes")
        attributes = f'rel="preload" as="image" imagesrcset="{_attr(srcset)}"'
        if sizes:
            attributes += f' imagesizes="{_attr(sizes)}"'
        links.append(f'<link {attributes} fetchpriority="high" />')
    return links


def _replace_block(document: str, start: str, end: str, content: str) -> str:
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    return pattern.sub(lambda _: content, document, count=1)


ROOT_ELEMENT = '<div id="root" style="display: contents"></div>'


def _prerendered_html(route: Optional[dict], query: str) -> Optional[str]:
    """HTML pré-rendu de la page, s'il correspond exactement à ce que le navigateur afficherait.

    Pas de pré-rendu avec des paramètres d'URL (?…) : l'affichage initial peut en dépendre.
    """
    if query:
        return None
    index = build_files.prerender_index()
    if not index or index.get("config") != render_fingerprint():
        return None
    return build_files.prerendered(route["path"] if route else "*")


def render_page(table: dict, route: Optional[dict], query: str = "") -> str:
    template = build_files.index_html() or ""
    manifest = build_files.manifest()
    meta = route_meta(table, route)

    preloads = _image_preloads(route)
    module_keys = []
    if route:
        module_keys.append(route["module"])
        if route["module"].startswith("src/pages/admin/"):
            module_keys.insert(0, "src/app/layouts/AdminLayout.tsx")
    else:
        module_keys.append("src/pages/not-found.tsx")
    preloads += _module_preloads(manifest, module_keys, _entry_files(manifest))

    document = template.replace("<!--app:preload-->", "\n    ".join(preloads), 1)
    document = _replace_block(document, "<!--app:seo:start-->", "<!--app:seo:end-->", _seo_block(meta))
    document = _replace_block(document, "<!--app:og:start-->", "<!--app:og:end-->", _og_block(meta))
    document = _replace_block(document, "<!--app:config-->", "<!--app:config:end-->", public_config_script())
    prerendered = _prerendered_html(route, query)
    if prerendered:
        document = document.replace(
            ROOT_ELEMENT, f'<div id="root" style="display: contents" data-prerendered="">{prerendered}</div>', 1
        )
    return document


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/app-config.js")
def app_config_js():
    """Configuration publique (utilisée par le serveur de développement Vite)."""
    body = f"window.__NOGALIX_CONFIG__ = {json.dumps(public_config(), ensure_ascii=False)};\n"
    return Response(body, media_type="text/javascript; charset=utf-8", headers={"Cache-Control": "no-store"})


@router.get("/manifest.webmanifest")
def web_manifest():
    return JSONResponse(
        {
            "name": settings.app_name,
            "short_name": settings.app_short_name or settings.app_name,
            "description": "Créez un CV professionnel avec un assistant IA, des modèles et un export PDF.",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#3A83F7",
            "lang": "fr",
            "icons": [
                {"src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png"},
                {"src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png"},
                {"src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png"},
            ],
        },
        media_type="application/manifest+json",
        headers={"Cache-Control": "public, max-age=0, must-revalidate"},
    )


@router.api_route("/api/{rest:path}", methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def api_not_found(rest: str):
    raise HTTPException(status_code=404)


@router.api_route("/{full_path:path}", methods=["GET", "HEAD"])
def site(full_path: str, request: Request):
    pathname = "/" + full_path
    if pathname == "/api" or pathname.startswith("/api/"):
        raise HTTPException(status_code=404)

    query = request.url.query
    # Pas de barre oblique finale (308 permanente).
    if pathname != "/" and pathname.endswith("/"):
        target = pathname.rstrip("/") or "/"
        return RedirectResponse(f"{target}?{query}" if query else target, status_code=308)

    if pathname != "/index.html":
        file = safe_dist_file(full_path)
        if file is not None:
            return static_response(request, file, full_path)
    if pathname.startswith("/assets/"):
        return PlainTextResponse("Introuvable.", status_code=404, headers={"Cache-Control": "no-store"})

    table = build_files.route_table()
    if table is None or build_files.index_html() is None:
        return PlainTextResponse(SITE_NOT_BUILT, status_code=503)

    redirect = table.get("redirects", {}).get(pathname)
    if redirect:
        return RedirectResponse(f"{redirect}?{query}" if query else redirect, status_code=307)

    # Garde de session : le serveur ne juge que la présence du cookie,
    # l'API reste seule juge de sa validité.
    raw_token = read_cookie_token(request.headers)
    invalid_cookie = bool(raw_token) and not is_plausible_token(raw_token)
    has_session = bool(raw_token) and not invalid_cookie

    response: Response
    if _is_protected(table, pathname) and not has_session:
        suivant = f"{pathname}?{query}" if query else pathname
        location = "/auth/login"
        if _is_safe_internal_path(suivant):
            location += "?" + urlencode({"suivant": suivant})
        response = RedirectResponse(location, status_code=307)
    elif pathname in table.get("guestOnly", []) and has_session:
        response = RedirectResponse("/dashboard", status_code=307)
    else:
        route = find_route(table, pathname)
        document = render_page(table, route, query)
        etag = f'W/"{hashlib.md5(document.encode("utf-8"), usedforsecurity=False).hexdigest()}"'
        headers = {"Cache-Control": HTML_CACHE_CONTROL, "ETag": etag}
        if route and request.headers.get("if-none-match") == etag:
            response = Response(status_code=304, headers=headers)
        else:
            response = HTMLResponse(document, status_code=200 if route else 404, headers=headers)

    if invalid_cookie:
        response.headers.append("set-cookie", clear_cookie_header())
    return response


__all__ = ["router", "AUTH_COOKIE"]
