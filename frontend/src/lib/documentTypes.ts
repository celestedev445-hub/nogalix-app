export type DocumentKind = "lettre" | "export" | "piece";

export type CareerDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  fileName: string;
  mime: string;
  size: number;
  cvId?: string;
  body?: string;
  /** Fichier binaire stocké côté serveur (GET documents/{id}/file). */
  hasFile?: boolean;
  /** @deprecated ancien stockage mémoire — plus utilisé. */
  dataUrl?: string;
  createdAt: string;
  updatedAt: string;
};
