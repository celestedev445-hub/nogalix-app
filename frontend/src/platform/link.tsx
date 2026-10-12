/**
 * <Link> : navigation côté client via React Router,
 * préchargement du module de page lorsque le lien devient visible ou survolé.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type MutableRefObject,
  type Ref,
} from "react";
import { Link as RouterLink } from "react-router";
import { prefetchRoute } from "@/platform/prefetch";

type UrlObject = {
  pathname?: string;
  query?: Record<string, string | number | boolean | undefined>;
  hash?: string;
};

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | UrlObject;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null;
};

function formatHref(href: string | UrlObject) {
  if (typeof href === "string") return href;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(href.query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  const hash = href.hash ? (href.hash.startsWith("#") ? href.hash : `#${href.hash}`) : "";
  return `${href.pathname ?? ""}${search ? `?${search}` : ""}${hash}`;
}

function isExternal(href: string) {
  return /^[a-z][a-z\d+\-.]*:/i.test(href) || href.startsWith("//");
}

function scheduleIdle(callback: () => void) {
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  if (idle) idle(callback);
  else window.setTimeout(callback, 1);
}

function useMergedRef(forwarded: Ref<HTMLAnchorElement>, local: MutableRefObject<HTMLAnchorElement | null>) {
  return useCallback(
    (node: HTMLAnchorElement | null) => {
      local.current = node;
      if (typeof forwarded === "function") forwarded(node);
      else if (forwarded) (forwarded as MutableRefObject<HTMLAnchorElement | null>).current = node;
    },
    [forwarded, local],
  );
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, replace, scroll, prefetch, onMouseEnter, onTouchStart, ...rest },
  forwardedRef,
) {
  const target = formatHref(href);
  const external =
    isExternal(target) || Boolean(rest.download) || Boolean(rest.target && rest.target !== "_self");
  const localRef = useRef<HTMLAnchorElement | null>(null);
  const ref = useMergedRef(forwardedRef, localRef);
  const canPrefetch = !external && prefetch !== false && target.startsWith("/");

  useEffect(() => {
    const node = localRef.current;
    if (!canPrefetch || !node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          scheduleIdle(() => prefetchRoute(target));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canPrefetch, target]);

  if (external) {
    return <a ref={ref} href={target} onMouseEnter={onMouseEnter} onTouchStart={onTouchStart} {...rest} />;
  }

  return (
    <RouterLink
      ref={ref}
      to={target}
      replace={replace}
      preventScrollReset={scroll === false}
      onMouseEnter={(event) => {
        if (canPrefetch) prefetchRoute(target);
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        if (canPrefetch) prefetchRoute(target);
        onTouchStart?.(event);
      }}
      {...rest}
    />
  );
});

export default Link;
