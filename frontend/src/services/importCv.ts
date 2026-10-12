import { makeRequest } from "@/lib/makeRequest";
import type { EditablePdfDocument } from "@/lib/editablePdf";
import { isEditablePdfDocument } from "@/lib/editablePdf";

export type ImportEditorConfigResponse = {
  enabled: boolean;
  ready: boolean;
  documentServerUrl?: string;
  config?: Record<string, unknown>;
};

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function uploadImportFile(cvId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return makeRequest(`cv/${cvId}/import/upload`, "POST", formData, true, false) as Promise<{
    ok: boolean;
    meta?: { originalName: string; originalMime: string; version: number };
  }>;
}

export async function fetchImportEditorConfig(cvId: string) {
  return makeRequest(`cv/${cvId}/import/editor-config`, "GET", undefined, true, false) as Promise<
    ImportEditorConfigResponse
  >;
}

export type { EditablePdfDocument };

export async function convertPdfToEditable(file: File): Promise<EditablePdfDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await makeRequest("cv/import/pdf-to-editable", "POST", formData, true, false);
  if (!isEditablePdfDocument(response)) {
    throw new Error("La conversion du PDF a renvoyé un document invalide.");
  }
  if (!response.pages.length) {
    throw new Error("Ce PDF ne contient aucune page.");
  }
  return response;
}

export async function extractImportedPhoto(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const response = (await makeRequest("cv/import/extract-photo", "POST", formData, true, false)) as {
    photo?: string | null;
  };
  return response.photo?.startsWith("data:image/") ? response.photo : null;
}

export async function parseImportedCv(payload: {
  text: string;
  fileName?: string;
  requireAi?: boolean;
}) {
  return makeRequest("cv/import/parse", "POST", payload, true, false) as Promise<{
    payload: Record<string, unknown>;
    source: "ai" | "local";
  }>;
}

export async function convertPdfToDocx(file: File): Promise<File> {
  const formData = new FormData();
  formData.append("file", file);

  const response = (await makeRequest("cv/import/pdf-to-docx", "POST", formData, true, false)) as {
    fileName: string;
    contentBase64: string;
    mimeType: string;
  };

  const bytes = base64ToUint8Array(response.contentBase64);
  const blob = new Blob([bytes], {
    type: response.mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return new File([blob], response.fileName || file.name.replace(/\.pdf$/i, ".docx"), {
    type: response.mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
