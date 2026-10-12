import { useEffect, useMemo, useRef, useState } from "react";
import Image from "@/platform/image";
import { Check, FileImage, FileText, FileType2, Loader2, Lock, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CvPaper } from "@/components/templates/CvPaper";
import { toast } from "@/hooks/use-toast";
import { appConfig } from "@/lib/appConfig";
import type { CvData } from "@/lib/cvTypes";
import { cn } from "@/lib/utils";
import { exportCv, type CvExportFormat } from "@/lib/cvExport";
import { exportImportedCv, type ImportExportFormat } from "@/lib/importCvExport";
import { ensureImportFile, resolveImportFileKind } from "@/lib/importPreviewStore";
import { resolveImportMeta } from "@/lib/importedCv";
import { fullName } from "@/components/templates/shared";
import { canUseCapability } from "@/lib/planCapabilities";
import { PlanFeatureBadge } from "@/components/plan/PlanFeatureBadge";
import { useAuthStore } from "@/store/authStore";

type DownloadFormat = ImportExportFormat | CvExportFormat;

type FormatOption = {
  id: DownloadFormat;
  label: string;
  extension: string;
  description: string;
  icon: typeof FileText;
  recommended?: boolean;
  capability?: string;
};

export function DocumentDownloadModal({
  open,
  onOpenChange,
  cv,
  variant = "template",
  captureRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cv: CvData;
  variant?: "imported" | "template";
  captureRef?: React.RefObject<HTMLElement | null>;
}) {
  const user = useAuthStore((s) => s.user);
  const exportRootRef = useRef<HTMLDivElement>(null);
  const meta = variant === "imported" ? resolveImportMeta(cv) : null;
  const fileName = meta?.fileName ?? "CV importé";
  const kind = resolveImportFileKind(fileName, meta?.mimeType ?? "");
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [format, setFormat] = useState<DownloadFormat>("pdf");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open || variant !== "imported") return;
    void ensureImportFile(cv.id).then((file) => setOriginalFile(file));
  }, [cv.id, open, variant]);

  const formats = useMemo<FormatOption[]>(() => {
    if (variant === "template") {
      return [
        {
          id: "pdf",
          label: "PDF",
          extension: ".pdf",
          description: "Copie visuelle du CV, identique à l’aperçu.",
          icon: FileText,
          recommended: true,
        },
        {
          id: "word",
          label: "Word",
          extension: ".docx",
          description: "Document Word éditable : mise en page d’origine, texte modifiable.",
          icon: FileType2,
          capability: "export.word",
        },
        {
          id: "png",
          label: "Image PNG",
          extension: ".png",
          description: "Capture fidèle du modèle, idéale pour le partage visuel.",
          icon: FileImage,
        },
      ];
    }

    const base: FormatOption[] = [
      {
        id: "pdf",
        label: "PDF",
        extension: ".pdf",
        description: "Copie visuelle de l’édition, sans décalage.",
        icon: FileText,
        recommended: true,
      },
      {
        id: "word",
        label: "Word",
        extension: ".docx",
        description: "Conversion PDF→Word éditable (moteur pdf2docx).",
        icon: FileType2,
        capability: "export.word",
      },
      {
        id: "png",
        label: "Image PNG",
        extension: ".png",
        description: "Capture fidèle de l’aperçu actuel.",
        icon: FileImage,
      },
    ];

    if (kind === "text" || kind === "pdf" || kind === "docx") {
      base.push({
        id: "txt",
        label: "Texte",
        extension: ".txt",
        description: "Tout le texte du document, y compris vos modifications.",
        icon: FileText,
      });
    }

    if (originalFile) {
      base.push({
        id: "original",
        label: "Fichier original",
        extension: fileName.includes(".") ? `.${fileName.split(".").pop()}` : "",
        description: "Télécharger le fichier tel qu’importé, sans vos modifications.",
        icon: RotateCcw,
      });
    }

    return base;
  }, [fileName, kind, originalFile, variant]);

  const selected = formats.find((item) => item.id === format) ?? formats[0];
  const wordLocked = selected.capability ? !canUseCapability(user, selected.capability) : false;
  const SelectedIcon = selected.icon;

  async function handleDownload() {
    if (wordLocked) {
      toast({
        title: "Export Word indisponible",
        description: "Passez à un plan supérieur pour télécharger en Word.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      if (variant === "imported") {
        await exportImportedCv(selected.id as ImportExportFormat, cv, captureRef?.current ?? null, originalFile);
      } else {
        if (!exportRootRef.current) throw new Error("Aperçu indisponible pour l'export visuel.");
        await exportCv(selected.id as CvExportFormat, cv, exportRootRef.current);
      }
      toast({
        title: "Téléchargement prêt",
        description: `Votre CV a été exporté en ${selected.label}.`,
        variant: "success",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Export impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {variant === "template" ? (
        <div
          ref={exportRootRef}
          aria-hidden
          className="pointer-events-none fixed left-[-12000px] top-0 z-[-1] overflow-visible"
          style={{ width: 794 }}
        >
          <CvPaper cv={cv} className="cv-a4-export !min-h-0 rounded-none shadow-none" />
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-gris p-0 sm:max-w-xl [&>button]:text-white [&>button]:opacity-90 [&>button:hover]:opacity-100">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1B2A4A] to-[#3A5A97] px-6 pb-8 pt-6 text-white">
            <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            {variant === "template" ? (
              <div className="pointer-events-none absolute -bottom-12 left-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
            ) : null}
            <div className={cn("relative", variant === "template" && "flex items-start justify-between gap-4")}>
              <div>
                <Image
                  src={appConfig.logoSrc}
                  alt={appConfig.name}
                  width={140}
                  height={36}
                  className="h-8 w-auto object-contain brightness-0 invert"
                />
                <DialogTitle className="mt-4 font-display text-xl font-extrabold tracking-tight text-white">
                  {variant === "imported" ? "Télécharger votre CV importé" : "Télécharger votre CV"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/75">
                  {variant === "imported" ? `${cv.title} · modifications incluses` : `${fullName(cv)} · ${cv.title}`}
                </DialogDescription>
              </div>
              {variant === "template" ? (
                <div className="hidden shrink-0 sm:block">
                  <div className="rounded-xl border border-white/15 bg-white/10 p-2 shadow-lg backdrop-blur-sm">
                    <div className="h-[88px] w-[62px] overflow-hidden rounded-md bg-white">
                      <div className="origin-top-left scale-[0.078]">
                        <CvPaper cv={cv} className="cv-a4-export !min-h-0 rounded-none" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 p-6">
            <p className="text-sm text-navy/70">
              {variant === "imported"
                ? "Word et Texte reprennent tout le contenu éditable. PDF et PNG restent une copie visuelle."
                : "Choisissez le format. Word est un document éditable ; PDF et PNG restent visuels."}
            </p>

            <div className="grid gap-2">
              {formats.map((item) => {
                const locked = item.capability ? !canUseCapability(user, item.capability) : false;
                const active = format === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={exporting}
                    onClick={() => setFormat(item.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-[#3A5A97] bg-[#EEF2F8] ring-1 ring-[#3A5A97]/30"
                        : "border-gris bg-white hover:bg-[#F8FAFC]",
                      locked && "opacity-75",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-[#3A5A97] text-white" : "bg-[#F1F5F9] text-navy/70",
                      )}
                    >
                      {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-navy">
                          {item.label}
                          <span className="font-normal text-navy/50">{item.extension}</span>
                        </span>
                        {item.recommended ? (
                          <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#166534]">
                            Recommandé
                          </span>
                        ) : null}
                        {item.capability === "export.word" ? <PlanFeatureBadge plan="pro" compact /> : null}
                        {item.id === "pdf" ? <PlanFeatureBadge plan="gratuit" compact /> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-navy/60">{item.description}</span>
                    </span>
                    {active ? (
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3A5A97] text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-gris"
                disabled={exporting}
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={exporting || wordLocked}
                onClick={() => void handleDownload()}
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Préparation…
                  </>
                ) : (
                  <>
                    <SelectedIcon className="h-4 w-4" />
                    Télécharger {selected.extension}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
