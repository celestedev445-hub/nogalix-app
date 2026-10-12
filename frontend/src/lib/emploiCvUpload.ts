import { applyCvPatch, type CvPatch } from "@/lib/cvPatch";
import { emptyCv } from "@/lib/demoData";
import type { CvData } from "@/lib/cvTypes";
import { detectEditKind } from "@/lib/convertFile";
import { extractResumeText } from "@/services/analyse";
import { parseImportedCv } from "@/services/importCv";

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

/** Transforme un fichier CV en profil de matching (sans l'enregistrer dans Mes CV). */
export async function cvFromUploadedFile(file: File): Promise<CvData> {
  const kind = await detectEditKind(file);
  if (!kind) {
    throw new Error("Format non supporté. Utilisez un PDF, Word (.docx) ou fichier texte.");
  }
  if (kind === "doc") {
    throw new Error("Les fichiers .doc ne sont pas supportés. Enregistrez le CV en .docx.");
  }

  let text = "";
  if (kind === "text") {
    text = await file.text();
  } else {
    const extracted = await extractResumeText(file);
    text = extracted.text || "";
  }

  if (text.trim().length < 20) {
    throw new Error("Pas assez de texte dans ce fichier pour analyser le profil.");
  }

  const parsed = await parseImportedCv({
    text: text.slice(0, 40000),
    fileName: file.name,
    requireAi: false,
  });

  const title = file.name.replace(/\.[^.]+$/, "") || "CV importé";
  const base = emptyCv({
    id: `emploi-upload-${Date.now()}`,
    title,
  });

  return {
    ...applyCvPatch(base, payloadToPatch(parsed.payload || {})),
    title,
    importSource: {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    },
  };
}
