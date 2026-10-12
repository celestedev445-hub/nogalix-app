/**
 * Routeur du navigateur : préchargement des pages, positions de défilement,
 * et chargement des modules de la page affichée avant le premier rendu
 * (indispensable pour reprendre le HTML pré-rendu sans le redessiner).
 */
import { createBrowserRouter, matchRoutes } from "react-router";
import { appRoutes, loadAdminLayout, routeLoaders } from "@/app/routes";
import { registerPrefetcher } from "@/platform/prefetch";

/** Positions de défilement mémorisées par entrée d'historique (retour / avance, rechargement). */
const SCROLL_STORAGE_KEY = "nogalix-scroll-positions";

function readSavedPositions(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Charge les modules (lazy) des routes de l'URL courante, comme le pré-rendu l'a fait. */
async function resolveCurrentRoutes() {
  const matches = matchRoutes(appRoutes, window.location) ?? [];
  await Promise.all(
    matches
      .filter((match) => match.route.lazy)
      .map(async (match) => {
        const lazy = match.route.lazy as () => Promise<Record<string, unknown>>;
        const resolved = await lazy();
        Object.assign(match.route, { ...resolved, lazy: undefined });
      }),
  );
}

export async function createAppRouter() {
  await resolveCurrentRoutes();
  const router = createBrowserRouter(appRoutes);

  registerPrefetcher((pathname) => {
    for (const match of matchRoutes(router.routes, pathname) ?? []) {
      const id = match.route.id;
      const load = id === "admin" ? loadAdminLayout : id ? routeLoaders.get(id) : undefined;
      if (load) void load().catch(() => undefined);
    }
  });

  const savedPositions = readSavedPositions();
  window.history.scrollRestoration = "manual";
  router.enableScrollRestoration(savedPositions, () => window.scrollY, (location) => location.key);
  window.addEventListener("pagehide", () => {
    savedPositions[router.state.location.key] = window.scrollY;
    try {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(savedPositions));
    } catch {
      /* stockage indisponible */
    }
    window.history.scrollRestoration = "auto";
  });
  window.addEventListener("pageshow", () => {
    window.history.scrollRestoration = "manual";
  });

  return router;
}
