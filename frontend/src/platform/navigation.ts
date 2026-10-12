/**
 * Hooks de navigation (useRouter, usePathname, useSearchParams, useParams) au-dessus de React Router.
 */
import { useMemo } from "react";
import { useLocation, useNavigate, useParams as useRouterParams } from "react-router";
import { prefetchRoute } from "@/platform/prefetch";

export type NavigateOptions = {
  /** `false` : conserve la position de défilement. */
  scroll?: boolean;
};

export type AppRouter = {
  push: (href: string, options?: NavigateOptions) => void;
  replace: (href: string, options?: NavigateOptions) => void;
  back: () => void;
  forward: () => void;
  prefetch: (href: string) => void;
};

/** URL absolue : chemin interne si même origine, sinon URL complète (navigation du navigateur). */
function resolveAbsolute(href: string) {
  if (typeof window === "undefined") return null;
  if (!/^[a-z][a-z\d+\-.]*:|^\/\//i.test(href)) return null;
  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin
      ? { internal: true, href: `${url.pathname}${url.search}${url.hash}` }
      : { internal: false, href: url.href };
  } catch {
    return null;
  }
}

export function useRouter(): AppRouter {
  const navigate = useNavigate();
  return useMemo<AppRouter>(() => {
    const go = (href: string, replace: boolean, options?: NavigateOptions) => {
      const absolute = resolveAbsolute(href);
      if (absolute && !absolute.internal) {
        if (replace) window.location.replace(absolute.href);
        else window.location.assign(absolute.href);
        return;
      }
      void navigate(absolute?.href ?? href, { replace, preventScrollReset: options?.scroll === false });
    };
    return {
      push: (href, options) => go(href, false, options),
      replace: (href, options) => go(href, true, options),
      back: () => void navigate(-1),
      forward: () => void navigate(1),
      prefetch: (href) => prefetchRoute(href),
    };
  }, [navigate]);
}

export function usePathname() {
  return useLocation().pathname;
}

export type ReadonlyURLSearchParams = Omit<URLSearchParams, "append" | "delete" | "set" | "sort">;

export function useSearchParams(): ReadonlyURLSearchParams {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams<T extends Record<string, string | string[] | undefined> = Record<string, string>>() {
  return useRouterParams() as unknown as T;
}
