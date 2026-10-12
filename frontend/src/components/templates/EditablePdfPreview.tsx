import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  readImportEditedPdfEdits,
  storeImportEditedPdfEdits,
  storeImportEditedPdfPages,
  type PdfTextEdit,
} from "@/lib/importEditedContent";
import {
  cloneCanvas,
  coverSpanGlyphs,
  restoreSpanRect,
  sampleSpanColor,
} from "@/lib/pdfCanvasEdit";
import { loadPdfJs } from "@/lib/pdfjsClient";
import { cn } from "@/lib/utils";
import styles from "./EditablePdfPreview.module.css";

type PageView = {
  pageNum: number;
  width: number;
  height: number;
  source: HTMLCanvasElement;
};

function collectEdits(root: HTMLElement): PdfTextEdit[][] {
  const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-page]"));
  return pages.map((page) => {
    const edits: PdfTextEdit[] = [];
    page.querySelectorAll<HTMLElement>("span[data-span-id][data-dirty='true']").forEach((span) => {
      const spanId = span.dataset.spanId;
      if (!spanId) return;
      edits.push({
        spanId,
        text: span.textContent ?? "",
        left: span.style.left,
        top: span.style.top,
        width: span.style.width,
        height: span.style.height,
        fontSize: span.style.fontSize,
        fontFamily: span.style.fontFamily,
        fontWeight: span.style.fontWeight,
        fontStyle: span.style.fontStyle,
        lineHeight: span.style.lineHeight,
        letterSpacing: span.style.letterSpacing,
        transform: span.style.transform,
        transformOrigin: span.style.transformOrigin,
      });
    });
    return edits;
  });
}

function applySpanVisual(span: HTMLElement, page: HTMLElement, source: HTMLCanvasElement, dirty: boolean) {
  const original = span.dataset.originalText ?? "";
  const canvas = page.querySelector("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  if (!dirty) {
    span.removeAttribute("data-dirty");
    span.style.color = "transparent";
    restoreSpanRect(canvas, source, span, page);
    return;
  }

  span.dataset.dirty = "true";
  const { color } = sampleSpanColor(source, span, page);
  span.style.color = color;
  coverSpanGlyphs(canvas, source, span, page, original);
}

function wireSpan(
  span: HTMLElement,
  page: HTMLElement,
  source: HTMLCanvasElement,
  editing: boolean,
  savedText: string | undefined,
  onPersist: () => void,
) {
  if (span.getAttribute("role") === "img") return;
  const original = span.dataset.originalText ?? span.textContent ?? "";
  span.dataset.originalText = original;
  span.spellcheck = false;
  span.contentEditable = editing ? "true" : "false";

  if (savedText !== undefined && savedText !== original) {
    span.textContent = savedText;
    applySpanVisual(span, page, source, true);
  } else {
    applySpanVisual(span, page, source, false);
  }

  span.onkeydown = (event) => {
    if (event.key === "Enter") event.preventDefault();
  };
  span.onpaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") ?? "";
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      span.textContent = `${span.textContent ?? ""}${text}`;
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };
  span.onfocus = () => {
    if (span.contentEditable !== "true") return;
    const canvas = page.querySelector("canvas");
    if (canvas instanceof HTMLCanvasElement) {
      coverSpanGlyphs(canvas, source, span, page, original, true);
    }
    const { color } = sampleSpanColor(source, span, page);
    span.style.color = color;
  };
  span.oninput = () => {
    const dirty = (span.textContent ?? "") !== original;
    applySpanVisual(span, page, source, dirty);
    onPersist();
  };
  span.onblur = () => {
    const dirty = (span.textContent ?? "") !== original;
    applySpanVisual(span, page, source, dirty);
    onPersist();
  };
}

export function EditablePdfPreview({
  cvId,
  file,
  className,
  editing = true,
  onContentChange,
  onError,
}: {
  cvId: string;
  file: File;
  className?: string;
  editing?: boolean;
  onContentChange?: () => void;
  onError?: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<PageView[]>([]);
  const onContentChangeRef = useRef(onContentChange);
  const onErrorRef = useRef(onError);
  const editingRef = useRef(editing);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostWidth, setHostWidth] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    editingRef.current = editing;
    const root = stackRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("span[data-span-id]").forEach((span) => {
      span.contentEditable = editing ? "true" : "false";
    });
  }, [editing]);

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

  const persist = useCallback(() => {
    const root = stackRef.current;
    if (!root) return;
    storeImportEditedPdfEdits(cvId, collectEdits(root));
    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-text-layer]"));
    storeImportEditedPdfPages(
      cvId,
      layers.map((layer) => layer.innerHTML),
    );
    queueMicrotask(() => onContentChangeRef.current?.());
  }, [cvId]);

  useEffect(() => {
    if (!hostWidth) return;
    let cancelled = false;
    let loadedPdf: { destroy: () => Promise<unknown> } | null = null;
    const stack = stackRef.current;
    if (!stack) return;

    void (async () => {
      setLoading(true);
      setError(null);
      stack.innerHTML = "";
      pagesRef.current = [];

      try {
        const pdfjs = await loadPdfJs();
        if (cancelled) return;

        const buffer = new Uint8Array(await file.arrayBuffer());
        // isEvalSupported: false — compatible CSP sans unsafe-eval en production.
        const pdf = await pdfjs.getDocument({ data: buffer, isEvalSupported: false }).promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }
        loadedPdf = pdf;

        const saved = readImportEditedPdfEdits(cvId);
        const savedById = new Map<string, string>();
        saved?.forEach((pageEdits) => {
          pageEdits.forEach((edit) => savedById.set(edit.spanId, edit.text));
        });

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let textSpans = 0;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const base = page.getViewport({ scale: 1 });
          const fitScale = hostWidth / base.width;
          const viewport = page.getViewport({ scale: fitScale });

          const sheet = document.createElement("div");
          sheet.className = styles.sheet;
          sheet.dataset.pdfPage = String(pageNum);

          const surface = document.createElement("div");
          surface.className = styles.surface;
          surface.style.width = `${viewport.width}px`;
          surface.style.height = `${viewport.height}px`;

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = styles.raster;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) throw new Error("Canvas indisponible.");

          await page.render({
            canvasContext: context,
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          }).promise;

          const source = cloneCanvas(canvas);
          pagesRef.current.push({ pageNum, width: viewport.width, height: viewport.height, source });

          const textLayer = document.createElement("div");
          textLayer.className = styles.textLayer;
          textLayer.dataset.pdfTextLayer = "";
          textLayer.style.width = `${viewport.width}px`;
          textLayer.style.height = `${viewport.height}px`;

          const textContent = await page.getTextContent();
          const layer = new pdfjs.TextLayer({
            textContentSource: textContent,
            container: textLayer,
            viewport,
          });
          await layer.render();

          const spans = Array.from(textLayer.querySelectorAll("span"));
          spans.forEach((node, index) => {
            if (!(node instanceof HTMLSpanElement)) return;
            node.dataset.spanId = `${pageNum}:${index}`;
            wireSpan(
              node,
              surface,
              source,
              editingRef.current,
              savedById.get(`${pageNum}:${index}`),
              persist,
            );
            textSpans += 1;
          });

          surface.append(canvas, textLayer);
          sheet.append(surface);
          stack.append(sheet);
        }

        if (cancelled) return;
        setPageCount(pdf.numPages);
        setLoading(false);
        if (textSpans === 0) {
          onErrorRef.current?.(
            "Ce PDF ne contient pas de texte sélectionnable. L'aperçu reste fidèle, mais l'édition n'est pas disponible.",
          );
        }
      } catch (reason) {
        if (cancelled) return;
        const message =
          reason instanceof Error ? reason.message : "Impossible d'afficher ce PDF.";
        setError(message);
        setLoading(false);
        onErrorRef.current?.(message);
      }
    })();

    return () => {
      cancelled = true;
      void loadedPdf?.destroy();
    };
  }, [cvId, file, hostWidth, persist]);

  return (
    <div ref={hostRef} className={cn("relative w-full", className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex min-h-[842px] items-center justify-center bg-white/90 text-sm text-navy/55">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement du document…
        </div>
      ) : null}
      {error ? (
        <div className="flex min-h-[842px] items-center justify-center bg-white p-8 text-sm text-navy/50">
          {error}
        </div>
      ) : (
        <div
          ref={stackRef}
          className={styles.stack}
          data-page-count={pageCount || undefined}
        />
      )}
    </div>
  );
}
