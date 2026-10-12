const PREVIOUS_KEY = "nogalix:nav:previous";
const CURRENT_KEY = "nogalix:nav:current";

export function recordNavigation(pathname: string) {
  if (typeof window === "undefined") return;
  const current = sessionStorage.getItem(CURRENT_KEY);
  if (current && current !== pathname) {
    sessionStorage.setItem(PREVIOUS_KEY, current);
  }
  sessionStorage.setItem(CURRENT_KEY, pathname);
}

export function getPreviousPath() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PREVIOUS_KEY);
}

export function getBackTarget(fallbackHref: string) {
  const previous = getPreviousPath();
  const current =
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "";
  if (previous && previous !== current) return previous;
  return fallbackHref;
}
