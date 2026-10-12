import routeTable from "@/app/routes.json";

/** Préfixes nécessitant une session (partagés avec le serveur Python via routes.json). */
export const PROTECTED_PREFIXES: readonly string[] = routeTable.protectedPrefixes;

/** Pages réservées aux visiteurs non connectés (redirigées vers /dashboard sinon). */
export const GUEST_ONLY_PATHS: readonly string[] = routeTable.guestOnly;

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Chemin interne sûr (bloque les redirections ouvertes). */
export function isSafeInternalPath(value: string | null | undefined) {
  if (!value || typeof value !== "string") return false;
  const path = value.trim();
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  if (/[\0\r\n\\]/.test(path)) return false;
  return true;
}

export function loginUrlFor(pathWithSearch: string) {
  return isSafeInternalPath(pathWithSearch)
    ? `/auth/login?suivant=${encodeURIComponent(pathWithSearch)}`
    : "/auth/login";
}
