import type { CvData } from "@/lib/cvTypes";
import { useCvStore } from "@/store/cvStore";
import { clearCvEditingSession, isNewCvEditingSession } from "@/lib/cvEditorSession";

type CvStoreApi = {
  upsert: (cv: CvData, persistRemote?: boolean) => Promise<CvData>;
  remove: (id: string, options?: { silent?: boolean }) => Promise<void>;
  syncedIds: Set<string>;
};

export async function discardCvEditingSession(
  cvId: string,
  sessionBaseline: CvData,
  store: CvStoreApi,
): Promise<{ deleted: boolean; restored?: CvData }> {
  const isNewSession = isNewCvEditingSession(cvId);

  if (isNewSession || !store.syncedIds.has(cvId)) {
    clearCvEditingSession(cvId);
    if (store.syncedIds.has(cvId)) {
      await store.remove(cvId, { silent: true });
    } else {
      useCvStore.setState({
        items: useCvStore.getState().items.filter((item) => item.id !== cvId),
      });
    }
    return { deleted: true };
  }

  const restored = await store.upsert(sessionBaseline, true);
  return { deleted: false, restored };
}

export function acknowledgeCvEditingSession(cvId: string) {
  clearCvEditingSession(cvId);
}
