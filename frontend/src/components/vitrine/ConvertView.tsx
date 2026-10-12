import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "@/platform/navigation";
import { Check, FileImage, FileText, FileType2, FileUp, Loader2, Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { convertPdfToEditable } from "@/services/convert";
import { uploadImportFile } from "@/services/importCv";
import { exportReconstructedDocument, type ConvertExportFormat } from "@/lib/convertExport";
import {
  detectConvertKind,
  detectEditKind,
  isConvertKind,
  isEditFileKind,
  labelForEditKind,
  type EditFileKind,
} from "@/lib/convertFile";
import type { EditablePdfDocument } from "@/lib/editablePdf";
import { emptyCv } from "@/lib/demoData";
import {
  buildImportSource,
  IMPORT_ORIGINAL_TEMPLATE_ID,
  storeImportMeta,
} from "@/lib/importedCv";
import { registerImportFile } from "@/lib/importPreviewStore";
import { deleteImportFileFromDb, loadImportFileFromDb, saveImportFileToDb } from "@/lib/importFileStorage";
import { markCvEntryOrigin, markNewCvEditingSession } from "@/lib/cvEditorSession";
import { capabilityLimit } from "@/lib/planCapabilities";
import { cn } from "@/lib/utils";
import { appConfig } from "@/lib/appConfig";
import { ReadOnlyDocxPreview } from "@/components/templates/EditableDocxPreview";
import { ReconstructedPdfPages } from "@/components/templates/ReconstructedPdfPages";
import { useAuthStore } from "@/store/authStore";
import { useCvStore } from "@/store/cvStore";

const MAX_BYTES = 5 * 1024 * 1024;
const PENDING_CONVERT_ID = "__convert_pending__";
const PENDING_EDIT_ID = "__edit_pending__";
const ALLOWED_CONVERT = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf",
  ".docx",
];
const ALLOWED_EDIT = [...ALLOWED_CONVERT, "text/plain", ".txt"];

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

type FormatOption = {
  id: ConvertExportFormat;
  label: string;
  extension: string;
  description: string;
  icon: typeof FileText;
  recommended?: boolean;
};

function originalExtension(fileName: string) {
  const part = fileName.includes(".") ? fileName.split(".").pop() : "";
  return part ? `.${part}` : "";
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export function ConvertView({ intent = "convert" }: { intent?: "convert" | "edit" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const authenticated = useAuthStore((s) => s.authenticated);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const items = useCvStore((s) => s.items);
  const upsert = useCvStore((s) => s.upsert);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<EditFileKind | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState("");
  const [format, setFormat] = useState<ConvertExportFormat>("pdf");
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reconstructing, setReconstructing] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [editableDoc, setEditableDoc] = useState<EditablePdfDocument | null>(null);
  const isEdit = intent === "edit";
  const pendingId = isEdit ? PENDING_EDIT_ID : PENDING_CONVERT_ID;
  const resumeEdit = searchParams.get("editer") === "1" || searchParams.get("ouvrir") === "1";
  const acceptTypes = isEdit ? ALLOWED_EDIT : ALLOWED_CONVERT;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file || source !== "pdf" || isEdit) {
      setEditableDoc(null);
      setReconstructing(false);
      return;
    }

    let cancelled = false;
    setReconstructing(true);
    setPreviewReady(false);
    setEditableDoc(null);

    void convertPdfToEditable(file)
      .then((document) => {
        if (cancelled) return;
        setEditableDoc(document);
      })
      .catch((error) => {
        if (cancelled) return;
        toast({
          title: "Reconstruction impossible",
          description: error instanceof Error ? error.message : "Réessayez avec un autre PDF.",
          variant: "destructive",
        });
        setFile(null);
        setSource(null);
      })
      .finally(() => {
        if (!cancelled) setReconstructing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file, source, isEdit]);

  const formats = useMemo<FormatOption[]>(() => {
    const items: FormatOption[] = [
      {
        id: "pdf",
        label: "PDF",
        extension: ".pdf",
        description: "Export visuel de votre document, comme dans l’éditeur.",
        icon: FileText,
        recommended: true,
      },
      {
        id: "word",
        label: "Word",
        extension: ".docx",
        description:
          source === "docx"
            ? "Document Word, identique au fichier déposé."
            : "Conversion PDF→Word (pdf2docx), comme les convertisseurs en ligne.",
        icon: FileType2,
      },
      {
        id: "png",
        label: "Image PNG",
        extension: ".png",
        description: "Une image par page. Plusieurs pages = un dossier ZIP.",
        icon: FileImage,
      },
      {
        id: "txt",
        label: "Texte",
        extension: ".txt",
        description: "Tout le texte extractible du document.",
        icon: FileText,
      },
    ];

    if (file) {
      items.push({
        id: "original",
        label: "Fichier original",
        extension: originalExtension(file.name),
        description: "Télécharger le fichier tel que déposé, sans conversion.",
        icon: RotateCcw,
      });
    }

    return items;
  }, [file, source]);

  const selected = formats.find((item) => item.id === format) ?? formats[0];
  const SelectedIcon = selected.icon;

  const needsPreview =
    format !== "original" &&
    !(format === "txt" && source === "pdf" && Boolean(editableDoc)) &&
    format !== "word";

  async function takeFile(next: File | null) {
    if (!next) return;
    if (next.size > MAX_BYTES) {
      toast({
        title: "Fichier trop lourd",
        description: "La taille maximale est de 5 Mo.",
        variant: "destructive",
      });
      return;
    }

    const kind = isEdit ? await detectEditKind(next) : await detectConvertKind(next);
    if (kind === "doc") {
      toast({
        title: "Format .doc non supporté",
        description: "Enregistrez le fichier en .docx, puis réessayez.",
        variant: "destructive",
      });
      return;
    }
    if (!kind || (isEdit ? !isEditFileKind(kind) : !isConvertKind(kind))) {
      toast({
        title: "Type non reconnu",
        description: isEdit
          ? "Importez un PDF, un Word (.docx) ou un fichier texte."
          : "Importez un PDF ou un Word (.docx).",
        variant: "destructive",
      });
      return;
    }

    setPreviewReady(false);
    setEditableDoc(null);
    setTextPreview("");
    setFile(next);
    setSource(kind);
    setFormat("pdf");
    if (kind === "text") {
      try {
        setTextPreview((await next.text()).slice(0, 4000));
      } catch {
        setTextPreview("");
      }
    }
  }

  function clearFile() {
    setFile(null);
    setSource(null);
    setEditableDoc(null);
    setPreviewReady(false);
    setReconstructing(false);
    setTextPreview("");
    setFormat("pdf");
    setSheetOpen(false);
  }

  async function openInEditor(nextFile: File) {
    const cvLimit = capabilityLimit(user, "cv.max");
    if (cvLimit !== null && cvLimit !== -1 && items.length >= cvLimit) {
      toast({
        title: "Limite de CV atteinte",
        description: `Votre plan autorise ${cvLimit} CV. Passez à Pro pour en créer davantage.`,
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }

    setEditing(true);
    try {
      const importSource = buildImportSource(nextFile);
      const fileTitle = nextFile.name.replace(/\.[^.]+$/, "") || "CV importé";
      const next = emptyCv({
        id: crypto.randomUUID(),
        templateId: IMPORT_ORIGINAL_TEMPLATE_ID,
        title: fileTitle,
        principal: false,
        editorStatus: "draft",
        importSource,
      });

      try {
        await upsert(next, true);
      } catch {
        await upsert(next, false);
      }
      await registerImportFile(next.id, nextFile);
      storeImportMeta(next.id, importSource);

      if (appConfig.onlyOfficeEnabled) {
        try {
          await withTimeout(uploadImportFile(next.id, nextFile), 60_000, "Envoi du fichier trop long.");
        } catch {
          /* l’éditeur local suffit */
        }
      }

      markNewCvEditingSession(next.id);
      markCvEntryOrigin(next.id, "nouveau");
      router.push(`/cv/${next.id}`);
    } catch (error) {
      toast({
        title: "Ouverture impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setEditing(false);
    }
  }

  async function onEdit() {
    if (!file) {
      toast({ title: "Ajoutez un fichier", variant: "destructive" });
      return;
    }
    if (!authHydrated) return;
    if (!authenticated) {
      try {
        await saveImportFileToDb(pendingId, file);
      } catch {
        /* la connexion reprendra sans le fichier */
      }
      const nextPath = isEdit ? "/editer?ouvrir=1" : "/convertir?editer=1";
      router.push(`/auth/login?suivant=${encodeURIComponent(nextPath)}`);
      return;
    }
    await openInEditor(file);
  }

  useEffect(() => {
    if (!authHydrated || !authenticated || !resumeEdit || file) return;
    let cancelled = false;
    void (async () => {
      const stored = await loadImportFileFromDb(pendingId);
      if (cancelled) return;
      if (!stored) {
        toast({
          title: "Fichier introuvable",
          description: "Déposez à nouveau le document pour l’ouvrir dans l’éditeur.",
        });
        return;
      }
      await deleteImportFileFromDb(pendingId);
      await takeFile(stored);
      await openInEditor(stored);
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally run when returning from login with ?ouvrir=1 / ?editer=1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHydrated, authenticated, searchParams]);

  async function onConvert() {
    if (!file || !isConvertKind(source)) {
      toast({ title: "Ajoutez un fichier", variant: "destructive" });
      return;
    }

    if (needsPreview && (!previewRef.current || !previewReady)) {
      toast({
        title: "Aperçu en cours",
        description: "Attendez que le document soit reconstruit, comme dans l’éditeur.",
        variant: "destructive",
      });
      return;
    }

    setPending(true);
    try {
      await exportReconstructedDocument({
        format,
        fileName: file.name,
        file,
        kind: source,
        captureRoot: previewRef.current,
        editableDoc,
      });
      toast({
        title: "Téléchargement prêt",
        description: `Exporté en ${selected.label}.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Conversion impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  const busy =
    pending || editing || (needsPreview && (reconstructing || (Boolean(file) && !previewReady)));

  const previewBody = (mode: "thumb" | "sheet") => {
    if (!file || !source) {
      return (
        <div className="flex h-full items-center justify-center px-3 text-center text-xs text-navy/40">
          La miniature du document apparaîtra ici.
        </div>
      );
    }
    if (source === "pdf" && reconstructing) {
      return (
        <div className="flex h-full min-h-[10rem] items-center justify-center text-center text-xs text-navy/55">
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          Reconstruction…
        </div>
      );
    }
    if (isEdit && source === "pdf" && previewUrl) {
      return (
        <iframe
          src={`${previewUrl}#toolbar=0&navpanes=0`}
          title="Aperçu PDF"
          className="h-full min-h-[16rem] w-full border-0 bg-white"
        />
      );
    }
    if (isEdit && source === "text") {
      return (
        <pre className="whitespace-pre-wrap break-words p-2 text-[10px] leading-relaxed text-navy/70">
          {textPreview || "Fichier texte prêt à éditer."}
        </pre>
      );
    }
    if (source === "pdf" && editableDoc) {
      return (
        <ReconstructedPdfPages
          doc={editableDoc}
          className="rounded-md shadow-none"
          onReady={mode === "thumb" ? () => setPreviewReady(true) : undefined}
        />
      );
    }
    if (source === "docx") {
      return (
        <div
          data-import-export-root=""
          className={mode === "thumb" ? "origin-top [zoom:0.28]" : undefined}
        >
          <ReadOnlyDocxPreview
            file={file}
            className="min-h-0"
            onReady={mode === "thumb" ? () => setPreviewReady(true) : undefined}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-8">
      <div>
        <p className="text-sm font-medium text-principale">Outil gratuit</p>
        <h1 className="mt-1 font-display text-2xl font-bold title-logo sm:text-3xl">
          {isEdit ? "Éditer PDF, Word et texte" : "Convertir PDF et Word"}
        </h1>
        <p className="mt-2 text-sm text-navy/65">
          {isEdit
            ? `Déposez un PDF, un Word ou un fichier texte. L’édition est la même que dans ${appConfig.name} : mise en page conservée, texte modifiable, puis export.`
            : `Même reconstruction que l'éditeur ${appConfig.name}, et les mêmes formats de téléchargement : PDF, Word, PNG, texte ou fichier original. Sans compte.`}
        </p>
      </div>

      <div className={cn("rounded-xl bg-white p-5 md:p-6", cardShadow)}>
        <div className="grid items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void takeFile(event.dataTransfer.files[0] ?? null);
            }}
            className={cn(
              "flex h-[18rem] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gris bg-[#F8FAFC] px-4 text-center text-navy/55 transition-colors",
              dragging && "border-principale bg-indigo-clair/40",
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-clair text-principale">
              <FileUp className="h-6 w-6" />
            </span>
            {file && source ? (
              <>
                <span className="mt-3 max-w-full truncate px-2 font-semibold text-navy">{file.name}</span>
                <span className="text-xs text-navy/50">
                  {labelForEditKind(source)} détecté
                  {isEdit ? " · prêt à éditer" : ` · ${selected.label}${selected.extension}`}
                </span>
                <span className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  {isEdit ? null : (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 rounded-full px-2.5 text-xs"
                      disabled={editing || !authHydrated}
                      onClick={(event) => {
                        event.stopPropagation();
                        void onEdit();
                      }}
                    >
                      {editing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
                      Éditer
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded-full bg-white px-2.5 text-xs text-navy/60 shadow-none"
                    onClick={(event) => {
                      event.stopPropagation();
                      clearFile();
                    }}
                  >
                    <X className="h-3 w-3" />
                    Retirer
                  </Button>
                </span>
              </>
            ) : (
              <>
                <span className="mt-3 font-semibold text-navy">Déposez un fichier</span>
                <span className="text-xs">
                  {isEdit ? "PDF, Word ou texte" : "PDF ou Word"} · le type est détecté tout seul · 5 Mo max
                </span>
              </>
            )}
          </div>

          <div
            ref={previewRef}
            role={file ? "button" : undefined}
            tabIndex={file ? 0 : undefined}
            onClick={() => {
              if (file) setSheetOpen(true);
            }}
            onKeyDown={(event) => {
              if (!file) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSheetOpen(true);
              }
            }}
            className={cn(
              "h-[18rem] min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-gris bg-[#ECEFF4] p-1.5",
              file ? "cursor-pointer" : "cursor-default",
            )}
          >
            {previewBody("thumb")}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={acceptTypes.join(",")}
          className="hidden"
          onChange={(event) => {
            void takeFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />

        {isEdit ? (
          <Button
            className="mt-5 h-11 w-full rounded-xl sm:w-auto sm:px-6"
            disabled={!file || editing || !authHydrated}
            onClick={() => void onEdit()}
          >
            {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            {editing ? "Ouverture…" : file ? "Ouvrir dans l’éditeur" : "Éditer le document"}
          </Button>
        ) : (
          <>
            <div className="mt-5 space-y-2">
              <p className="text-sm font-medium text-navy">Format de téléchargement</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {formats.map((item) => {
              const active = format === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={pending}
                  onClick={() => setFormat(item.id)}
                  className={cn(
                    "relative flex min-w-[7.25rem] flex-1 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors",
                    active
                      ? "border-[#3A5A97] bg-[#EEF2F8] ring-1 ring-[#3A5A97]/30"
                      : "border-gris bg-white hover:bg-[#F8FAFC]",
                  )}
                >
                  {active ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#3A5A97] text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      active ? "bg-[#3A5A97] text-white" : "bg-[#F1F5F9] text-navy/70",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-semibold leading-tight text-navy">
                    {item.label}
                    <span className="block font-normal text-navy/50">{item.extension}</span>
                  </span>
                  {item.recommended ? (
                    <span className="rounded-full bg-[#DCFCE7] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#166534]">
                      Recommandé
                    </span>
                  ) : (
                    <span className="h-[18px]" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-navy/60">{selected.description}</p>
            </div>
            <Button
              className="mt-5 h-11 w-full rounded-xl sm:w-auto sm:px-6"
              disabled={busy || !file}
              onClick={() => void onConvert()}
            >
              {pending || (needsPreview && reconstructing) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SelectedIcon className="h-4 w-4" />
              )}
              {pending
                ? "Conversion…"
                : needsPreview && reconstructing
                  ? "Reconstruction…"
                  : file
                    ? `Télécharger ${selected.extension}`
                    : "Convertir et télécharger"}
            </Button>
          </>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden border-gris p-0 sm:max-w-[36rem]"
        >
          <SheetHeader className="space-y-1 border-b border-gris px-5 py-4 pr-12 text-left">
            <SheetTitle className="font-display text-lg font-bold text-navy">
              Aperçu du document
            </SheetTitle>
            <SheetDescription className="truncate text-sm text-navy/60">
              {file?.name ?? "Document"}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#ECEFF4] p-3">{previewBody("sheet")}</div>
          <div className="border-t border-gris p-4">
            <Button className="w-full rounded-xl" disabled={!file || editing || !authHydrated} onClick={() => void onEdit()}>
              {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Éditer
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
