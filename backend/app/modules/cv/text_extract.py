import io
import re
import zipfile
from xml.etree.ElementTree import ParseError

from defusedxml import DefusedXmlException
from defusedxml import ElementTree

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Garde-fous zip bomb : taille décompressée max d'une entrée et ratio de compression.
MAX_ZIP_ENTRY_BYTES = 20 * 1024 * 1024
MAX_ZIP_RATIO = 200
MAX_PDF_PAGES = 30


def read_zip_entry(archive: zipfile.ZipFile, name: str, max_bytes: int = MAX_ZIP_ENTRY_BYTES) -> bytes:
    """Lit une entrée zip en bornant la taille décompressée réelle (pas seulement l'en-tête)."""
    info = archive.getinfo(name)
    if info.file_size > max_bytes:
        raise ValueError("Document trop volumineux une fois décompressé.")
    if info.compress_size and info.file_size / max(info.compress_size, 1) > MAX_ZIP_RATIO:
        raise ValueError("Document compressé suspect.")
    out = bytearray()
    with archive.open(info) as handle:
        while True:
            chunk = handle.read(64 * 1024)
            if not chunk:
                break
            out.extend(chunk)
            if len(out) > max_bytes:
                raise ValueError("Document trop volumineux une fois décompressé.")
    return bytes(out)


def _collapse_spaces(text: str) -> str:
    return re.sub(r"[ \t]+", " ", text or "").strip()


def _normalize_lines(text: str) -> str:
    lines = []
    for raw in (text or "").splitlines():
        line = _collapse_spaces(raw)
        if line:
            lines.append(line)
    return "\n".join(lines)


def extract_txt(content: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return _normalize_lines(content.decode(encoding))
        except UnicodeDecodeError:
            continue
    return _normalize_lines(content.decode("utf-8", errors="ignore"))


def extract_docx(content: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            xml = read_zip_entry(archive, "word/document.xml")
        root = ElementTree.fromstring(xml)
    except KeyError as exc:
        raise ValueError("Ce fichier n'est pas un document Word (.docx) valide.") from exc
    except (zipfile.BadZipFile, zipfile.LargeZipFile, ParseError, DefusedXmlException, OSError, EOFError) as exc:
        raise ValueError("Document Word illisible ou corrompu.") from exc
    paragraphs: list[str] = []
    for paragraph in root.iter(f"{W_NS}p"):
        parts: list[str] = []
        for node in paragraph.iter(f"{W_NS}t"):
            if node.text:
                parts.append(node.text)
            if node.tail:
                parts.append(node.tail)
        line = _collapse_spaces("".join(parts))
        if line:
            paragraphs.append(line)
    return "\n".join(paragraphs)


def extract_pdf(content: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ValueError("Lecture PDF indisponible sur le serveur.") from exc

    from pypdf.errors import PyPdfError

    try:
        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            raise ValueError("Ce PDF est protégé par mot de passe.")
        pages = []
        for index, page in enumerate(reader.pages):
            if index >= MAX_PDF_PAGES:
                break
            text = page.extract_text() or ""
            page_lines = [_collapse_spaces(line) for line in text.splitlines() if _collapse_spaces(line)]
            if page_lines:
                pages.append("\n".join(page_lines))
    except ValueError:
        raise
    except (PyPdfError, OSError, KeyError, TypeError, AttributeError, IndexError, RecursionError, ZeroDivisionError) as exc:
        raise ValueError("PDF illisible ou corrompu.") from exc
    return "\n\n".join(pages)


def extract_resume_text(filename: str, content: bytes) -> str:
    lower = (filename or "").lower()
    if lower.endswith(".txt"):
        return extract_txt(content)
    if lower.endswith(".docx"):
        return extract_docx(content)
    if lower.endswith(".pdf"):
        text = extract_pdf(content)
        if len(text) < 40:
            raise ValueError("Le PDF ne contient pas assez de texte sélectionnable.")
        return text
    if lower.endswith(".doc"):
        raise ValueError("Le format .doc ancien n'est pas pris en charge. Utilisez DOCX ou PDF.")
    raise ValueError("Format de fichier non pris en charge.")
