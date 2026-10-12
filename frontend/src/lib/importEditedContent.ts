const HTML_PREFIX = "nogalix:import-edited-html:";
const TEXT_PREFIX = "nogalix:import-edited-text:";

export type ImportHtmlVariant = "docx" | "pdf-docx";

export function importHtmlStorageKey(cvId: string, variant: ImportHtmlVariant = "docx") {
  return variant === "docx" ? cvId : `${cvId}:${variant}`;
}

function htmlStorageItemKey(storageKey: string) {
  return `${HTML_PREFIX}${storageKey}`;
}

export function isValidDocxEditedHtml(html: string) {
  const trimmed = html.trim();
  if (trimmed.length < 40) return false;
  return trimmed.includes("docx-wrapper") || trimmed.includes('class="docx"') || trimmed.includes("class='docx'");
}

const PDF_PAGES_PREFIX = "nogalix:import-edited-pdf-pages:";
const PDF_EDITS_PREFIX = "nogalix:import-edited-pdf-edits:";
const PDF_CONVERTED_EDITS_PREFIX = "nogalix:import-edited-pdf-converted:";

export type PdfTextEdit = {
  spanId: string;
  text: string;
  left: string;
  top: string;
  width: string;
  height: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  transform: string;
  transformOrigin: string;
  color?: string;
  textDecoration?: string;
  textAlign?: string;
  backgroundColor?: string;
  textTransform?: string;
  verticalAlign?: string;
};

export function storeImportEditedHtml(storageKey: string, html: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(htmlStorageItemKey(storageKey), html);
  } catch {
    /* ignore */
  }
}

export function readImportEditedHtml(storageKey: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(htmlStorageItemKey(storageKey));
    if (!raw) return null;
    if (!isValidDocxEditedHtml(raw)) {
      sessionStorage.removeItem(htmlStorageItemKey(storageKey));
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function clearImportEditedHtml(storageKey: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(htmlStorageItemKey(storageKey));
}

export function storeImportEditedText(cvId: string, text: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${TEXT_PREFIX}${cvId}`, text);
  } catch {
    /* ignore */
  }
}

export function readImportEditedText(cvId: string) {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(`${TEXT_PREFIX}${cvId}`);
  } catch {
    return null;
  }
}

export function storeImportEditedPdfPages(cvId: string, pagesHtml: string[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PDF_PAGES_PREFIX}${cvId}`, JSON.stringify(pagesHtml));
  } catch {
    /* ignore */
  }
}

export function readImportEditedPdfPages(cvId: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PDF_PAGES_PREFIX}${cvId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

export function storeImportEditedPdfEdits(cvId: string, pages: PdfTextEdit[][]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PDF_EDITS_PREFIX}${cvId}`, JSON.stringify(pages));
  } catch {
    /* ignore */
  }
}

export function readImportEditedPdfEdits(cvId: string): PdfTextEdit[][] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PDF_EDITS_PREFIX}${cvId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((page) =>
      Array.isArray(page) ? (page as PdfTextEdit[]).map((edit) => ({ ...edit })) : [],
    );
  } catch {
    return null;
  }
}

export function storeImportConvertedPdfEdits(cvId: string, pages: PdfTextEdit[][]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PDF_CONVERTED_EDITS_PREFIX}${cvId}`, JSON.stringify(pages));
  } catch {
    /* ignore */
  }
}

export function readImportConvertedPdfEdits(cvId: string): PdfTextEdit[][] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PDF_CONVERTED_EDITS_PREFIX}${cvId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((page) =>
      Array.isArray(page) ? (page as PdfTextEdit[]).map((edit) => ({ ...edit })) : [],
    );
  } catch {
    return null;
  }
}

export function clearImportEditedContent(cvId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(htmlStorageItemKey(cvId));
  sessionStorage.removeItem(htmlStorageItemKey(importHtmlStorageKey(cvId, "pdf-docx")));
  sessionStorage.removeItem(`${TEXT_PREFIX}${cvId}`);
  sessionStorage.removeItem(`${PDF_PAGES_PREFIX}${cvId}`);
  sessionStorage.removeItem(`${PDF_EDITS_PREFIX}${cvId}`);
  sessionStorage.removeItem(`${PDF_CONVERTED_EDITS_PREFIX}${cvId}`);
}
