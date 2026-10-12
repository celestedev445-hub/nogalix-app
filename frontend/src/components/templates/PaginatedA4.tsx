import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const PAGE_W = 794;
export const PAGE_H = 1123;
const MAX_PAGES = 8;
const MIN_BLOCK = 56;

type PageWindow = { start: number };
type PagePlan = { pageCount: number; height: number; windows: PageWindow[] };

const EMPTY_PLAN: PagePlan = { pageCount: 1, height: PAGE_H, windows: [{ start: 0 }] };

const PackedDocument = forwardRef<HTMLDivElement, { className?: string; children: ReactNode }>(
  function PackedDocument({ className, children }, ref) {
    const innerRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
      const node = innerRef.current;
      if (node) collapseEmptySections(node);
    });

    return (
      <div
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={className}
      >
        {children}
      </div>
    );
  },
);

export function A4Page({
  className,
  pageClassName,
  children,
}: {
  className?: string;
  pageClassName?: string;
  children: ReactNode;
}) {
  return (
    <PaginatedA4 className={className} pageClassName={pageClassName}>
      {children}
    </PaginatedA4>
  );
}

function findAside(root: HTMLElement) {
  const direct = root.querySelector<HTMLElement>(":scope > aside");
  if (direct) return direct;
  return (
    Array.from(root.querySelectorAll<HTMLElement>("aside")).find(
      (el) => el.nextElementSibling instanceof HTMLElement,
    ) ?? null
  );
}

function mainColumn(root: HTMLElement) {
  const aside = findAside(root);
  if (aside?.nextElementSibling instanceof HTMLElement) return aside.nextElementSibling;
  return root;
}

const EMPTY_HINT =
  /^(votre accroche(?: apparaîtra ici)?\.?|intitulé du poste|titre du poste|entreprise|diplôme|établissement|école|compétence|français|décrivez|poste|description\.?|html,? css.*|html \/ css)$/i;

const SECTION_TITLE =
  /^(à propos|profil|expériences?|expérience professionnelle|formation|compétences?|langues?|centres d['’]intérêt|projets|certifications|références?|references?|contact)$/i;

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isPlaceholderText(text: string) {
  const value = compactText(text);
  if (value.length <= 1) return true;
  if (SECTION_TITLE.test(value)) return true;
  return EMPTY_HINT.test(value);
}

function hasRealContent(el: HTMLElement) {
  if (el.querySelector("[data-cv-keep]")) {
    const keepText = compactText(el.textContent || "");
    return Boolean(keepText.replace(SECTION_TITLE, "").trim());
  }
  const bits = Array.from(el.querySelectorAll("p, li, span, h1, h2, h3, h4"))
    .map((node) => compactText(node.textContent || ""))
    .filter((text) => text.length > 1);
  const real = bits.filter((text) => !isPlaceholderText(text));
  if (real.length > 0) return true;
  const own = compactText(el.textContent || "").replace(SECTION_TITLE, "").trim();
  return own.length > 1 && !isPlaceholderText(own);
}

function isSectionTitleNode(el: HTMLElement) {
  if (el.closest("[data-cv-keep]")) return false;
  if (el.hasAttribute("data-cv-heading")) return SECTION_TITLE.test(compactText(el.textContent || ""));
  if (/^H[1-6]$/.test(el.tagName)) return SECTION_TITLE.test(compactText(el.textContent || ""));
  if (el.tagName === "P") return SECTION_TITLE.test(compactText(el.textContent || ""));
  return false;
}

function collapseEmptySections(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-cv-section], section").forEach((el) => {
    if (el.querySelector("[data-cv-keep]")) return;
    if (!hasRealContent(el)) el.style.display = "none";
  });

  const titles = Array.from(root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p, [data-cv-heading]")).filter(
    (el) => isSectionTitleNode(el) && el.style.display !== "none",
  );

  for (const heading of titles) {
    const group: HTMLElement[] = [heading];
    let sibling = heading.nextElementSibling as HTMLElement | null;
    while (sibling && !isSectionTitleNode(sibling) && !sibling.matches("[data-cv-section], section")) {
      group.push(sibling);
      sibling = sibling.nextElementSibling as HTMLElement | null;
    }
    const leftover = compactText(group.map((node) => node.textContent || "").join(" ")).replace(SECTION_TITLE, "").trim();
    if (!leftover || isPlaceholderText(leftover) || group.slice(1).every((node) => !hasRealContent(node))) {
      group.forEach((node) => {
        node.style.display = "none";
      });
    }
  }
}

function documentHeight(root: HTMLElement) {
  return Math.ceil(
    Math.max(root.scrollHeight, root.offsetHeight, root.getBoundingClientRect().height, PAGE_H),
  );
}

function boxInRoot(el: HTMLElement, root: HTMLElement) {
  const rootBox = root.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  return {
    top: box.top - rootBox.top,
    bottom: box.bottom - rootBox.top,
  };
}

function breakItems(root: HTMLElement) {
  const column = mainColumn(root);
  const items: { top: number; bottom: number }[] = [];
  const seen = new Set<HTMLElement>();

  const add = (el: HTMLElement) => {
    if (seen.has(el) || !column.contains(el)) return;
    seen.add(el);
    const box = boxInRoot(el, root);
    if (box.bottom - box.top < 2) return;
    items.push(box);
  };

  column.querySelectorAll<HTMLElement>("[data-cv-keep]").forEach((el) => {
    const nested = el.parentElement?.closest("[data-cv-keep]");
    if (!nested || !column.contains(nested)) add(el);
  });
  column.querySelectorAll<HTMLElement>("[data-cv-section], section").forEach((el) => {
    if (el.querySelector("[data-cv-keep]")) return;
    add(el);
  });

  items.sort((a, b) => a.top - b.top);
  return items;
}

function lastLineBefore(root: HTMLElement, limit: number) {
  const column = mainColumn(root);
  const rootBox = root.getBoundingClientRect();
  let best: number | null = null;
  const walker = document.createTreeWalker(column, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.textContent?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.height < 2) continue;
        const bottom = rect.bottom - rootBox.top;
        if (bottom <= limit - 1) {
          best = best == null ? bottom : Math.max(best, bottom);
        }
      }
    }
    node = walker.nextNode();
  }
  return best == null ? null : Math.round(best + 3);
}

function planPages(root: HTMLElement): PagePlan {
  collapseEmptySections(root);
  const height = documentHeight(root);
  if (height <= PAGE_H + 1) {
    return { pageCount: 1, height, windows: [{ start: 0 }] };
  }

  const items = breakItems(root);
  const windows: PageWindow[] = [];
  let start = 0;

  while (start < height - 1 && windows.length < MAX_PAGES) {
    const idealEnd = start + PAGE_H;
    if (idealEnd >= height) {
      windows.push({ start });
      break;
    }

    const overflow = items.find((item) => item.top + 1 < idealEnd && item.bottom > idealEnd + 1);
    let nextStart = idealEnd;

    if (overflow) {
      const itemHeight = overflow.bottom - overflow.top;
      const roomBefore = overflow.top - start;
      if (itemHeight <= PAGE_H && roomBefore >= MIN_BLOCK) {
        nextStart = Math.round(overflow.top);
      } else {
        nextStart = lastLineBefore(root, idealEnd) ?? Math.round(overflow.top);
        if (nextStart <= start + MIN_BLOCK) nextStart = idealEnd;
      }
    }

    if (nextStart <= start) nextStart = start + PAGE_H;
    windows.push({ start });
    start = nextStart;
  }

  return { pageCount: windows.length, height, windows };
}

function samePlan(current: PagePlan, next: PagePlan) {
  if (
    current.pageCount !== next.pageCount ||
    current.height !== next.height ||
    current.windows.length !== next.windows.length
  ) {
    return false;
  }
  return current.windows.every((window, index) => window.start === next.windows[index]?.start);
}

export function PaginatedA4({
  className,
  pageClassName,
  children,
}: {
  className?: string;
  pageClassName?: string;
  children: ReactNode;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<PagePlan>(EMPTY_PLAN);

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    let cancelled = false;
    let frame = 0;

    const update = () => {
      if (cancelled) return;
      const next = planPages(node);
      setPlan((current) => (samePlan(current, next) ? current : next));
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    const resize = new ResizeObserver(schedule);
    resize.observe(node);
    const mutate = new MutationObserver(schedule);
    mutate.observe(node, { subtree: true, childList: true, characterData: true, attributes: true });
    const onLoad = () => schedule();
    node.querySelectorAll("img").forEach((image) => {
      if (!image.complete) image.addEventListener("load", onLoad);
    });
    void document.fonts?.ready.then(() => {
      if (!cancelled) update();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutate.disconnect();
      node.querySelectorAll("img").forEach((image) => image.removeEventListener("load", onLoad));
    };
  }, [children]);

  return (
    <div className="cv-a4-stack" data-cv-page-count={plan.pageCount}>
      <div className="cv-a4-measure" aria-hidden>
        <PackedDocument
          ref={measureRef}
          className={cn("cv-a4-document font-sans", pageClassName)}
        >
          {children}
        </PackedDocument>
      </div>
      {plan.windows.map((window, index) => (
        <article
          key={`${window.start}-${index}`}
          className={cn("cv-a4 bg-white", className)}
          data-cv-page={String(index + 1)}
        >
          <div className="cv-a4-page overflow-hidden bg-white font-sans">
            <div
              className="cv-a4-shift"
              style={{ top: -window.start, minHeight: plan.height }}
            >
              <PackedDocument className={cn("cv-a4-document", pageClassName)}>{children}</PackedDocument>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
