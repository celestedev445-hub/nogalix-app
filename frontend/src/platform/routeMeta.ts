/**
 * Titres et balises SEO par route.
 * Le serveur Python injecte les mêmes balises dans la page initiale ;
 * ici on les met à jour lors des navigations côté client.
 */
import routeTable from "@/app/routes.json";
import { appConfig } from "@/lib/appConfig";

type RouteEntry = {
  path: string;
  module: string;
  title?: string;
  description?: string;
  ogPath?: string;
};

export const ROUTES: readonly RouteEntry[] = routeTable.routes;

function segments(path: string) {
  return path.split("/").filter(Boolean);
}

export function matchPattern(pattern: string, pathname: string) {
  const expected = segments(pattern);
  const actual = segments(pathname);
  if (expected.length !== actual.length) return false;
  return expected.every((part, i) => part.startsWith(":") || part === actual[i]);
}

export function findRoute(pathname: string) {
  // Les segments statiques l'emportent sur les paramètres (/cv/nouveau avant /cv/:id).
  const candidates = ROUTES.filter((route) => matchPattern(route.path, pathname));
  candidates.sort((a, b) => segments(a.path).filter((s) => s.startsWith(":")).length - segments(b.path).filter((s) => s.startsWith(":")).length);
  return candidates[0] ?? null;
}

function interpolate(value: string) {
  return value.split("{app}").join(appConfig.name);
}

export function routeMeta(pathname: string) {
  const route = findRoute(pathname);
  const name = appConfig.name;
  const rawTitle = route?.title ?? interpolate(routeTable.defaults.title);
  const title = `${interpolate(rawTitle)} · ${name}`;
  const description = interpolate(route?.description ?? routeTable.defaults.description);
  const url = appConfig.appUrl ? `${appConfig.appUrl.replace(/\/$/, "")}${route?.ogPath ?? ""}` : "";
  return { title, description, url, notFound: !route };
}

function setMeta(attr: "name" | "property", key: string, content: string | null) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content === null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  if (element.content !== content) element.content = content;
}

export function applyRouteMeta(pathname: string) {
  const meta = routeMeta(pathname);
  if (document.title !== meta.title) document.title = meta.title;
  setMeta("name", "description", meta.description);
  setMeta("property", "og:title", meta.title);
  setMeta("property", "og:description", meta.description);
  setMeta("property", "og:url", meta.url || null);
  setMeta("name", "twitter:title", meta.title);
  setMeta("name", "twitter:description", meta.description);
  setMeta("name", "robots", meta.notFound ? "noindex" : null);
}
