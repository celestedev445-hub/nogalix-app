import { create } from "zustand";
import type { CvData } from "@/lib/cvTypes";
import { emptyCv } from "@/lib/demoData";
import { preloadCvTemplates } from "@/lib/cvTemplateLoaders";
import { createCv, deleteCv, getCv, listCvs, updateCv } from "@/services/cv";
import { toast } from "@/hooks/use-toast";
import { isNetworkError } from "@/lib/networkError";

const REFRESH_MS = 60_000;

function completionOf(cv: CvData) {
  let score = 0;
  if (cv.identity.firstName && cv.identity.lastName) score += 15;
  if (cv.identity.title) score += 10;
  if (cv.identity.email) score += 8;
  if (cv.summary.length > 40) score += 12;
  if (cv.experiences.length) score += 20;
  if (cv.education.length) score += 12;
  if (cv.skills.length) score += 13;
  if (cv.languages.length) score += 10;
  return Math.min(100, score);
}

function cvTimestamp(cv: CvData) {
  const t = Date.parse(cv.updatedAt || "");
  return Number.isFinite(t) ? t : 0;
}

function mergeCvList(local: CvData[], remote: CvData[]): CvData[] {
  const byId = new Map<string, CvData>();
  for (const item of remote) byId.set(item.id, item);
  for (const localCv of local) {
    const remoteCv = byId.get(localCv.id);
    if (!remoteCv) {
      byId.set(localCv.id, localCv);
      continue;
    }
    byId.set(localCv.id, cvTimestamp(localCv) >= cvTimestamp(remoteCv) ? localCv : remoteCv);
  }
  return Array.from(byId.values()).sort((a, b) => cvTimestamp(b) - cvTimestamp(a));
}

type CvState = {
  items: CvData[];
  loaded: boolean;
  lastFetchedAt: number;
  syncedIds: Set<string>;
  setItems: (items: CvData[]) => void;
  load: (force?: boolean) => Promise<void>;
  ensure: (id: string) => Promise<CvData | null>;
  upsert: (cv: CvData, persistRemote?: boolean) => Promise<CvData>;
  flush: (id: string) => Promise<CvData | null>;
  remove: (id: string, options?: { silent?: boolean }) => Promise<void>;
  getById: (id: string) => CvData | undefined;
  reset: () => void;
};

function unwrapList(payload: unknown): CvData[] | null {
  if (Array.isArray(payload)) return payload as CvData[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: CvData[] }).data;
  }
  return null;
}

function unwrapOne(payload: unknown): CvData | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as { data?: CvData; id?: string };
  if (body.data && typeof body.data === "object") return body.data;
  if ("id" in body) return body as CvData;
  return null;
}

let loadInflight: Promise<void> | null = null;

export const useCvStore = create<CvState>()((set, get) => ({
  items: [],
  loaded: false,
  lastFetchedAt: 0,
  syncedIds: new Set<string>(),
  reset: () => set({ items: [], loaded: false, lastFetchedAt: 0, syncedIds: new Set() }),
  setItems: (items) => set({ items }),
  getById: (id) => get().items.find((item) => item.id === id),
  load: async (force = false) => {
    const { loaded, lastFetchedAt } = get();
    if (!force && loaded && Date.now() - lastFetchedAt < REFRESH_MS) return;
    if (loadInflight) return loadInflight;

    loadInflight = (async () => {
      try {
        const payload = await listCvs();
        const list = unwrapList(payload);
        if (list !== null) {
          preloadCvTemplates(list.map((item) => item.templateId));
          const merged = mergeCvList(get().items, list);
          set({
            items: merged,
            loaded: true,
            lastFetchedAt: Date.now(),
            syncedIds: new Set(list.map((item) => item.id)),
          });
          return;
        }
      } catch {
        /* API indisponible */
      }
      set({ items: get().items, loaded: true, lastFetchedAt: Date.now() });
    })();

    try {
      await loadInflight;
    } finally {
      loadInflight = null;
    }
  },
  ensure: async (id) => {
    const existing = get().getById(id);
    if (existing) {
      preloadCvTemplates([existing.templateId]);
      return existing;
    }

    try {
      const payload = await getCv(id);
      const remote = unwrapOne(payload);
      if (!remote) return null;
      preloadCvTemplates([remote.templateId]);
      set({
        items: get().items.some((item) => item.id === remote.id)
          ? get().items.map((item) => (item.id === remote.id ? remote : item))
          : [remote, ...get().items],
        loaded: true,
        syncedIds: new Set([...get().syncedIds, remote.id]),
      });
      return remote;
    } catch {
      return null;
    }
  },
  upsert: async (cv, persistRemote = true) => {
    preloadCvTemplates([cv.templateId]);
    const next = { ...cv, completion: completionOf(cv), updatedAt: new Date().toISOString() };

    const applyLocal = (saved: CvData) => {
      set({
        items: get().items.some((item) => item.id === saved.id)
          ? get().items.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...get().items],
      });
      return saved;
    };

    if (!persistRemote) {
      return applyLocal(next);
    }

    const markSynced = (saved: CvData) => {
      const syncedIds = new Set(get().syncedIds);
      syncedIds.add(saved.id);
      set({ syncedIds });
      return applyLocal(saved);
    };

    if (get().syncedIds.has(cv.id)) {
      const response = await updateCv(next.id, next);
      const remote = unwrapOne(response);
      const saved = remote
        ? {
            ...next,
            ...remote,
            importSource: remote.importSource ?? next.importSource,
            editorStatus: remote.editorStatus ?? next.editorStatus,
          }
        : next;
      return markSynced(saved);
    }

    try {
      const response = await createCv(next);
      const remote = unwrapOne(response);
      const saved = remote
        ? {
            ...next,
            ...remote,
            importSource: remote.importSource ?? next.importSource,
            editorStatus: remote.editorStatus ?? next.editorStatus,
          }
        : next;
      return markSynced(saved);
    } catch (error) {
      if (isNetworkError(error) && error.status === 409) {
        const response = await updateCv(next.id, next);
        const remote = unwrapOne(response);
        const saved = remote
          ? {
              ...next,
              ...remote,
              importSource: remote.importSource ?? next.importSource,
              editorStatus: remote.editorStatus ?? next.editorStatus,
            }
          : next;
        return markSynced(saved);
      }
      throw error;
    }
  },
  flush: async (id) => {
    const cv = get().getById(id);
    if (!cv) return null;
    return get().upsert(cv, true);
  },
  remove: async (id, options) => {
    const snapshot = get().items;
    const syncedSnapshot = get().syncedIds;
    set({
      items: snapshot.filter((item) => item.id !== id),
      syncedIds: new Set([...syncedSnapshot].filter((itemId) => itemId !== id)),
    });

    try {
      await deleteCv(id);
      if (!options?.silent) {
        toast({ title: "CV supprimé", variant: "success" });
      }
    } catch (error) {
      if (isNetworkError(error) && error.status === 404) {
        if (!options?.silent) {
          toast({ title: "CV supprimé", variant: "success" });
        }
        return;
      }
      set({ items: snapshot, syncedIds: syncedSnapshot });
      toast({
        title: "Suppression impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    }
  },
}));

export { emptyCv, completionOf };
