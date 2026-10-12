import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/platform/navigation";
import type { CvData } from "@/lib/cvTypes";
import {
  cvFingerprint,
  isLeavingCvEditor,
  isNewCvEditingSession,
  type CvEntryOrigin,
} from "@/lib/cvEditorSession";
import { acknowledgeCvEditingSession } from "@/lib/cvEditorExitActions";

export type CvExitAction = "finalize" | "draft" | "discard";

type NavigateMethod = "push" | "replace";

const EXIT_TO_CV_HREF = "/cv";
const EXIT_TO_ANALYSE_HREF = "/analyse";

type Options = {
  cvId?: string;
  currentCv: CvData | null;
  sessionBaseline: CvData | null;
  saveState: "dirty" | "saving" | "saved";
  enabled: boolean;
  entryOrigin?: CvEntryOrigin | null;
  onFinalize: (cv: CvData) => Promise<void>;
  onSaveDraft: (cv: CvData) => Promise<void>;
  onDiscard: () => Promise<void>;
};

export function useCvEditorExitGuard({
  cvId,
  currentCv,
  sessionBaseline,
  saveState,
  enabled,
  entryOrigin = null,
  onFinalize,
  onSaveDraft,
  onDiscard,
}: Options) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState<CvExitAction | null>(null);
  const pendingNavigationRef = useRef<{ href: string; method: NavigateMethod } | null>(null);
  const allowLeaveRef = useRef(false);

  const hasChanges = useMemo(() => {
    if (!enabled || !currentCv || !sessionBaseline) return false;
    if (saveState === "dirty" || saveState === "saving") return true;
    return cvFingerprint(currentCv) !== cvFingerprint(sessionBaseline);
  }, [currentCv, enabled, saveState, sessionBaseline]);

  const navigateAway = useCallback(
    (href: string, method: NavigateMethod = "push") => {
      allowLeaveRef.current = true;
      if (method === "replace") {
        router.replace(href);
        return;
      }
      router.push(href);
    },
    [router],
  );

  const requestExit = useCallback(
    (href: string, method: NavigateMethod = "push") => {
      if (!enabled || !cvId || !currentCv) {
        navigateAway(href, method);
        return;
      }

      if (allowLeaveRef.current || !isLeavingCvEditor(href, cvId) || !hasChanges) {
        if (
          entryOrigin === "analyse" &&
          isNewCvEditingSession(cvId) &&
          !hasChanges
        ) {
          void onDiscard()
            .catch(() => undefined)
            .finally(() => {
              acknowledgeCvEditingSession(cvId);
              navigateAway(href, method);
            });
          return;
        }

        if (cvId && !hasChanges) {
          acknowledgeCvEditingSession(cvId);
        }
        navigateAway(href, method);
        return;
      }

      pendingNavigationRef.current = { href, method };
      setOpen(true);
    },
    [cvId, currentCv, enabled, entryOrigin, hasChanges, navigateAway, onDiscard],
  );

  const cancelExit = useCallback(() => {
    if (acting) return;
    pendingNavigationRef.current = null;
    setOpen(false);
  }, [acting]);

  const confirmExit = useCallback(
    async (action: CvExitAction) => {
      if (!currentCv || acting) return;
      const pending = pendingNavigationRef.current;
      if (!pending) return;

      setActing(action);
      try {
        if (action === "finalize") await onFinalize(currentCv);
        if (action === "draft") await onSaveDraft(currentCv);
        if (action === "discard") await onDiscard();

        if (cvId) acknowledgeCvEditingSession(cvId);
        setOpen(false);
        pendingNavigationRef.current = null;
        const fallback =
          entryOrigin === "analyse" ? EXIT_TO_ANALYSE_HREF : EXIT_TO_CV_HREF;
        navigateAway(pending.href || fallback, pending.method);
      } finally {
        setActing(null);
      }
    },
    [acting, currentCv, entryOrigin, navigateAway, onDiscard, onFinalize, onSaveDraft, cvId],
  );

  useEffect(() => {
    allowLeaveRef.current = false;
  }, [cvId]);

  useEffect(() => {
    if (!enabled || !cvId || !hasChanges) return;

    const onClick = (event: MouseEvent) => {
      if (allowLeaveRef.current || acting) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      if (!isLeavingCvEditor(href, cvId)) return;

      event.preventDefault();
      event.stopPropagation();
      requestExit(href);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [acting, cvId, enabled, hasChanges, requestExit]);

  useEffect(() => {
    if (!enabled || !hasChanges) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled, hasChanges]);

  return {
    open,
    acting,
    hasChanges,
    entryOrigin,
    requestExit,
    cancelExit,
    confirmExit,
  };
}
