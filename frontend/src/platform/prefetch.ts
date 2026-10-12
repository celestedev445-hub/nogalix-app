/**
 * Préchargement des modules de page.
 * Le routeur enregistre son résolveur au démarrage ; les liens l'appellent
 * lorsqu'ils deviennent visibles, sans dépendance circulaire avec le routeur.
 */
type Prefetcher = (pathname: string) => void;

let prefetcher: Prefetcher | null = null;
const done = new Set<string>();

export function registerPrefetcher(fn: Prefetcher) {
  prefetcher = fn;
}

export function prefetchRoute(href: string) {
  if (!prefetcher || typeof window === "undefined") return;
  let pathname: string;
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    pathname = url.pathname;
  } catch {
    return;
  }
  if (done.has(pathname)) return;
  done.add(pathname);
  prefetcher(pathname);
}
