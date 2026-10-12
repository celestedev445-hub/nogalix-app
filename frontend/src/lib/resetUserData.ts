import { useCvStore } from "@/store/cvStore";
import { useDocumentStore } from "@/store/documentStore";
import { useNotificationStore } from "@/store/notificationsStore";
import { useSavedJobsStore } from "@/store/savedJobsStore";

/** Anciennes clés localStorage — seuls les modèles restent en dur côté code. */
const LEGACY_STORAGE_KEYS = [
  "nogalix-cvs",
  "nogalix-notifications",
  "nogalix-documents",
  "nogalix-saved-jobs",
  "nogalix-admin",
] as const;

export function purgeLegacyLocalData() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

export function resetUserDataStores() {
  useCvStore.getState().reset();
  useNotificationStore.getState().reset();
  useDocumentStore.getState().reset();
  useSavedJobsStore.getState().reset();
}
