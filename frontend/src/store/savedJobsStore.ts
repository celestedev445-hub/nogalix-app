import { create } from "zustand";
import { makeRequest } from "@/lib/makeRequest";
import { toast } from "@/hooks/use-toast";
import type { JobOffer } from "@/lib/jobTypes";

export type SavedJob = {
  id: string;
  job: JobOffer | null;
  savedAt: string;
};

type SavedJobsState = {
  ids: string[];
  /** Offres sauvegardées (objet complet quand le serveur l'a conservé). */
  jobs: SavedJob[];
  loaded: boolean;
  loading: boolean;
  load: (force?: boolean) => Promise<void>;
  /** Bascule optimiste ; renvoie l'état final (true = sauvegardée). */
  toggle: (job: JobOffer | string) => Promise<boolean>;
  has: (id: string) => boolean;
  reset: () => void;
};

let loadPromise: Promise<void> | null = null;

function normalize(rows: unknown): SavedJob[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is { id: unknown; job?: unknown; savedAt?: unknown } => Boolean(row && typeof row === "object"))
    .map((row) => ({
      id: String(row.id),
      job: row.job && typeof row.job === "object" ? (row.job as JobOffer) : null,
      savedAt: typeof row.savedAt === "string" ? row.savedAt : new Date().toISOString(),
    }));
}

export const useSavedJobsStore = create<SavedJobsState>()((set, get) => ({
  ids: [],
  jobs: [],
  loaded: false,
  loading: false,
  reset: () => {
    loadPromise = null;
    set({ ids: [], jobs: [], loaded: false, loading: false });
  },
  has: (id) => get().ids.includes(id),

  load: async (force = false) => {
    if (get().loaded && !force) return;
    if (loadPromise && !force) return loadPromise;
    set({ loading: true });
    loadPromise = (async () => {
      try {
        const payload = (await makeRequest("jobs/saved", "GET", null, true, false)) as { data?: unknown };
        const jobs = normalize(payload?.data);
        set({ jobs, ids: jobs.map((item) => item.id), loaded: true });
      } catch {
        /* silencieux : la liste reste vide, la recherche fonctionne */
      } finally {
        set({ loading: false });
        loadPromise = null;
      }
    })();
    return loadPromise;
  },

  toggle: async (input) => {
    const id = typeof input === "string" ? input : input.id;
    const job = typeof input === "string" ? get().jobs.find((item) => item.id === id)?.job ?? null : input;
    const previous = { ids: get().ids, jobs: get().jobs };
    const wasSaved = previous.ids.includes(id);

    if (wasSaved) {
      set({
        ids: previous.ids.filter((item) => item !== id),
        jobs: previous.jobs.filter((item) => item.id !== id),
      });
    } else {
      set({
        ids: [...previous.ids, id],
        jobs: [{ id, job, savedAt: new Date().toISOString() }, ...previous.jobs],
      });
    }

    try {
      if (wasSaved) {
        await makeRequest(`jobs/saved/${encodeURIComponent(id)}`, "DELETE", null, true, false);
      } else {
        const payload = (await makeRequest("jobs/saved", "POST", { id, job }, true, false)) as {
          data?: unknown;
        };
        const [saved] = normalize(payload?.data ? [payload.data] : []);
        if (saved) {
          set({ jobs: get().jobs.map((item) => (item.id === id ? { ...saved, job: saved.job ?? job } : item)) });
        }
      }
      return !wasSaved;
    } catch (error) {
      set(previous);
      toast({
        title: wasSaved ? "Retrait impossible" : "Sauvegarde impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
      return wasSaved;
    }
  },
}));
