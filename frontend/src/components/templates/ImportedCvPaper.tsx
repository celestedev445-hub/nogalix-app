import { useCallback, useEffect, useRef, useState } from "react";
import type { CvData } from "@/lib/cvTypes";
import {
  readImportEditedText,
  storeImportEditedText,
} from "@/lib/importEditedContent";
import {
  ensureImportFile,
  getImportBlobUrl,
  resolveImportFileKind,
  type ImportFileKind,
} from "@/lib/importPreviewStore";
import { resolveImportMeta } from "@/lib/importedCv";
import { cn } from "@/lib/utils";
import { EditableDocxPreview, ReadOnlyDocxPreview } from "@/components/templates/EditableDocxPreview";
import { OnlyOfficeImportEditor } from "@/components/templates/OnlyOfficeImportEditor";
import { PdfImportEditor } from "@/components/templates/PdfImportEditor";
import { appConfig } from "@/lib/appConfig";

type ImportedCvPaperProps = {
  cv: CvData;
  className?: string;
  editable?: boolean;
  onContentChange?: () => void;
  onChooseTemplate?: () => void;
};

function OriginalPdfPreview({ blobUrl, className }: { blobUrl: string; className?: string }) {
  return (
    <iframe
      src={blobUrl}
      title="CV importé"
      className={cn("block min-h-[842px] w-full border-0 bg-white", className)}
    />
  );
}

function OriginalImagePreview({
  blobUrl,
  fileName,
  className,
}: {
  blobUrl: string;
  fileName: string;
  className?: string;
}) {
  return (
    <div className={cn("min-h-[842px] w-full bg-white", className)}>
      <img src={blobUrl} alt={fileName} className="mx-auto block h-auto w-full" />
    </div>
  );
}

function EditableTextPreview({
  cvId,
  file,
  className,
  onContentChange,
}: {
  cvId: string;
  file: File;
  className?: string;
  onContentChange?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = readImportEditedText(cvId);
      const text = saved ?? (await file.text());
      if (cancelled || !ref.current) return;
      ref.current.textContent = text;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [cvId, file]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onInput={(event) => {
        storeImportEditedText(cvId, event.currentTarget.textContent || "");
        onContentChange?.();
      }}
      className={cn(
        "min-h-[842px] w-full whitespace-pre-wrap bg-white px-10 py-12 font-[Calibri,Arial,Helvetica,sans-serif] text-[12px] leading-relaxed text-black outline-none focus:ring-2 focus:ring-principale/20",
        !ready && "text-navy/40",
        className,
      )}
    />
  );
}

function ImportedFilePreview({
  kind,
  blobUrl,
  file,
  fileName,
  cv,
  editable,
  onContentChange,
  onChooseTemplate,
  className,
}: {
  kind: ImportFileKind;
  blobUrl: string;
  file: File;
  fileName: string;
  cv: CvData;
  editable?: boolean;
  onContentChange?: () => void;
  onChooseTemplate?: () => void;
  className?: string;
}) {
  const [onlyOfficeUnavailable, setOnlyOfficeUnavailable] = useState(false);
  // Référence stable : l'éditeur relance sa synchronisation quand ce rappel change.
  const markOnlyOfficeUnavailable = useCallback(() => setOnlyOfficeUnavailable(true), []);

  if ((kind === "pdf" || kind === "docx") && editable && appConfig.onlyOfficeEnabled && !onlyOfficeUnavailable) {
    return (
      <OnlyOfficeImportEditor
        cvId={cv.id}
        className={className}
        onContentChange={onContentChange}
        onUnavailable={markOnlyOfficeUnavailable}
      />
    );
  }

  if (kind === "pdf") {
    if (editable) {
      return (
        <PdfImportEditor
          cvId={cv.id}
          file={file}
          blobUrl={blobUrl}
          className={className}
          onContentChange={onContentChange}
          onChooseTemplate={onChooseTemplate}
        />
      );
    }
    return <OriginalPdfPreview blobUrl={blobUrl} className={className} />;
  }

  if (kind === "image") {
    return <OriginalImagePreview blobUrl={blobUrl} fileName={fileName} className={className} />;
  }

  if (kind === "docx") {
    if (editable) {
      return (
        <EditableDocxPreview
          cvId={cv.id}
          file={file}
          htmlVariant="docx"
          className={className}
          onContentChange={onContentChange}
        />
      );
    }
    return <ReadOnlyDocxPreview file={file} className={className} />;
  }

  if (kind === "text") {
    if (editable) {
      return (
        <EditableTextPreview
          cvId={cv.id}
          file={file}
          className={className}
          onContentChange={onContentChange}
        />
      );
    }
    return (
      <iframe
        src={blobUrl}
        title="CV importé"
        className={cn("min-h-[842px] w-full border-0 bg-white", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[842px] items-center justify-center bg-white p-8 text-sm text-navy/50",
        className,
      )}
    >
      Format non pris en charge pour l&apos;aperçu du fichier importé.
    </div>
  );
}

export function ImportedCvPaper({
  cv,
  className,
  editable = false,
  onContentChange,
  onChooseTemplate,
}: ImportedCvPaperProps) {
  const meta = resolveImportMeta(cv);
  const [file, setFile] = useState<File | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fileName = meta?.fileName ?? "CV importé";
  const mimeType = meta?.mimeType ?? "";
  const kind: ImportFileKind = resolveImportFileKind(fileName, mimeType);
  const fileMeta = meta ? { fileName, mimeType } : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void ensureImportFile(cv.id, fileMeta)
      .then((loaded) => {
        if (cancelled) return;
        setFile(loaded);
        setBlobUrl(getImportBlobUrl(cv.id));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFile(null);
        setBlobUrl(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cv.id, fileMeta?.fileName, fileMeta?.mimeType]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex min-h-[842px] items-center justify-center bg-white text-sm text-navy/45",
          className,
        )}
      >
        Chargement du fichier importé…
      </div>
    );
  }

  if (!file || !blobUrl) {
    return (
      <div
        className={cn(
          "flex min-h-[842px] items-center justify-center bg-white p-8 text-sm text-navy/50",
          className,
        )}
      >
        Fichier original introuvable. Repassez par l&apos;analyse pour réimporter votre CV.
      </div>
    );
  }

  return (
    <ImportedFilePreview
      kind={kind}
      blobUrl={blobUrl}
      file={file}
      fileName={fileName}
      cv={cv}
      editable={editable}
      onContentChange={onContentChange}
      onChooseTemplate={onChooseTemplate}
      className={className}
    />
  );
}
