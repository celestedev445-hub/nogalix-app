import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  buildEditablePdfFontFaceCss,
  type EditablePdfDocument,
  type EditablePdfPage,
  type EditablePdfSpan,
} from "@/lib/editablePdf";
import {
  readImportConvertedPdfEdits,
  storeImportConvertedPdfEdits,
  storeImportEditedPdfPages,
  type PdfTextEdit,
} from "@/lib/importEditedContent";
import { ensureImportEditablePdf } from "@/lib/importPreviewStore";
import {
  computeFlowShifts,
  detectPageMargins,
  insertAtCaret,
  pageUsedHeight,
  readSpanText,
  recordsClose,
  wrapWidthForSpan,
} from "@/lib/pdfEditFlow";
import {
  applyFormatPatch,
  isBoldWeight,
  parseRgbToHex,
  pxToPt,
  type SpanFormatPatch,
  type SpanFormatState,
  type SpanStyleOverride,
} from "@/lib/pdfRichText";
import { cn } from "@/lib/utils";
import { PdfRichTextToolbar } from "@/components/templates/PdfRichTextToolbar";
import styles from "./ConvertedPdfEditor.module.css";

function baseTransform(
  span: EditablePdfSpan,
  scale: number,
  verticalAlign?: string,
  displaySize?: number,
) {
  const size = displaySize ?? span.fontSize * scale;
  let ascentPx = span.ascent * span.fontSize * scale;
  if (verticalAlign === "super") ascentPx += size * 0.45;
  if (verticalAlign === "sub") ascentPx -= size * 0.22;
  const parts = [`translateY(-${ascentPx}px)`];
  if (Math.abs(span.rotate) > 0.2) {
    parts.push(`rotate(${span.rotate}deg)`);
  }
  return parts.join(" ");
}

function overrideFromEdit(edit: PdfTextEdit): SpanStyleOverride {
  const size = Number.parseFloat(edit.fontSize || "");
  return {
    fontFamily: edit.fontFamily || undefined,
    fontSize: Number.isFinite(size) && size > 0 ? size : undefined,
    fontWeight: edit.fontWeight || undefined,
    fontStyle: edit.fontStyle || undefined,
    color: edit.color || undefined,
    backgroundColor: edit.backgroundColor || undefined,
    textDecoration: edit.textDecoration || undefined,
    textAlign: (edit.textAlign as SpanStyleOverride["textAlign"]) || undefined,
    textTransform: edit.textTransform || undefined,
    verticalAlign: edit.verticalAlign || undefined,
    lineHeight: edit.lineHeight || undefined,
  };
}

function formatStateFor(
  span: EditablePdfSpan,
  override: SpanStyleOverride | undefined,
): SpanFormatState {
  const fontSize = override?.fontSize ?? span.fontSize;
  const fontWeight = override?.fontWeight ?? span.fontWeight;
  const fontStyle = override?.fontStyle ?? span.fontStyle;
  return {
    fontFamily: (override?.fontFamily ?? span.fontFamily)
      .replace(/["']/g, "")
      .split(",")[0]
      .trim(),
    fontSizePt: pxToPt(fontSize),
    bold: isBoldWeight(fontWeight),
    italic: fontStyle === "italic",
    color: parseRgbToHex(override?.color ?? span.color),
    backgroundColor: override?.backgroundColor || "transparent",
    textDecoration: override?.textDecoration || "none",
    textAlign: override?.textAlign || "left",
    textTransform: override?.textTransform || "none",
    verticalAlign: override?.verticalAlign || "baseline",
    lineHeight: override?.lineHeight || "1",
  };
}

function pageLayout(page: EditablePdfPage) {
  const margins = detectPageMargins(page);
  const wrapWidths: Record<string, number> = {};
  for (const span of page.spans) {
    wrapWidths[span.id] = wrapWidthForSpan(span, page, margins);
  }
  return { margins, wrapWidths };
}

export function ConvertedPdfEditor({
  cvId,
  file,
  className,
  onContentChange,
  onError,
}: {
  cvId: string;
  file: File;
  className?: string;
  onContentChange?: () => void;
  onError?: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(new Set<string>());
  const overridesRef = useRef<Record<string, SpanStyleOverride>>({});
  const shiftsRef = useRef<Record<string, number>>({});
  const baselineRef = useRef<Record<string, number>>({});
  const onContentChangeRef = useRef(onContentChange);
  const onErrorRef = useRef(onError);
  const [doc, setDoc] = useState<EditablePdfDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostWidth, setHostWidth] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, SpanStyleOverride>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [shifts, setShifts] = useState<Record<string, number>>({});
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [flowing, setFlowing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    overridesRef.current = overrides;
  }, [overrides]);

  useEffect(() => {
    shiftsRef.current = shifts;
  }, [shifts]);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const measure = () => {
      const width = Math.round(node.getBoundingClientRect().width);
      if (width <= 0) return;
      setHostWidth((current) => (Math.abs(current - width) < 6 ? current : width));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = new Set();
    baselineRef.current = {};
    setShifts({});
    setHeights({});
    setFlowing({});
    setLoading(true);
    setError(null);
    void ensureImportEditablePdf(cvId, file)
      .then((converted) => {
        if (cancelled) return;
        const restored: Record<string, SpanStyleOverride> = {};
        const restoredFlow: Record<string, boolean> = {};
        readImportConvertedPdfEdits(cvId)?.forEach((pageEdits) => {
          pageEdits.forEach((edit) => {
            restored[edit.spanId] = overrideFromEdit(edit);
            if (edit.text) restoredFlow[edit.spanId] = true;
          });
        });
        setOverrides(restored);
        setFlowing(restoredFlow);
        setDoc(converted);
        setLoading(false);
        const spanCount = converted.pages.reduce((sum, page) => sum + page.spans.length, 0);
        if (spanCount === 0) {
          onErrorRef.current?.(
            "Ce PDF ne contient pas de texte sélectionnable. L'aperçu reste fidèle, mais l'édition n'est pas disponible.",
          );
        }
      })
      .catch((reason) => {
        if (cancelled) return;
        const message =
          reason instanceof Error ? reason.message : "Impossible de reconstruire ce PDF.";
        setError(message);
        setLoading(false);
        onErrorRef.current?.(message);
      });
    return () => {
      cancelled = true;
    };
  }, [cvId, file]);

  useEffect(() => {
    if (!doc?.fonts.length) return;
    const style = document.createElement("style");
    style.setAttribute("data-nogalix-pdf-fonts", cvId);
    style.textContent = buildEditablePdfFontFaceCss(doc.fonts);
    document.head.append(style);
    return () => style.remove();
  }, [cvId, doc]);

  const persist = useCallback(() => {
    const root = stackRef.current;
    if (!root || !doc) return;
    const currentOverrides = overridesRef.current;
    const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-page]"));
    const edits = pages.map((page) => {
      const pageEdits: PdfTextEdit[] = [];
      page.querySelectorAll<HTMLElement>("span[data-span-id]").forEach((node) => {
        const spanId = node.dataset.spanId;
        if (!spanId) return;
        const original = node.dataset.originalText ?? "";
        const text = readSpanText(node);
        const over = currentOverrides[spanId];
        if (text === original && !over) return;
        pageEdits.push({
          spanId,
          text,
          left: node.style.left,
          top: node.style.top,
          width: node.style.width,
          height: node.style.height,
          fontSize: over?.fontSize != null ? String(over.fontSize) : "",
          fontFamily: over?.fontFamily ?? "",
          fontWeight: over?.fontWeight ?? "",
          fontStyle: over?.fontStyle ?? "",
          lineHeight: over?.lineHeight ?? "",
          letterSpacing: "",
          transform: node.style.transform,
          transformOrigin: node.style.transformOrigin,
          color: over?.color,
          textDecoration: over?.textDecoration,
          textAlign: over?.textAlign,
          backgroundColor: over?.backgroundColor,
          textTransform: over?.textTransform,
          verticalAlign: over?.verticalAlign,
        });
      });
      return pageEdits;
    });
    storeImportConvertedPdfEdits(cvId, edits);
    storeImportEditedPdfPages(
      cvId,
      pages.map((page) => page.innerHTML),
    );
    queueMicrotask(() => onContentChangeRef.current?.());
  }, [cvId, doc]);

  const reflow = useCallback(() => {
    const root = stackRef.current;
    if (!root || !doc || hostWidth <= 0) return;
    const nextHeights: Record<string, number> = {};
    const nextShifts: Record<string, number> = {};

    doc.pages.forEach((page, pageIndex) => {
      const pageScale = hostWidth / page.width;
      const pageNode = root.querySelector<HTMLElement>(`[data-pdf-page="${pageIndex + 1}"]`);
      if (!pageNode) return;
      for (const span of page.spans) {
        const node = pageNode.querySelector<HTMLElement>(
          `span[data-span-id="${CSS.escape(span.id)}"]`,
        );
        if (!node) continue;
        const height = node.offsetHeight / pageScale;
        nextHeights[span.id] = height;
        if (baselineRef.current[span.id] == null) {
          const original = node.dataset.originalText ?? "";
          const text = readSpanText(node);
          baselineRef.current[span.id] =
            text === original ? height : Math.max(span.height, span.fontSize);
        }
      }
      Object.assign(nextShifts, computeFlowShifts(page, nextHeights, baselineRef.current));
    });

    setHeights((current) => (recordsClose(current, nextHeights) ? current : nextHeights));
    setShifts((current) => {
      if (recordsClose(current, nextShifts)) return current;
      shiftsRef.current = nextShifts;
      return nextShifts;
    });
  }, [doc, hostWidth]);

  useLayoutEffect(() => {
    if (!doc || hostWidth <= 0) return;
    reflow();
  }, [doc, hostWidth, overrides, reflow]);

  useEffect(() => {
    const root = stackRef.current;
    if (!root || !doc) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => reflow());
    };
    const observer = new ResizeObserver(schedule);
    root.querySelectorAll("span[data-span-id]").forEach((node) => observer.observe(node));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [doc, hostWidth, overrides, reflow]);

  const focusedSpan = useMemo(() => {
    if (!doc || !focusedId) return null;
    for (const page of doc.pages) {
      const span = page.spans.find((item) => item.id === focusedId);
      if (span) return span;
    }
    return null;
  }, [doc, focusedId]);

  const formatState = focusedSpan
    ? formatStateFor(focusedSpan, overrides[focusedSpan.id])
    : null;

  const applyPatch = (patch: SpanFormatPatch) => {
    if (!focusedId) return;
    const next = {
      ...overridesRef.current,
      [focusedId]: applyFormatPatch(overridesRef.current[focusedId] ?? {}, patch),
    };
    overridesRef.current = next;
    setOverrides(next);
    queueMicrotask(() => persist());
  };

  const resetStyle = () => {
    if (!focusedId) return;
    const next = { ...overridesRef.current };
    delete next[focusedId];
    overridesRef.current = next;
    setOverrides(next);
    queueMicrotask(() => persist());
  };

  const toggleBullet = () => {
    const root = stackRef.current;
    if (!root || !focusedId) return;
    const node = root.querySelector<HTMLElement>(
      `span[data-span-id="${CSS.escape(focusedId)}"]`,
    );
    if (!node) return;
    const text = readSpanText(node);
    node.textContent = text.startsWith("• ") ? text.slice(2) : `• ${text}`;
    persist();
    requestAnimationFrame(() => reflow());
  };

  const afterTextChange = () => {
    persist();
    requestAnimationFrame(() => reflow());
  };

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <PdfRichTextToolbar
        state={formatState}
        onChange={applyPatch}
        onReset={resetStyle}
        onToggleBullet={toggleBullet}
      />
      <div ref={hostRef} className="relative min-w-0 flex-1 rounded-xl bg-white shadow-sm">
        {loading || (!error && hostWidth <= 0) ? (
          <div className="absolute inset-0 z-10 flex min-h-[842px] items-center justify-center bg-white/90 text-sm text-navy/55">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Reconstruction du document…
          </div>
        ) : null}
        {error ? (
          <div className="flex min-h-[842px] items-center justify-center bg-white p-8 text-sm text-navy/50">
            {error}
          </div>
        ) : doc && hostWidth > 0 ? (
          <div
            ref={stackRef}
            className={styles.stack}
            lang="fr"
            data-page-count={doc.pages.length}
            data-import-export-root=""
          >
            {doc.pages.map((page, pageIndex) => {
              const pageScale = hostWidth > 0 ? hostWidth / page.width : 1;
              const { margins, wrapWidths } = pageLayout(page);
              const usedHeight = pageUsedHeight(page, shifts, heights, margins);
              const pageHeight = Math.max(page.height, usedHeight) * pageScale;
              return (
                <section
                  key={`page-${pageIndex}`}
                  className={styles.sheetFrame}
                  data-pdf-page={String(pageIndex + 1)}
                  style={{
                    width: page.width * pageScale,
                    height: pageHeight,
                    minHeight: page.height * pageScale,
                    position: "relative",
                  }}
                >
                  <img
                    src={page.background}
                    alt=""
                    className={styles.background}
                    draggable={false}
                    style={{ height: page.height * pageScale }}
                  />
                  {page.spans.map((span) => {
                    const over = overrides[span.id];
                    const fontSize = (over?.fontSize ?? span.fontSize) * pageScale;
                    const fontWeight = over?.fontWeight ?? span.fontWeight;
                    const aligned = Boolean(over?.textAlign && over.textAlign !== "left");
                    const highlighted =
                      Boolean(over?.backgroundColor) && over?.backgroundColor !== "transparent";
                    const superOrSub =
                      over?.verticalAlign === "super" || over?.verticalAlign === "sub";
                    const displaySize = superOrSub ? fontSize * 0.75 : fontSize;
                    const fontStyle = over?.fontStyle ?? span.fontStyle;
                    const wrapActive = Boolean(flowing[span.id] || focusedId === span.id);
                    const wrapWidth = (wrapWidths[span.id] ?? span.width) * pageScale;
                    const rotated = Math.abs(span.rotate) > 0.2;
                    const dy = shifts[span.id] ?? 0;
                    return (
                      <span
                        key={span.id}
                        className={styles.text}
                        data-span-id={span.id}
                        data-page-index={String(pageIndex)}
                        data-original-text={span.text}
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck
                        lang="fr"
                        style={{
                          left: span.left * pageScale,
                          top: (span.top + dy) * pageScale,
                          width: aligned ? wrapWidth : undefined,
                          maxWidth: wrapActive && !rotated ? wrapWidth : undefined,
                          display: wrapActive || aligned || highlighted ? "block" : undefined,
                          boxSizing: "border-box",
                          fontSize: displaySize,
                          fontFamily: over?.fontFamily ?? span.fontFamily,
                          fontWeight,
                          fontStyle,
                          fontSynthesis: "weight style",
                          color: over?.color ?? span.color,
                          backgroundColor: highlighted ? over.backgroundColor : "transparent",
                          textDecoration:
                            over?.textDecoration && over.textDecoration !== "none"
                              ? over.textDecoration
                              : "none",
                          textDecorationThickness: "from-font",
                          textUnderlineOffset: "2px",
                          textAlign: over?.textAlign ?? "left",
                          textTransform: over?.textTransform ?? "none",
                          lineHeight: over?.lineHeight ?? "1",
                          padding: highlighted ? "0 3px" : 0,
                          whiteSpace: rotated || !wrapActive ? "pre" : "pre-wrap",
                          transform: baseTransform(span, pageScale, over?.verticalAlign, displaySize),
                          zIndex: focusedId === span.id ? 3 : 1,
                        }}
                        ref={(node) => {
                          if (!node || hydratedRef.current.has(span.id)) return;
                          hydratedRef.current.add(span.id);
                          const saved = readImportConvertedPdfEdits(cvId)
                            ?.flat()
                            .find((edit) => edit.spanId === span.id);
                          node.textContent = saved?.text ?? span.text;
                        }}
                        onFocus={() => setFocusedId(span.id)}
                        onKeyDown={(event) => {
                          if (event.nativeEvent.isComposing || event.key === "Process") return;
                          if (event.key === "Enter") {
                            event.preventDefault();
                            insertAtCaret("\n");
                            afterTextChange();
                            return;
                          }
                          if (event.key === "Tab") {
                            event.preventDefault();
                            insertAtCaret("\t");
                            afterTextChange();
                          }
                        }}
                        onPaste={(event) => {
                          event.preventDefault();
                          const pasted = (event.clipboardData?.getData("text/plain") ?? "").replace(
                            /\r\n/g,
                            "\n",
                          );
                          insertAtCaret(pasted);
                          afterTextChange();
                        }}
                        onInput={(event) => {
                          persist();
                          const node = event.currentTarget;
                          const spanId = node.dataset.spanId;
                          if (!spanId) return;
                          const original = node.dataset.originalText ?? "";
                          const text = readSpanText(node);
                          const active = text !== original;
                          setFlowing((current) =>
                            current[spanId] === active ? current : { ...current, [spanId]: active },
                          );
                        }}
                        onBlur={persist}
                      />
                    );
                  })}
                </section>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
