import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/platform/navigation";
import { ArrowRight, FileText, LayoutTemplate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { toast } from "@/hooks/use-toast";
import { emptyCv } from "@/lib/demoData";
import { storeAnalyseRewriteContext } from "@/lib/analyseRewriteSession";
import type { CvMatchAnalysis } from "@/lib/cvMatchAnalysis";
import type { CvData } from "@/lib/cvTypes";
import { templatesCatalog } from "@/lib/templatesCatalog";
import { markCvEntryOrigin, markNewCvEditingSession } from "@/lib/cvEditorSession";
import {
  buildImportSource,
  IMPORT_ORIGINAL_TEMPLATE_ID,
  storeImportMeta,
} from "@/lib/importedCv";
import { registerImportFile } from "@/lib/importPreviewStore";
import { appConfig } from "@/lib/appConfig";
import { uploadImportFile } from "@/services/importCv";
import { aiTrialsHint, canUseAi, canUseCapability, capabilityLimit, syncPlanCapabilities } from "@/lib/planCapabilities";
import { rewriteCvFromAnalyse } from "@/services/analyse";
import { useAuthStore } from "@/store/authStore";
import { useCvStore } from "@/store/cvStore";
import { cn } from "@/lib/utils";

type Step = "choice" | "template";

export type AnalyseRewriteSource = {
  sourceCv?: CvData | null;
  resumeText?: string;
  fileName?: string;
  importedFile?: File | null;
};

function templateName(id: string) {
  return templatesCatalog.find((item) => item.id === id)?.name ?? "Modèle";
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

export function AnalyseRewriteModal({
  open,
  onOpenChange,
  result,
  jobOffer,
  source,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: CvMatchAnalysis | null;
  jobOffer: string;
  source: AnalyseRewriteSource | null;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const items = useCvStore((s) => s.items);
  const upsert = useCvStore((s) => s.upsert);
  const canPremium = canUseCapability(user, "templates.premium");
  const cvLimit = capabilityLimit(user, "cv.max");

  const nogalixCv = useMemo(
    () => items.find((item) => item.id === source?.sourceCv?.id) ?? source?.sourceCv ?? null,
    [items, source?.sourceCv],
  );
  const importedFile = source?.importedFile ?? null;
  const isImported = Boolean(importedFile && source?.resumeText);

  const [step, setStep] = useState<Step>("choice");
  const [templateId, setTemplateId] = useState("atlas");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("choice");
      setTemplateId("atlas");
      setPending(false);
    }
  }, [open]);

  const rewriteContext = useMemo(
    () => ({
      jobOffer,
      jobTitle: result?.jobTitle,
      actions: result?.actions ?? [],
    }),
    [jobOffer, result],
  );

  function close() {
    onOpenChange(false);
  }

  function openNogalixEditor() {
    if (!nogalixCv?.id) return;
    storeAnalyseRewriteContext(nogalixCv.id, rewriteContext);
    markCvEntryOrigin(nogalixCv.id, "analyse");
    close();
    router.push(`/cv/${nogalixCv.id}`);
  }

  async function createFromImportedOriginalDesign() {
    if (!importedFile || pending) return;
    if (cvLimit !== null && cvLimit !== -1 && items.length >= cvLimit) {
      toast({
        title: "Limite de CV atteinte",
        description: `Votre plan autorise ${cvLimit} CV. Passez à Pro pour en créer davantage.`,
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }

    setPending(true);
    try {
      const importSource = buildImportSource(importedFile);
      const fileTitle = (source?.fileName || importedFile.name).replace(/\.[^.]+$/, "");
      const next = emptyCv({
        id: crypto.randomUUID(),
        templateId: IMPORT_ORIGINAL_TEMPLATE_ID,
        title: fileTitle,
        principal: false,
        editorStatus: "draft",
        importSource,
      });

      await upsert(next, true);
      await registerImportFile(next.id, importedFile);
      storeImportMeta(next.id, importSource);

      if (appConfig.onlyOfficeEnabled) {
        try {
          await withTimeout(
            uploadImportFile(next.id, importedFile),
            60_000,
            "Envoi du fichier trop long.",
          );
        } catch {
          toast({
            title: "Éditeur Word avancé indisponible",
            description: "Le CV est créé. L'aperçu local fonctionne ; OnlyOffice sera retenté à l'ouverture.",
            variant: "destructive",
          });
        }
      }
      markNewCvEditingSession(next.id);
      markCvEntryOrigin(next.id, "analyse");
      if (result) storeAnalyseRewriteContext(next.id, rewriteContext);
      close();
      router.push(`/cv/${next.id}`);
    } catch (error) {
      toast({
        title: "Import impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  async function keepOriginalDesign() {
    if (isImported) {
      await createFromImportedOriginalDesign();
      return;
    }
    openNogalixEditor();
  }

  async function createWithNewTemplate(nextTemplateId: string) {
    if (!result || pending) return;
    if (cvLimit !== null && cvLimit !== -1 && items.length >= cvLimit) {
      toast({
        title: "Limite de CV atteinte",
        description: `Votre plan autorise ${cvLimit} CV. Passez à Pro pour en créer davantage.`,
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }

    const selected = templatesCatalog.find((item) => item.id === nextTemplateId);
    if (selected?.premium && !canPremium) {
      toast({
        title: "Modèle réservé",
        description: "Ce modèle nécessite le plan Pro ou Premium.",
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }

    if (!canUseAi(user)) {
      toast({
        title: "Quota IA atteint",
        description: aiTrialsHint(user) || "Passez à un plan supérieur pour continuer.",
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }

    setPending(true);
    try {
      const rewritten = await rewriteCvFromAnalyse({
        jobOffer,
        templateId: nextTemplateId,
        cvId: nogalixCv?.id,
        resumeText: source?.resumeText,
        fileName: source?.fileName,
        jobTitle: result.jobTitle,
        actions: result.actions,
      });

      const payload = rewritten.payload;
      const base = nogalixCv ?? emptyCv({ templateId: nextTemplateId });
      const next = emptyCv({
        ...base,
        id: crypto.randomUUID(),
        principal: false,
        editorStatus: "draft",
        templateId: nextTemplateId,
        title: String(payload.title || `CV · ${result.jobTitle || "offre"}`),
        identity: {
          ...base.identity,
          ...(payload.identity as CvData["identity"] | undefined),
        },
        summary: String(payload.summary ?? base.summary),
        experiences: (payload.experiences as CvData["experiences"]) || base.experiences,
        education: (payload.education as CvData["education"]) || base.education,
        skills: (payload.skills as CvData["skills"]) || base.skills,
        languages: (payload.languages as CvData["languages"]) || base.languages,
        projects: (payload.projects as CvData["projects"]) || base.projects,
        certifications: (payload.certifications as CvData["certifications"]) || base.certifications,
        interests: (payload.interests as CvData["interests"]) || base.interests,
        references: (payload.references as CvData["references"]) || base.references,
      });

      await upsert(next, false);
      void syncPlanCapabilities();
      markNewCvEditingSession(next.id);
      markCvEntryOrigin(next.id, "analyse");
      storeAnalyseRewriteContext(next.id, rewriteContext);
      close();
      router.push(`/cv/${next.id}`);
    } catch (error) {
      toast({
        title: "Réécriture impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  const option1Label = isImported
    ? "Conserver le design de mon CV importé"
    : "Conserver le modèle de mon CV";
  const option1Hint = isImported
    ? "Votre fichier s'affiche tel quel. Modifiez le texte directement dans le document, sans formulaire par sections."
    : nogalixCv
      ? `Ouvrir votre CV avec le modèle « ${templateName(nogalixCv.templateId)} » et le modifier dans l'éditeur.`
      : "Disponible pour un CV déjà enregistré dans Nogalix.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-navy">
            {step === "choice" ? "Comment réécrire votre CV ?" : "Choisir un nouveau modèle"}
          </DialogTitle>
          <DialogDescription className="text-sm text-navy/60">
            {step === "choice"
              ? "Sélectionnez une option. L'offre reste votre référence, seul votre CV est modifié."
              : "Le modèle choisi sera pré rempli avec votre CV corrigé pour l'offre."}
          </DialogDescription>
        </DialogHeader>

        {step === "choice" ? (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={pending || (!isImported && !nogalixCv)}
              onClick={() => void keepOriginalDesign()}
              className={cn(
                "flex flex-col items-start rounded-xl border border-gris bg-[#F8FAFC] p-4 text-left transition-colors hover:border-principale/30 hover:bg-indigo-clair/30",
                (pending || (!isImported && !nogalixCv)) && "pointer-events-none opacity-60",
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-clair text-principale">
                <FileText className="h-5 w-5" />
              </span>
              <span className="mt-3 font-semibold text-navy">{option1Label}</span>
              <span className="mt-1 text-sm text-navy/55">{option1Hint}</span>
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setTemplateId(nogalixCv?.templateId ?? "atlas");
                setStep("template");
              }}
              className={cn(
                "flex flex-col items-start rounded-xl border border-gris bg-[#F8FAFC] p-4 text-left transition-colors hover:border-principale/30 hover:bg-indigo-clair/30",
                pending && "pointer-events-none opacity-60",
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-clair text-principale">
                <LayoutTemplate className="h-5 w-5" />
              </span>
              <span className="mt-3 font-semibold text-navy">Choisir un nouveau modèle</span>
              <span className="mt-1 text-sm text-navy/55">
                Sélectionnez une mise en page Nogalix. Votre CV sera pré rempli et corrigé pour l&apos;offre.
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <TemplateGallery selectedId={templateId} onSelect={setTemplateId} hideHeading />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                disabled={pending}
                onClick={() => setStep("choice")}
              >
                Retour
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={pending || !templateId}
                onClick={() => void createWithNewTemplate(templateId)}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {pending ? "Préparation du CV…" : "Créer le CV avec ce modèle"}
              </Button>
            </div>
          </div>
        )}

        {pending && step === "choice" ? (
          <div className="flex items-center gap-2 text-sm text-navy/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Préparation de votre CV…
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
