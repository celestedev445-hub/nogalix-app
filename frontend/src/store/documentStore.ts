import { create } from "zustand";
import type { CareerDocument, DocumentKind } from "@/lib/documentTypes";
import { toast } from "@/hooks/use-toast";
import {
  deleteDocument,
  fetchDocumentFile,
  listDocuments,
  saveDocument,
  uploadDocument,
} from "@/services/documents";

type DocumentState = {
  items: CareerDocument[];
  loaded: boolean;
  loading: boolean;
  /** Charge la liste depuis l'API (une fois, sauf `force`). */
  load: (force?: boolean) => Promise<void>;
  /** Crée ou met à jour (même `id`) un document texte côté API. Lève une erreur en cas d'échec. */
  upsert: (doc: Partial<CareerDocument> & { kind: DocumentKind; title: string }) => Promise<CareerDocument>;
  /** Envoie un fichier (PDF, DOCX, JPG, PNG, WebP · 10 Mo max). Lève une erreur en cas d'échec. */
  upload: (file: File, meta?: { kind?: DocumentKind; title?: string; cvId?: string }) => Promise<CareerDocument>;
  remove: (id: string) => Promise<boolean>;
  download: (doc: CareerDocument) => Promise<void>;
  getById: (id: string) => CareerDocument | undefined;
  reset: () => void;
};

let loadPromise: Promise<void> | null = null;

function putFirst(items: CareerDocument[], doc: CareerDocument) {
  return [doc, ...items.filter((item) => item.id !== doc.id)];
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const useDocumentStore = create<DocumentState>()((set, get) => ({
  items: [],
  loaded: false,
  loading: false,
  reset: () => {
    loadPromise = null;
    set({ items: [], loaded: false, loading: false });
  },
  getById: (id) => get().items.find((item) => item.id === id),

  load: async (force = false) => {
    if (get().loaded && !force) return;
    if (loadPromise && !force) return loadPromise;
    set({ loading: true });
    loadPromise = (async () => {
      try {
        const items = await listDocuments();
        set({ items, loaded: true });
      } catch (error) {
        toast({
          title: "Documents indisponibles",
          description: error instanceof Error ? error.message : "Réessayez dans un instant.",
          variant: "destructive",
        });
      } finally {
        set({ loading: false });
        loadPromise = null;
      }
    })();
    return loadPromise;
  },

  upsert: async (doc) => {
    const saved = await saveDocument({
      ...(doc.id ? { id: doc.id } : {}),
      kind: doc.kind,
      title: doc.title,
      ...(doc.fileName ? { fileName: doc.fileName } : {}),
      ...(doc.mime ? { mime: doc.mime } : {}),
      ...(doc.cvId ? { cvId: doc.cvId } : {}),
      ...(doc.body != null ? { body: doc.body } : {}),
    });
    set({ items: putFirst(get().items, saved) });
    return saved;
  },

  upload: async (file, meta = {}) => {
    const saved = await uploadDocument(file, {
      kind: meta.kind ?? "piece",
      title: meta.title,
      cvId: meta.cvId,
    });
    set({ items: putFirst(get().items, saved) });
    return saved;
  },

  remove: async (id) => {
    const previous = get().items;
    set({ items: previous.filter((item) => item.id !== id) });
    try {
      await deleteDocument(id);
      toast({ title: "Document supprimé", variant: "success" });
      return true;
    } catch (error) {
      set({ items: previous });
      toast({
        title: "Suppression impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
      return false;
    }
  },

  download: async (doc) => {
    try {
      if (doc.hasFile) {
        const blob = await fetchDocumentFile(doc.id);
        saveBlob(blob, doc.fileName);
        return;
      }
      if (doc.body) {
        const name = /\.txt$/i.test(doc.fileName) ? doc.fileName : `${doc.fileName.replace(/\.[^.]+$/, "")}.txt`;
        saveBlob(new Blob([doc.body], { type: "text/plain;charset=utf-8" }), name);
        return;
      }
      toast({
        title: "Fichier indisponible",
        description: "Ce document n'a pas de fichier téléchargeable.",
      });
    } catch (error) {
      toast({
        title: "Téléchargement impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    }
  },
}));
