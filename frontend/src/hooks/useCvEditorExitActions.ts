import { useCallback } from "react";
import type { CvData } from "@/lib/cvTypes";
import {
  acknowledgeCvEditingSession,
  discardCvEditingSession,
} from "@/lib/cvEditorExitActions";
import { useCvStore } from "@/store/cvStore";
import { toast } from "@/hooks/use-toast";

type SaveState = "dirty" | "saving" | "saved";

export function useCvEditorExitActions({
  cvId,
  sessionBaseline,
  setDraft,
  setSaveState,
}: {
  cvId?: string;
  sessionBaseline: CvData | null;
  setDraft: (cv: CvData | null) => void;
  setSaveState?: (state: SaveState) => void;
}) {
  const upsert = useCvStore((s) => s.upsert);
  const remove = useCvStore((s) => s.remove);
  const syncedIds = useCvStore((s) => s.syncedIds);

  const saveRemote = useCallback(
    async (
      next: CvData,
      options?: {
        toastTitle?: string;
      },
    ) => {
      setSaveState?.("saving");
      try {
        const saved = await upsert(next, true);
        setDraft(saved);
        setSaveState?.("saved");
        if (options?.toastTitle) {
          toast({ title: options.toastTitle, variant: "success" });
        }
        return saved;
      } catch (error) {
        setSaveState?.("dirty");
        toast({
          title: "Enregistrement impossible",
          description: error instanceof Error ? error.message : "Vos modifications restent en local.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [setDraft, setSaveState, upsert],
  );

  const onFinalize = useCallback(
    async (cv: CvData) => {
      await saveRemote({ ...cv, editorStatus: "ready" }, { toastTitle: "CV finalisé et enregistré" });
      if (cvId) acknowledgeCvEditingSession(cvId);
    },
    [cvId, saveRemote],
  );

  const onSaveDraft = useCallback(
    async (cv: CvData) => {
      await saveRemote({ ...cv, editorStatus: "draft" }, { toastTitle: "CV enregistré en brouillon" });
      if (cvId) acknowledgeCvEditingSession(cvId);
    },
    [cvId, saveRemote],
  );

  const onDiscard = useCallback(async () => {
    if (!sessionBaseline || !cvId) return;
    const result = await discardCvEditingSession(cvId, sessionBaseline, {
      upsert,
      remove,
      syncedIds,
    });
    if (result.deleted) {
      setDraft(null);
      return;
    }
    if (result.restored) {
      setDraft(result.restored);
      setSaveState?.("saved");
    }
  }, [cvId, remove, sessionBaseline, setDraft, setSaveState, syncedIds, upsert]);

  return {
    onFinalize,
    onSaveDraft,
    onDiscard,
    saveRemote,
  };
}
