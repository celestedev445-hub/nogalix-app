import type { EditablePdfDocument } from "@/lib/editablePdf";
import { isEditablePdfDocument } from "@/lib/editablePdf";
import { deleteImportFileFromDb, loadImportFileFromDb, saveImportFileToDb } from "@/lib/importFileStorage";
import { convertPdfToDocx, convertPdfToEditable } from "@/services/importCv";

const files = new Map<string, File>();
const blobUrls = new Map<string, string>();
const editableDocxFiles = new Map<string, File>();
const editablePdfDocs = new Map<string, EditablePdfDocument>();

const EDITABLE_DOCX_SUFFIX = "__editable_docx";
const EDITABLE_PDF_SUFFIX = "__editable_pdf_v5";

export type ImportFileKind = "pdf" | "image" | "docx" | "text" | "unsupported";

export function resolveImportFileKind(fileName: string, mimeType = ""): ImportFileKind {
  const lower = fileName.toLowerCase();
  if (mimeType.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(lower)) return "image";
  if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc")
  ) {
    return lower.endsWith(".doc") ? "unsupported" : "docx";
  }
  if (mimeType.startsWith("text/") || lower.endsWith(".txt")) return "text";
  return "unsupported";
}

function rememberFile(cvId: string, file: File) {
  const previous = blobUrls.get(cvId);
  if (previous) URL.revokeObjectURL(previous);
  files.set(cvId, file);
  blobUrls.set(cvId, URL.createObjectURL(file));
}

export async function registerImportFile(cvId: string, file: File) {
  rememberFile(cvId, file);
  try {
    await saveImportFileToDb(cvId, file);
  } catch {
    /* session mémoire suffit pour la navigation immédiate */
  }
}

export function getImportFile(cvId: string) {
  return files.get(cvId) ?? null;
}

export function getImportBlobUrl(cvId: string) {
  return blobUrls.get(cvId) ?? null;
}

export async function ensureImportFile(
  cvId: string,
  meta?: { fileName: string; mimeType: string },
): Promise<File | null> {
  const cached = files.get(cvId);
  if (cached) return cached;

  try {
    const stored = await loadImportFileFromDb(cvId, meta);
    if (stored) {
      rememberFile(cvId, stored);
      return stored;
    }
  } catch {
    /* IndexedDB indisponible ou lecture échouée */
  }
  return null;
}

function editableDocxKey(cvId: string) {
  return `${cvId}${EDITABLE_DOCX_SUFFIX}`;
}

export async function ensureImportEditableDocx(cvId: string, sourceFile?: File): Promise<File> {
  const cached = editableDocxFiles.get(cvId);
  if (cached) return cached;

  const stored = await loadImportFileFromDb(editableDocxKey(cvId));
  if (stored) {
    editableDocxFiles.set(cvId, stored);
    return stored;
  }

  const pdf = sourceFile ?? (await ensureImportFile(cvId));
  if (!pdf) {
    throw new Error("Fichier PDF introuvable.");
  }

  const docx = await convertPdfToDocx(pdf);
  editableDocxFiles.set(cvId, docx);
  void saveImportFileToDb(editableDocxKey(cvId), docx).catch(() => {
    /* session mémoire suffit */
  });
  return docx;
}

function editablePdfKey(cvId: string) {
  return `${cvId}${EDITABLE_PDF_SUFFIX}`;
}

export async function ensureImportEditablePdf(
  cvId: string,
  sourceFile?: File,
): Promise<EditablePdfDocument> {
  const cached = editablePdfDocs.get(editablePdfKey(cvId));
  if (cached) return cached;

  const stored = await loadImportFileFromDb(editablePdfKey(cvId));
  if (stored) {
    try {
      const parsed = JSON.parse(await stored.text()) as unknown;
      if (isEditablePdfDocument(parsed) && parsed.pages.length) {
        editablePdfDocs.set(editablePdfKey(cvId), parsed);
        return parsed;
      }
    } catch {
      /* conversion à refaire */
    }
  }

  const pdf = sourceFile ?? (await ensureImportFile(cvId));
  if (!pdf) {
    throw new Error("Fichier PDF introuvable.");
  }

  const document = await convertPdfToEditable(pdf);
  editablePdfDocs.set(editablePdfKey(cvId), document);
  const blob = new File([JSON.stringify(document)], "editable-pdf.json", {
    type: "application/json",
  });
  void saveImportFileToDb(editablePdfKey(cvId), blob).catch(() => {
    /* session mémoire suffit */
  });
  return document;
}

export function releaseImportFile(cvId: string) {
  const url = blobUrls.get(cvId);
  if (url) URL.revokeObjectURL(url);
  blobUrls.delete(cvId);
  files.delete(cvId);
  editableDocxFiles.delete(cvId);
  editablePdfDocs.delete(editablePdfKey(cvId));
  void deleteImportFileFromDb(cvId).catch(() => {
    /* ignore */
  });
  void deleteImportFileFromDb(editableDocxKey(cvId)).catch(() => {
    /* ignore */
  });
  void deleteImportFileFromDb(editablePdfKey(cvId)).catch(() => {
    /* ignore */
  });
}
