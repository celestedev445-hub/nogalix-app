export const IMPORT_ORIGINAL_TEMPLATE_ID = "import-original";

export type CvImportSource = {
  fileName: string;
  mimeType: string;
  dataUrl?: string;
};

export function guessMimeType(fileName: string, mimeType?: string) {
  if (mimeType) return mimeType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export function buildImportSource(file: File): CvImportSource {
  return {
    fileName: file.name,
    mimeType: guessMimeType(file.name, file.type),
  };
}

const META_PREFIX = "nogalix:import-meta:";
const TEXT_PREFIX = "nogalix:import-text:";

export function storeImportMeta(cvId: string, source: CvImportSource) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${META_PREFIX}${cvId}`, JSON.stringify(source));
  } catch {
    /* ignore */
  }
}

export function storeImportExtractedText(cvId: string, text: string) {
  if (typeof window === "undefined" || !text.trim()) return;
  try {
    sessionStorage.setItem(`${TEXT_PREFIX}${cvId}`, text.slice(0, 20000));
  } catch {
    /* ignore */
  }
}

export function readImportExtractedText(cvId: string) {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(`${TEXT_PREFIX}${cvId}`);
  } catch {
    return null;
  }
}

export function readImportMeta(cvId: string): CvImportSource | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${META_PREFIX}${cvId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CvImportSource;
  } catch {
    return null;
  }
}

export function resolveImportMeta(cv: { id: string; importSource?: CvImportSource }) {
  if (cv.importSource?.fileName) return cv.importSource;
  return readImportMeta(cv.id);
}
