"""Lecture du texte d'une image par l'IA : lignes positionnées (édition) ou texte structuré (extraction)."""

from __future__ import annotations

import base64
import re
from typing import Any, Literal, Optional

from app.core.ai import AiError, ai_enabled, ai_json, ai_text

ImageMime = Literal["image/png", "image/jpeg", "image/webp"]

FONT_FAMILIES = {"sans", "serif", "mono", "script", "display"}
ALIGNS = {"left", "center", "right"}
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")

LAYOUT_PROMPT = """Tu es un moteur OCR de précision. Repère TOUT le texte visible de l'image, ligne par ligne.

Réponds uniquement avec ce JSON :
{"lines": [{
  "text": "texte exact de la ligne, accents et ponctuation compris",
  "box_2d": [ymin, xmin, ymax, xmax],
  "color": "#RRGGBB",
  "background": "#RRGGBB",
  "bold": false,
  "italic": false,
  "uppercase": false,
  "font": "sans",
  "align": "left",
  "angle": 0
}]}

Règles :
- Une entrée par LIGNE visuelle (jamais un paragraphe entier sur plusieurs lignes).
- box_2d en coordonnées normalisées 0-1000, serré au plus près des lettres (hauteur = du haut des majuscules au bas des jambages).
- color = couleur des lettres ; background = couleur dominante juste derrière la ligne.
- font parmi : sans, serif, mono, script, display.
- align parmi : left, center, right (alignement de la ligne dans son bloc).
- angle = inclinaison en degrés (0 si horizontal).
- Ordre de lecture naturel. Aucun texte inventé. Si l'image n'a pas de texte : {"lines": []}."""

EXTRACT_PROMPT = """Transcris TOUT le texte de cette image en Markdown, en conservant fidèlement la mise en forme :
- titres (#, ##, ###) selon la hiérarchie visuelle ;
- **gras**, *italique* ;
- listes à puces (-) et numérotées (1.) ;
- tableaux en Markdown (| col | col |) avec la ligne d'en-tête ;
- un paragraphe par bloc, une ligne vide entre les blocs ; conserve les retours à la ligne voulus (adresses, poèmes) avec deux espaces en fin de ligne ;
- ordre de lecture naturel (colonnes de gauche à droite).
Texte exact, accents et ponctuation compris, sans rien corriger, traduire ni ajouter.
Réponds uniquement avec le Markdown, sans bloc de code ni commentaire. Si l'image n'a pas de texte, réponds exactement : [aucun texte]"""


def detect_image_mime(content: bytes) -> Optional[ImageMime]:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return None


def _contents(content: bytes, mime: str, prompt: str) -> list[dict[str, Any]]:
    return [
        {
            "role": "user",
            "parts": [
                {"inline_data": {"mime_type": mime, "data": base64.b64encode(content).decode("ascii")}},
                {"text": prompt},
            ],
        }
    ]


def _clamp(value: Any, low: float = 0, high: float = 1000) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return max(low, min(high, number))


def _color(value: Any, fallback: str) -> str:
    text = str(value or "").strip()
    if re.fullmatch(r"#[0-9a-fA-F]{3}", text):
        text = "#" + "".join(ch * 2 for ch in text[1:])
    return text.upper() if HEX.match(text) else fallback


def _clean_line(raw: Any) -> Optional[dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    text = str(raw.get("text") or "").strip()
    box = raw.get("box_2d") or raw.get("box")
    if not text or not isinstance(box, (list, tuple)) or len(box) != 4:
        return None
    ymin, xmin, ymax, xmax = (_clamp(v) for v in box)
    if None in (ymin, xmin, ymax, xmax):
        return None
    if ymax < ymin:
        ymin, ymax = ymax, ymin
    if xmax < xmin:
        xmin, xmax = xmax, xmin
    if ymax - ymin < 2 or xmax - xmin < 2:
        return None
    font = str(raw.get("font") or "sans").lower()
    align = str(raw.get("align") or "left").lower()
    angle = _clamp(raw.get("angle"), -90, 90) or 0
    return {
        "text": text[:500],
        # Fractions 0-1 de l'image : x, y, largeur, hauteur.
        "x": xmin / 1000,
        "y": ymin / 1000,
        "w": (xmax - xmin) / 1000,
        "h": (ymax - ymin) / 1000,
        "color": _color(raw.get("color"), "#111111"),
        "background": _color(raw.get("background"), "#FFFFFF"),
        "bold": bool(raw.get("bold")),
        "italic": bool(raw.get("italic")),
        "uppercase": bool(raw.get("uppercase")),
        "font": font if font in FONT_FAMILIES else "sans",
        "align": align if align in ALIGNS else "left",
        "angle": round(angle, 1),
    }


async def read_image_layout(content: bytes, mime: str) -> list[dict[str, Any]]:
    if not ai_enabled():
        raise AiError("La lecture d'image par l'IA n'est pas disponible pour le moment.")
    data = await ai_json(contents=_contents(content, mime, LAYOUT_PROMPT), purpose="image_layout", required=True)
    raw_lines = (data or {}).get("lines")
    if not isinstance(raw_lines, list):
        return []
    return [line for line in (_clean_line(item) for item in raw_lines[:400]) if line]


def _strip_fences(text: str) -> str:
    cleaned = text.strip()
    match = re.match(r"^```(?:markdown|md)?\s*\n(.*?)\n```$", cleaned, flags=re.S)
    return match.group(1).strip() if match else cleaned


async def extract_image_markdown(content: bytes, mime: str) -> str:
    if not ai_enabled():
        raise AiError("La lecture d'image par l'IA n'est pas disponible pour le moment.")
    text = await ai_text(contents=_contents(content, mime, EXTRACT_PROMPT), purpose="image_extract", required=True)
    cleaned = _strip_fences(text or "")
    if cleaned.strip().lower() == "[aucun texte]":
        return ""
    return cleaned
