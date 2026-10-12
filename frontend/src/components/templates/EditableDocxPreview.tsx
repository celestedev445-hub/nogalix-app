import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  importHtmlStorageKey,
  readImportEditedHtml,
  storeImportEditedHtml,
  type ImportHtmlVariant,
} from "@/lib/importEditedContent";
import { cn } from "@/lib/utils";

export function EditableDocxPreview({
  cvId,
  file,
  className,
  htmlVariant = "docx",
  onContentChange,
}: {
  cvId: string;
  file: File;
  className?: string;
  htmlVariant?: ImportHtmlVariant;
  onContentChange?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onContentChangeRef = useRef(onContentChange);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const storageKey = importHtmlStorageKey(cvId, htmlVariant);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current;
    if (!node) return;

    setLoading(true);
    setError(false);

    const handleInput = () => {
      storeImportEditedHtml(storageKey, node.innerHTML);
      onContentChangeRef.current?.();
    };

    void (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        if (cancelled) return;
        node.innerHTML = "";
        const buffer = await file.arrayBuffer();
        await renderAsync(buffer, node, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });
        if (cancelled) return;

        const saved = readImportEditedHtml(storageKey);
        if (saved) node.innerHTML = saved;

        node.contentEditable = "true";
        node.spellcheck = true;
        node.classList.add("outline-none", "focus:ring-2", "focus:ring-principale/20");
        node.addEventListener("input", handleInput);
        node.addEventListener("paste", (event) => {
          event.preventDefault();
          const text = event.clipboardData?.getData("text/plain") ?? "";
          document.execCommand("insertText", false, text);
        });
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      node.removeEventListener("input", handleInput);
    };
  }, [cvId, file, storageKey]);

  if (error) {
    return (
      <div
        className={cn(
          "flex min-h-[842px] items-center justify-center bg-white p-8 text-sm text-navy/50",
          className,
        )}
      >
        Impossible d&apos;afficher ce fichier Word.
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-[842px] w-full bg-white", className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white text-sm text-navy/45">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement du document…
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={cn(
          "min-h-[842px] w-full overflow-x-auto bg-white [&_.docx-wrapper]:bg-white",
          loading && "invisible",
        )}
      />
    </div>
  );
}

export function ReadOnlyDocxPreview({
  file,
  className,
  onReady,
}: {
  file: File;
  className?: string;
  onReady?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current;
    if (!node) return;

    setLoading(true);
    setError(false);

    void (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        if (cancelled) return;
        node.innerHTML = "";
        const buffer = await file.arrayBuffer();
        await renderAsync(buffer, node, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });
        if (!cancelled) {
          setLoading(false);
          onReadyRef.current?.();
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  if (error) {
    return (
      <div
        className={cn(
          "flex min-h-[842px] items-center justify-center bg-white p-8 text-sm text-navy/50",
          className,
        )}
      >
        Impossible d&apos;afficher ce fichier Word.
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-[842px] w-full bg-white", className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white text-sm text-navy/45">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement du document…
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={cn(
          "min-h-[842px] w-full overflow-x-auto bg-white [&_.docx-wrapper]:bg-white",
          loading && "invisible",
        )}
      />
    </div>
  );
}
