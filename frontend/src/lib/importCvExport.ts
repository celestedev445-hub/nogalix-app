import type { CvData } from "@/lib/cvTypes";
import { cvExportBaseName } from "@/lib/cvExport";
import { exportReconstructedDocument, pickRichestText } from "@/lib/convertExport";
import {
  importHtmlStorageKey,
  readImportConvertedPdfEdits,
  readImportEditedHtml,
  readImportEditedPdfEdits,
  readImportEditedPdfPages,
  readImportEditedText,
} from "@/lib/importEditedContent";
import { resolveImportMeta } from "@/lib/importedCv";
import { ensureImportEditablePdf, resolveImportFileKind } from "@/lib/importPreviewStore";

export type ImportExportFormat = "pdf" | "word" | "png" | "txt" | "original";

function htmlToPlainText(html: string) {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.textContent?.trim() ?? "";
}

function readAnyImportEditedHtml(cvId: string) {
  return (
    readImportEditedHtml(importHtmlStorageKey(cvId, "pdf-docx")) ??
    readImportEditedHtml(importHtmlStorageKey(cvId, "docx"))
  );
}

export function resolveImportEditedPlainText(cvId: string) {
  const html = readAnyImportEditedHtml(cvId);
  const pdfPages = readImportEditedPdfPages(cvId);
  return pickRichestText(
    readImportEditedText(cvId),
    html ? htmlToPlainText(html) : "",
    pdfPages?.map((pageHtml) => htmlToPlainText(pageHtml)).filter(Boolean).join("\n\n") ?? "",
  );
}

export async function exportImportedCv(
  format: ImportExportFormat,
  cv: CvData,
  captureRoot: HTMLElement | null,
  originalFile: File | null,
) {
  const meta = resolveImportMeta(cv);
  const fileName = meta?.fileName ?? cvExportBaseName(cv);
  const kind = resolveImportFileKind(fileName, meta?.mimeType ?? "");
  let editableDoc = null;
  if (kind === "pdf") {
    try {
      editableDoc = await ensureImportEditablePdf(cv.id);
    } catch {
      editableDoc = null;
    }
  }

  await exportReconstructedDocument({
    format,
    fileName,
    file: originalFile,
    kind,
    captureRoot,
    editableDoc,
    storedText: resolveImportEditedPlainText(cv.id),
    edits: readImportConvertedPdfEdits(cv.id) ?? readImportEditedPdfEdits(cv.id),
  });
}
