/**
 * Arborescence des routes, partagée par le navigateur (router.tsx) et le pré-rendu (entry-server.tsx) :
 * racine (ClientRoot) → mise en page de groupe (vitrine, modules, admin) → [layout /cv] → page.
 * Titres, descriptions et routes protégées : voir routes.json (partagé avec le serveur Python).
 */
import { useContext, useLayoutEffect, useMemo, useRef, type ComponentType } from "react";
import {
  UNSAFE_DataRouterContext,
  Navigate,
  Outlet,
  isRouteErrorResponse,
  useLocation,
  useParams,
  useRouteError,
  type DataRouteMatch,
  type RouteObject,
} from "react-router";
import routeTable from "@/app/routes.json";
import { ClientRoot } from "@/app/ClientRoot";
import { ModulesShell } from "@/components/features/ModulesShell";
import { CvTemplateFonts } from "@/components/cv/CvTemplateFonts";
import { VitrineLayoutGate } from "@/components/vitrine/VitrineLayoutGate";
import { GUEST_ONLY_PATHS, isProtectedPath, loginUrlFor } from "@/lib/protectedRoutes";
import { useAuthStore } from "@/store/authStore";
import { applyRouteMeta } from "@/platform/routeMeta";
import { scrollToChangedSegment } from "@/platform/scroll";

type PageModule = { default: ComponentType };

const pageModules = import.meta.glob<PageModule>("../pages/**/*.tsx");

function pageLoader(modulePath: string) {
  const key = `../${modulePath.replace(/^src\//, "")}`;
  const load = pageModules[key];
  if (!load) throw new Error(`Module de page introuvable : ${modulePath}`);
  return load;
}

/** La page est recréée quand un segment dynamique change (/cv/1 → /cv/2). */
function keyedByParams(Page: ComponentType): ComponentType {
  function KeyedPage() {
    const params = useParams();
    return <Page key={JSON.stringify(params)} />;
  }
  return KeyedPage;
}

/** Chargeur du module de chaque page (préchargement au survol / à l'affichage des liens). */
export const routeLoaders = new Map<string, () => Promise<unknown>>();

function pageRoute(path: string, modulePath: string): RouteObject {
  const load = pageLoader(modulePath);
  routeLoaders.set(path, load);
  const dynamicSegment = path.includes(":");
  return {
    id: path,
    path,
    lazy: async () => {
      const mod = await load();
      return { Component: dynamicSegment ? keyedByParams(mod.default) : mod.default };
    },
  };
}

function VitrineLayout() {
  return (
    <VitrineLayoutGate>
      <Outlet />
    </VitrineLayoutGate>
  );
}

function ModulesLayout() {
  return (
    <ModulesShell>
      <Outlet />
    </ModulesShell>
  );
}

function CvLayout() {
  return (
    <CvTemplateFonts>
      <Outlet />
    </CvTemplateFonts>
  );
}

const vitrineRoutes: RouteObject[] = [];
const moduleRoutes: RouteObject[] = [];
const cvRoutes: RouteObject[] = [];
const adminRoutes: RouteObject[] = [];

for (const entry of routeTable.routes) {
  const route = pageRoute(entry.path, entry.module);
  if (entry.module.startsWith("src/pages/vitrine/")) vitrineRoutes.push(route);
  else if (entry.module.startsWith("src/pages/modules/cv/")) cvRoutes.push(route);
  else if (entry.module.startsWith("src/pages/modules/")) moduleRoutes.push(route);
  else if (entry.module.startsWith("src/pages/admin/")) adminRoutes.push(route);
  else throw new Error(`Groupe de route inconnu : ${entry.module}`);
}

const redirectRoutes: RouteObject[] = Object.entries(routeTable.redirects).map(([from, to]) => ({
  path: from,
  element: <Navigate to={to} replace />,
}));

/** Garde de navigation (le serveur fait de même au chargement). */
function guardRedirect(pathname: string, search: string) {
  const { hydrated, authenticated } = useAuthStore.getState();
  if (!hydrated) return null;
  if (isProtectedPath(pathname) && !authenticated) return loginUrlFor(`${pathname}${search || ""}`);
  if (GUEST_ONLY_PATHS.includes(pathname) && authenticated) return "/dashboard";
  return null;
}

function GuardedOutlet() {
  const location = useLocation();
  // Évalué une fois par navigation, pas à chaque changement d'état.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const redirect = useMemo(() => guardRedirect(location.pathname, location.search), [location.key]);
  if (redirect) return <Navigate to={redirect} replace />;
  return <Outlet />;
}

function segmentKeys(matches: DataRouteMatch[]) {
  return matches.map((match) => `${match.route.id}|${match.pathnameBase}`);
}

/** Titre / balises SEO et défilement après chaque navigation. */
function NavigationEffects() {
  const location = useLocation();
  const router = useContext(UNSAFE_DataRouterContext)?.router;
  const previous = useRef<{ keys: string[]; pathname: string; search: string } | null>(null);

  useLayoutEffect(() => {
    applyRouteMeta(location.pathname);
    if (!router) return;

    const state = router.state;
    const keys = segmentKeys(state.matches);
    const before = previous.current;
    previous.current = { keys, pathname: location.pathname, search: location.search };

    if (typeof state.restoreScrollPosition === "number") {
      window.scrollTo(0, state.restoreScrollPosition);
      return;
    }
    if (!before) {
      if (location.hash) scrollToChangedSegment(0, location.hash);
      return;
    }
    if (state.restoreScrollPosition === false || state.preventScrollReset) return;
    if (state.historyAction === "POP") return;

    if (before.pathname === location.pathname && before.search === location.search) {
      // Changement d'ancre seul.
      if (location.hash) scrollToChangedSegment(keys.length - 1, location.hash);
      return;
    }

    let depth = keys.findIndex((key, i) => before.keys[i] !== key);
    if (depth === -1) depth = keys.length - 1;
    scrollToChangedSegment(depth, location.hash);
  }, [location.key, location.pathname, location.search, location.hash]);

  return null;
}

function RootLayout() {
  return (
    <ClientRoot>
      <NavigationEffects />
      <GuardedOutlet />
    </ClientRoot>
  );
}

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    message,
  );
}

/** Erreur non gérée : écran d'erreur minimal. */
function RootErrorBoundary() {
  const error = useRouteError();

  if (isChunkLoadError(error) && typeof window !== "undefined") {
    // Nouvelle version déployée : les anciens fichiers n'existent plus → rechargement complet (une fois).
    const flag = "nogalix-chunk-reload";
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(flag) || 0);
    } catch {
      /* stockage indisponible */
    }
    if (Date.now() - last > 10_000) {
      try {
        sessionStorage.setItem(flag, String(Date.now()));
      } catch {
        /* stockage indisponible */
      }
      window.location.reload();
      return null;
    }
  }
  if (!isRouteErrorResponse(error)) console.error(error);

  const host = typeof window !== "undefined" ? window.location.hostname : "";
  return (
    <div
      style={{
        fontFamily:
          'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
        height: "100vh",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 400, lineHeight: "28px", margin: "0 8px" }}>
          Application error: a client-side exception has occurred while loading {host} (see the browser console for
          more information).
        </h2>
      </div>
    </div>
  );
}

const notFoundLoader = pageLoader("src/pages/not-found.tsx");
export const loadAdminLayout = () => import("@/app/layouts/AdminLayout");

export const appRoutes: RouteObject[] = [
  {
    id: "root",
    element: <RootLayout />,
    errorElement: <RootErrorBoundary />,
    HydrateFallback: () => null,
    children: [
      { id: "vitrine", element: <VitrineLayout />, children: vitrineRoutes },
      {
        id: "modules",
        element: <ModulesLayout />,
        children: [...moduleRoutes, { id: "cv-layout", element: <CvLayout />, children: cvRoutes }],
      },
      {
        id: "admin",
        lazy: async () => ({ Component: (await loadAdminLayout()).default }),
        children: adminRoutes,
      },
      ...redirectRoutes,
      {
        id: "not-found",
        path: "*",
        lazy: async () => ({ Component: (await notFoundLoader()).default }),
      },
    ],
  },
];
