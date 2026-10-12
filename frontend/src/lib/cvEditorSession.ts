import type { CvData } from "@/lib/cvTypes";

export function cloneCv(cv: CvData): CvData {
  return JSON.parse(JSON.stringify(cv)) as CvData;
}

export function cvFingerprint(cv: CvData) {
  const { updatedAt, completion, ...rest } = cv;
  return JSON.stringify(rest);
}

export function isLeavingCvEditor(href: string, cvId: string) {
  try {
    const path = new URL(href, window.location.origin).pathname;
    return path !== `/cv/${cvId}`;
  } catch {
    return true;
  }
}

const NEW_CV_SESSION_PREFIX = "nogalix:cv:new-session:";
const ENTRY_ORIGIN_PREFIX = "nogalix:cv:entry-origin:";

export type CvEntryOrigin = "analyse" | "nouveau" | "liste";

export function markCvEntryOrigin(cvId: string, origin: CvEntryOrigin) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${ENTRY_ORIGIN_PREFIX}${cvId}`, origin);
}

export function readCvEntryOrigin(cvId: string): CvEntryOrigin | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${ENTRY_ORIGIN_PREFIX}${cvId}`);
  if (raw === "analyse" || raw === "nouveau" || raw === "liste") return raw;
  return null;
}

export function markNewCvEditingSession(cvId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${NEW_CV_SESSION_PREFIX}${cvId}`, "1");
}

export function isNewCvEditingSession(cvId: string) {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(`${NEW_CV_SESSION_PREFIX}${cvId}`) === "1";
}

export function clearCvEditingSession(cvId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${NEW_CV_SESSION_PREFIX}${cvId}`);
  sessionStorage.removeItem(`${ENTRY_ORIGIN_PREFIX}${cvId}`);
}
