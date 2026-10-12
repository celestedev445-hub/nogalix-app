import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  buildEditablePdfFontFaceCss,
  type EditablePdfDocument,
  type EditablePdfSpan,
} from "@/lib/editablePdf";
import { cn } from "@/lib/utils";
import styles from "./ConvertedPdfEditor.module.css";

function baseTransform(span: EditablePdfSpan, scale: number) {
  const ascentPx = span.ascent * span.fontSize * scale;
  const parts = [`translateY(-${ascentPx}px)`];
  if (Math.abs(span.rotate) > 0.2) {
    parts.push(`rotate(${span.rotate}deg)`);
  }
  return parts.join(" ");
}

export function ReconstructedPdfPages({
  doc,
  className,
  onReady,
}: {
  doc: EditablePdfDocument;
  className?: string;
  onReady?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const [hostWidth, setHostWidth] = useState(0);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

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
    if (!doc.fonts.length) return;
    const style = document.createElement("style");
    style.setAttribute("data-nogalix-pdf-fonts", "convert");
    style.textContent = buildEditablePdfFontFaceCss(doc.fonts);
    document.head.append(style);
    return () => style.remove();
  }, [doc]);

  useEffect(() => {
    if (hostWidth <= 0) return;
    const node = hostRef.current;
    if (!node) return;
    let cancelled = false;
    const images = Array.from(node.querySelectorAll("img"));
    void Promise.all([
      document.fonts.ready,
      ...images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    ]).then(() => {
      if (!cancelled) onReadyRef.current?.();
    });
    return () => {
      cancelled = true;
    };
  }, [doc, hostWidth]);

  return (
    <div ref={hostRef} className={cn("relative min-w-0 w-full rounded-xl bg-white shadow-sm", className)}>
      {hostWidth <= 0 ? (
        <div className="flex min-h-[8rem] items-center justify-center bg-white/90 text-sm text-navy/55">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Reconstruction du document…
        </div>
      ) : (
        <div
          className={styles.stack}
          lang="fr"
          data-page-count={doc.pages.length}
          data-import-export-root=""
        >
          {doc.pages.map((page, pageIndex) => {
            const pageScale = hostWidth / page.width;
            return (
              <section
                key={`page-${pageIndex}`}
                className={styles.sheetFrame}
                data-pdf-page={String(pageIndex + 1)}
                style={{
                  width: page.width * pageScale,
                  height: page.height * pageScale,
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
                  const fontSize = span.fontSize * pageScale;
                  const rotated = Math.abs(span.rotate) > 0.2;
                  return (
                    <span
                      key={span.id}
                      className={styles.text}
                      contentEditable={false}
                      lang="fr"
                      style={{
                        left: span.left * pageScale,
                        top: span.top * pageScale,
                        fontSize,
                        fontFamily: span.fontFamily,
                        fontWeight: span.fontWeight,
                        fontStyle: span.fontStyle,
                        fontSynthesis: "weight style",
                        color: span.color,
                        backgroundColor: "transparent",
                        textDecoration: "none",
                        textDecorationThickness: "from-font",
                        textUnderlineOffset: "2px",
                        textAlign: "left",
                        textTransform: "none",
                        lineHeight: "1",
                        padding: 0,
                        whiteSpace: rotated ? "pre" : "pre",
                        transform: baseTransform(span, pageScale),
                        zIndex: 1,
                      }}
                    >
                      {span.text}
                    </span>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
