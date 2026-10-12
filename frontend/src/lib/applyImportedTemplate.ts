import { applyCvPatch, type CvPatch } from "@/lib/cvPatch";
import { resolveCvIcon } from "@/lib/cvIcons";
import { hydrateEditableDocument, pickRichestText, textFromEditablePdf, textFromEditablePreview } from "@/lib/convertExport";
import type { CvData } from "@/lib/cvTypes";
import { resolveImportEditedPlainText } from "@/lib/importCvExport";
import { readImportConvertedPdfEdits, readImportEditedPdfEdits } from "@/lib/importEditedContent";
import { readImportExtractedText, resolveImportMeta, storeImportExtractedText } from "@/lib/importedCv";
import { ensureImportEditablePdf, ensureImportFile, resolveImportFileKind } from "@/lib/importPreviewStore";
import { extractImportedPhoto, parseImportedCv } from "@/services/importCv";
import { extractResumeText } from "@/services/analyse";

function asList<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

function payloadToPatch(payload: Record<string, unknown>): CvPatch {
  const identity =
    payload.identity && typeof payload.identity === "object"
      ? { ...(payload.identity as NonNullable<CvPatch["identity"]>) }
      : undefined;
  if (identity && !identity.photo) {
    delete identity.photo;
  }

  return {
    summary: typeof payload.summary === "string" ? payload.summary : undefined,
    identity,
    experiences: asList(payload.experiences),
    education: asList(payload.education),
    skills: asList(payload.skills),
    languages: asList(payload.languages),
    projects: asList(payload.projects),
    certifications: asList(payload.certifications),
    interests: asList(payload.interests),
    references: asList(payload.references),
    replaceLists: true,
  };
}

export function describeFilledSections(cv: CvData) {
  const parts: string[] = [];
  if (cv.identity.firstName || cv.identity.lastName || cv.identity.email || cv.identity.title) {
    parts.push("identité");
  }
  if (cv.identity.photo) parts.push("photo");
  if (cv.summary.trim()) parts.push("accroche");
  if (cv.experiences.length) parts.push("expérience");
  if (cv.education.length) parts.push("formation");
  if (cv.skills.length) parts.push("compétences");
  if (cv.languages.length) parts.push("langues");
  if (cv.projects.length) parts.push("projets");
  if (cv.certifications.length) parts.push("certifications");
  if (cv.interests?.length) parts.push("centres d'intérêt");
  if (cv.references?.length) parts.push("références");
  return parts;
}

export async function collectImportedCvText(cv: CvData): Promise<string> {
  const stored = pickRichestText(
    resolveImportEditedPlainText(cv.id),
    readImportExtractedText(cv.id) ?? "",
  );
  const meta = resolveImportMeta(cv);
  const kind = resolveImportFileKind(meta?.fileName ?? "", meta?.mimeType ?? "");

  const previewRoot =
    typeof document !== "undefined"
      ? document.querySelector<HTMLElement>("[data-import-export-root]")
      : null;
  const previewText = previewRoot ? textFromEditablePreview(previewRoot) : "";

  let fromPdf = "";
  if (kind === "pdf") {
    try {
      const doc = await ensureImportEditablePdf(cv.id);
      const edits = readImportConvertedPdfEdits(cv.id) ?? readImportEditedPdfEdits(cv.id);
      const merged = hydrateEditableDocument(doc, previewRoot, edits);
      fromPdf = textFromEditablePdf(merged);
    } catch {
      /* le fichier original sert de repli */
    }
  }

  let text = pickRichestText(fromPdf, previewText, stored);
  if (text.length >= 20) {
    storeImportExtractedText(cv.id, text);
    return text.slice(0, 40000);
  }

  const file = await ensureImportFile(cv.id, meta ? { fileName: meta.fileName, mimeType: meta.mimeType } : undefined);
  if (file) {
    try {
      if (kind === "text") {
        text = pickRichestText(text, await file.text());
      } else {
        const extracted = await extractResumeText(file);
        text = pickRichestText(text, extracted.text);
      }
    } catch {
      /* parse local sur le texte déjà disponible */
    }
  }

  const next = text.trim();
  if (next) storeImportExtractedText(cv.id, next);
  return next.slice(0, 40000);
}

export async function fillCvFromImportedDocument(cv: CvData, templateId: string): Promise<CvData> {
  const text = await collectImportedCvText(cv);
  const meta = resolveImportMeta(cv);

  if (text.length < 20) {
    throw new Error("Pas assez de texte dans le CV pour que l'IA remplisse le modèle.");
  }

  const parsed = await parseImportedCv({
    text,
    fileName: meta?.fileName,
    requireAi: true,
  });
  if (parsed.source !== "ai") {
    throw new Error("L'IA n'a pas pu redistribuer le CV dans les sections.");
  }

  const patched = applyCvPatch(cv, payloadToPatch(parsed.payload));
  const photo = cv.identity.photo || patched.identity.photo || (await recoverImportedPhoto(cv));
  return {
    ...patched,
    templateId,
    identity: {
      ...patched.identity,
      photo,
    },
    skills: patched.skills.map((skill) => ({
      ...skill,
      icon: resolveCvIcon(skill.name, skill.icon),
    })),
    interests: (patched.interests ?? []).map((item) => ({
      ...item,
      icon: resolveCvIcon(item.name, item.icon),
    })),
  };
}

export async function recoverImportedPhoto(cv: CvData): Promise<string | null> {
  const meta = resolveImportMeta(cv);
  const kind = resolveImportFileKind(meta?.fileName ?? "", meta?.mimeType ?? "");
  if (kind !== "pdf" && kind !== "docx") return null;
  try {
    const file = await ensureImportFile(
      cv.id,
      meta ? { fileName: meta.fileName, mimeType: meta.mimeType } : undefined,
    );
    if (!file) return null;
    return await extractImportedPhoto(file);
  } catch {
    return null;
  }
}
