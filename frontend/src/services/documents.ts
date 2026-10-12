import { makeRequest } from "@/lib/makeRequest";
import { apiUrl } from "@/lib/apiUrl";
import { NetworkError } from "@/lib/networkError";
import type { CareerDocument, DocumentKind } from "@/lib/documentTypes";

type ApiDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  fileName?: string | null;
  mime?: string | null;
  size?: number | null;
  cvId?: string | null;
  body?: string | null;
  hasFile?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DocumentPayload = {
  id?: string;
  kind: DocumentKind;
  title: string;
  fileName?: string;
  mime?: string;
  cvId?: string;
  body?: string;
};

export function toCareerDocument(row: ApiDocument): CareerDocument {
  const now = new Date().toISOString();
  return {
    id: String(row.id),
    kind: row.kind,
    title: row.title || "Document",
    fileName: row.fileName || `${row.title || "document"}.txt`,
    mime: row.mime || "text/plain",
    size: Number(row.size || 0),
    cvId: row.cvId || undefined,
    body: row.body ?? undefined,
    hasFile: Boolean(row.hasFile),
    createdAt: row.createdAt || now,
    updatedAt: row.updatedAt || row.createdAt || now,
  };
}

function unwrapOne(payload: unknown) {
  const row = (payload as { data?: ApiDocument } | null)?.data;
  if (!row) throw new NetworkError("Réponse inattendue du serveur.");
  return toCareerDocument(row);
}

export async function listDocuments() {
  const payload = (await makeRequest("documents", "GET", null, true, false)) as { data?: ApiDocument[] };
  return Array.isArray(payload?.data) ? payload.data.map(toCareerDocument) : [];
}

export async function saveDocument(body: DocumentPayload) {
  return unwrapOne(await makeRequest("documents", "POST", body, true, false));
}

export async function updateDocument(id: string, body: DocumentPayload) {
  return unwrapOne(await makeRequest(`documents/${encodeURIComponent(id)}`, "PUT", body, true, false));
}

export async function uploadDocument(
  file: File,
  meta: { kind: DocumentKind; title?: string; cvId?: string },
) {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", meta.kind);
  if (meta.title) form.append("title", meta.title);
  if (meta.cvId) form.append("cvId", meta.cvId);
  return unwrapOne(await makeRequest("documents/upload", "POST", form, true, false));
}

export async function deleteDocument(id: string) {
  return makeRequest(`documents/${encodeURIComponent(id)}`, "DELETE", null, true, false);
}

/** Binaire : `makeRequest` ne lit que du JSON, d'où ce fetch dédié via le BFF. */
export async function fetchDocumentFile(id: string) {
  let response: Response;
  try {
    response = await fetch(apiUrl(`documents/${encodeURIComponent(id)}/file`), {
      method: "GET",
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
  } catch {
    throw new NetworkError("Impossible de joindre le serveur. Vérifiez votre connexion.");
  }
  if (!response.ok) {
    let message = response.status === 404 ? "Fichier introuvable." : "Téléchargement impossible.";
    const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
    if (payload && typeof payload.message === "string" && payload.message) message = payload.message;
    throw new NetworkError(message, response.status);
  }
  return response.blob();
}
