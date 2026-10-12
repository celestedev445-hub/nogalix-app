import Link from "@/platform/link";
import { type RefObject, useState } from "react";
import { Check, Download, Eye, LayoutTemplate, Loader2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/BackButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CvModeSwitch } from "@/components/cv/CvModeSwitch";
import { CvTranslateControl } from "@/components/cv/CvTranslateControl";
import { ImportedCvPaper } from "@/components/templates/ImportedCvPaper";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import type { CvData } from "@/lib/cvTypes";
import { appConfig } from "@/lib/appConfig";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function ImportedCvEditorView({
  cv,
  cvId,
  items,
  backFallback,
  saveState,
  onSave,
  onDownload,
  onPreview,
  onSelectCv,
  onNavigateBack,
  onContentChange,
  onApplyTemplate,
  onTranslated,
  previewRef,
}: {
  cv: CvData;
  cvId?: string;
  items: CvData[];
  backFallback: string;
  saveState: "dirty" | "saving" | "saved";
  onSave: () => void;
  onDownload: () => void;
  onPreview: () => void;
  onSelectCv: (id: string) => void;
  onNavigateBack: (target: string) => void;
  onContentChange: () => void;
  onApplyTemplate: (templateId: string) => void | Promise<void>;
  onTranslated: (next: CvData) => void;
  previewRef?: RefObject<HTMLDivElement | null>;
}) {
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateId, setTemplateId] = useState("atlas");
  const [applying, setApplying] = useState(false);

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white", cardShadow)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-gris/70 px-4 py-3">
        <BackButton fallbackHref={backFallback} onNavigate={onNavigateBack} />
        <h2 className="font-display text-lg font-extrabold text-navy">Éditeur de CV</h2>
        <CvModeSwitch cvId={cv.id} />
        <Select value={cv.id} onValueChange={onSelectCv}>
          <SelectTrigger className="h-8 w-[min(100%,210px)] rounded-xl border-gris bg-[#F8FAFC] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 text-xs font-medium",
            saveState === "saved" && "text-succes",
            saveState === "dirty" && "text-amber-600",
            saveState === "saving" && "text-navy/55",
          )}
        >
          {saveState === "saving" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {saveState === "saving"
            ? "Enregistrement…"
            : saveState === "dirty"
              ? "Non enregistré"
              : "Enregistré"}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-gris bg-[#F8FAFC] shadow-none"
          onClick={onPreview}
        >
          <Eye />
          Aperçu
        </Button>
        <CvTranslateControl
          cv={cv}
          disabled={saveState === "saving" || applying}
          onTranslated={onTranslated}
        />
        <Button size="sm" className="rounded-xl" onClick={onDownload}>
          <Download />
          Télécharger
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-gris bg-[#F8FAFC] shadow-none">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Plus d&apos;actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSave}>Enregistrer</DropdownMenuItem>
            {cvId ? (
              <DropdownMenuItem onClick={() => onNavigateBack("/cv")}>Mes CV</DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href={`/cv/${cv.id}`}>Ouvrir l&apos;éditeur</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="border-b border-gris/50 bg-[#F8FAFC] px-4 py-2 text-xs text-navy/60">
        {appConfig.onlyOfficeEnabled
          ? "Éditeur Word intégré : votre PDF est converti en document éditable avec mise en forme, tableaux et styles."
          : "PDF : le design original est conservé. Cliquez sur « Éditer le contenu » puis sur le texte à corriger. Word (.docx) : édition directe."}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#ECEFF4] p-3 sm:p-4">
        <div
          ref={previewRef}
          data-import-export-root
          className="mx-auto w-full max-w-[1180px] bg-white shadow-sm"
        >
          <ImportedCvPaper
            cv={cv}
            editable
            onContentChange={onContentChange}
            onChooseTemplate={() => setTemplateOpen(true)}
          />
        </div>
      </div>

      <Dialog
        open={templateOpen}
        onOpenChange={(open) => {
          if (!applying) setTemplateOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-navy">
              Choisir un modèle
            </DialogTitle>
            <DialogDescription className="text-sm text-navy/60">
              Chaque section du modèle (identité, accroche, expérience, formation, compétences…)
              est pré-remplie avec les informations de votre CV importé.
            </DialogDescription>
          </DialogHeader>
          <TemplateGallery selectedId={templateId} onSelect={setTemplateId} hideHeading />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              disabled={applying}
              onClick={() => setTemplateOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={applying}
              onClick={() => {
                void (async () => {
                  setApplying(true);
                  try {
                    await onApplyTemplate(templateId);
                    setTemplateOpen(false);
                  } finally {
                    setApplying(false);
                  }
                })();
              }}
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" />}
              {applying ? "Préparation des sections…" : "Appliquer ce modèle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
