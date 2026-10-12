import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "@/platform/dynamic";
import Link from "@/platform/link";
import {
  AlignLeft,
  Award,
  BookUser,
  Briefcase,
  Check,
  Download,
  Eye,
  FolderKanban,
  GraduationCap,
  Heart,
  Languages,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Puzzle,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CvPaper } from "@/components/templates/CvPaper";
import { describeFilledSections, fillCvFromImportedDocument, recoverImportedPhoto } from "@/lib/applyImportedTemplate";
import { IMPORT_ORIGINAL_TEMPLATE_ID, resolveImportMeta } from "@/lib/importedCv";
import { templatesCatalog } from "@/lib/templatesCatalog";
import { ensureImportFile } from "@/lib/importPreviewStore";
import { toast } from "@/hooks/use-toast";
import { formatCvPeriod } from "@/lib/formatDate";
import type { CvData, CvSectionId, ExperienceItem } from "@/lib/cvTypes";
import { cn } from "@/lib/utils";
import { useCvStore } from "@/store/cvStore";
import { useInterfaceStore } from "@/store/interfaceStore";
import { CvModeSwitch } from "@/components/cv/CvModeSwitch";
import { ResizableColumns } from "@/components/ui/ResizableColumns";
import { ParallaxScrollColumn } from "@/components/ui/ParallaxScrollColumn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { BackButton } from "@/components/ui/BackButton";
import { CvExitEditorModal } from "@/components/cv/CvExitEditorModal";
import { ImportedCvEditorView } from "@/components/cv/ImportedCvEditorView";
import { CvTranslateControl } from "@/components/cv/CvTranslateControl";
import { getPreviousPath } from "@/lib/navigationHistory";
import { cloneCv, readCvEntryOrigin } from "@/lib/cvEditorSession";
import { acknowledgeCvEditingSession } from "@/lib/cvEditorExitActions";
import { preloadCvTemplates } from "@/lib/cvTemplateLoaders";
import { useCvEditorExitGuard } from "@/hooks/useCvEditorExitGuard";
import { useCvEditorExitActions } from "@/hooks/useCvEditorExitActions";
import { useMobile } from "@/hooks/use-mobile";

const DocumentDownloadModal = dynamic(
  () => import("@/components/cv/DocumentDownloadModal").then((m) => m.DocumentDownloadModal),
  { ssr: false },
);

const CvPreviewModal = dynamic(
  () => import("@/components/cv/CvPreviewModal").then((m) => m.CvPreviewModal),
  { ssr: false },
);

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const SECTION_COMPACT_PX = 136;

function useCompactWidth(threshold: number) {
  const ref = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const apply = (width: number) => setCompact(width < threshold);
    apply(node.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      apply(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, compact };
}

function SectionsRail({
  section,
  onSelect,
  onAddSection,
  compactThreshold,
  horizontal = false,
}: {
  section: WorkspaceSection;
  onSelect: (id: WorkspaceSection) => void;
  onAddSection: () => void;
  compactThreshold: number;
  horizontal?: boolean;
}) {
  const { ref, compact } = useCompactWidth(compactThreshold);

  if (horizontal) {
    return (
      <nav
        aria-label="Sections du CV"
        className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold",
                "touch-manipulation transition-colors duration-brand ease-brand",
                active ? "bg-indigo-clair text-navy" : "bg-[#F8FAFC] text-navy/60",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", active ? "text-principale" : "text-navy/40")} />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAddSection}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-indigo-clair px-3 text-[12px] font-semibold text-principale"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </nav>
    );
  }

  return (
    <ParallaxScrollColumn className="h-full" tone="nav" depth={0.05} contentClassName="pb-16">
      <nav ref={ref} className="min-h-0 min-w-0 pr-1" aria-label="Sections du CV">
        <p
          className={cn(
            "mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-navy/40",
            compact && "sr-only",
          )}
        >
          Sections
        </p>
        {sections.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          const button = (
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "page" : undefined}
              aria-label={compact ? item.label : undefined}
              className={cn(
                "mb-0.5 flex w-full items-center gap-2 rounded-xl py-2 text-left text-[13px] font-medium transition-colors duration-brand ease-brand",
                compact ? "justify-center px-0" : "px-2.5",
                active ? "bg-indigo-clair text-navy" : "text-navy/65 hover:bg-indigo-clair/70",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-principale" : "text-navy/45")} />
              <span className={cn(compact && "sr-only")}>{item.label}</span>
            </button>
          );
          if (!compact) return <div key={item.id}>{button}</div>;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent
                side="right"
                className="rounded-lg border-0 bg-navy px-2.5 py-1.5 text-[12px] font-medium text-white shadow-brand"
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {compact ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onAddSection}
                aria-label="Ajouter une section"
                className="mt-2 flex w-full items-center justify-center rounded-xl px-0 py-2 text-principale hover:bg-indigo-clair"
              >
                <Plus className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="rounded-lg border-0 bg-navy px-2.5 py-1.5 text-[12px] font-medium text-white shadow-brand"
            >
              Ajouter une section
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={onAddSection}
            className="mt-2 flex w-full items-center gap-1 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-principale hover:bg-indigo-clair"
          >
            <Plus className="h-4 w-4" />
            Ajouter une section
          </button>
        )}
      </nav>
    </ParallaxScrollColumn>
  );
}

type WorkspaceSection = CvSectionId;

const sections: { id: WorkspaceSection; label: string; icon: typeof User }[] = [
  { id: "identite", label: "Informations", icon: User },
  { id: "accroche", label: "Accroche", icon: AlignLeft },
  { id: "experience", label: "Expérience", icon: Briefcase },
  { id: "formation", label: "Formation", icon: GraduationCap },
  { id: "competences", label: "Compétences", icon: Puzzle },
  { id: "projets", label: "Projets", icon: FolderKanban },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "langues", label: "Langues", icon: Languages },
  { id: "interets", label: "Centres d'intérêt", icon: Heart },
  { id: "references", label: "Références", icon: BookUser },
];

const sectionTitles: Record<WorkspaceSection, string> = {
  identite: "Informations personnelles",
  accroche: "Accroche",
  experience: "Expérience professionnelle",
  formation: "Formation",
  competences: "Compétences",
  projets: "Projets",
  certifications: "Certifications",
  langues: "Langues",
  interets: "Centres d'intérêt",
  references: "Références",
};

export function CvWorkspace({ cvId }: { cvId?: string }) {
  const items = useCvStore((s) => s.items);
  const loaded = useCvStore((s) => s.loaded);
  const load = useCvStore((s) => s.load);
  const ensure = useCvStore((s) => s.ensure);
  const getById = useCvStore((s) => s.getById);
  const upsert = useCvStore((s) => s.upsert);
  const [selectedId, setSelectedId] = useState(cvId || items[0]?.id || "");
  const [draft, setDraft] = useState<CvData | null>(null);
  const [sessionBaseline, setSessionBaseline] = useState<CvData | null>(null);
  const baselineCvIdRef = useRef<string | null>(null);
  const [section, setSection] = useState<WorkspaceSection>("experience");
  const [editingExp, setEditingExp] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"dirty" | "saving" | "saved">("saved");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const importPreviewRef = useRef<HTMLDivElement>(null);
  const photoAttemptRef = useRef<string | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPersistRef = useRef<CvData | null>(null);
  const sectionsStacked = useMobile(1024);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!cvId) return;
    void ensure(cvId);
  }, [cvId, ensure]);

  useEffect(() => {
    if (!cvId) return;
    return () => {
      const state = useInterfaceStore.getState();
      if (state.cvVoiceCvId === cvId) {
        state.setCvVoiceCvId(null);
      }
    };
  }, [cvId]);

  const storeCv = useMemo(() => {
    if (cvId) return getById(cvId);
    return items.find((item) => item.id === selectedId) ?? items[0];
  }, [cvId, getById, items, selectedId]);

  const activeCv = draft ?? storeCv ?? null;
  const preview = useMemo(() => activeCv, [activeCv]);

  useEffect(() => {
    if (activeCv?.templateId) preloadCvTemplates([activeCv.templateId]);
  }, [activeCv?.templateId]);

  useEffect(() => {
    if (!cvId || activeCv?.templateId !== IMPORT_ORIGINAL_TEMPLATE_ID) return;
    const meta = resolveImportMeta(activeCv);
    void ensureImportFile(cvId, meta ? { fileName: meta.fileName, mimeType: meta.mimeType } : undefined);
  }, [activeCv, cvId]);

  useEffect(() => {
    if (!activeCv || activeCv.identity.photo) return;
    if (activeCv.templateId === IMPORT_ORIGINAL_TEMPLATE_ID) return;
    if (photoAttemptRef.current === activeCv.id) return;
    photoAttemptRef.current = activeCv.id;
    let cancelled = false;
    void recoverImportedPhoto(activeCv).then((photo) => {
      if (cancelled || !photo) return;
      patch({
        ...activeCv,
        identity: { ...activeCv.identity, photo },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeCv?.id, activeCv?.identity.photo, activeCv?.templateId]);

  useEffect(() => {
    if (cvId) {
      setSelectedId(cvId);
      return;
    }
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [cvId, items, selectedId]);

  useEffect(() => {
    if (!storeCv) return;
    setDraft((prev) => {
      if (!prev || prev.id !== storeCv.id) {
        setEditingExp(null);
        setSection(storeCv.experiences.length ? "experience" : "identite");
        setSaveState("saved");
        return storeCv;
      }
      const prevTime = Date.parse(prev.updatedAt || "");
      const storeTime = Date.parse(storeCv.updatedAt || "");
      if (Number.isFinite(storeTime) && storeTime >= prevTime) {
        setSaveState("saved");
        return storeCv;
      }
      return prev;
    });
  }, [storeCv, selectedId]);

  useEffect(() => {
    if (!cvId) return;
    if (readCvEntryOrigin(cvId) === "analyse") return;
    const previous = getPreviousPath();
    if (!previous) return;
    if (previous === "/cv/nouveau" || previous.startsWith("/cv/nouveau?")) return;
    acknowledgeCvEditingSession(cvId);
  }, [cvId]);

  useEffect(() => {
    if (!cvId || !storeCv) return;
    if (baselineCvIdRef.current !== cvId) {
      baselineCvIdRef.current = cvId;
      setSessionBaseline(cloneCv(storeCv));
      return;
    }
    setSessionBaseline((current) => current ?? cloneCv(storeCv));
  }, [cvId, storeCv]);

  function patch(next: CvData) {
    setDraft(next);
    setSaveState("dirty");
    pendingPersistRef.current = next;
    void upsert(next, false);
  }

  function cancelScheduledPersist() {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
  }

  async function persistNow(next: CvData, silent = false) {
    cancelScheduledPersist();
    pendingPersistRef.current = null;
    setSaveState("saving");
    try {
      const saved = await upsert(next, true);
      setDraft(saved);
      setSaveState("saved");
      if (!silent) {
        toast({ title: "CV enregistré", variant: "success" });
      }
    } catch (error) {
      pendingPersistRef.current = next;
      setSaveState("dirty");
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : "Vos modifications restent en local.",
        variant: "destructive",
      });
    }
  }

  function persist(next: CvData = activeCv!) {
    if (!next) return;
    void persistNow(next);
  }

  function persistSoon(next: CvData = activeCv!) {
    if (!next) return;
    pendingPersistRef.current = next;
    cancelScheduledPersist();
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      const payload = pendingPersistRef.current;
      if (payload) void persistNow(payload, true);
    }, 900);
  }

  const entryOrigin = cvId ? readCvEntryOrigin(cvId) : null;
  const backFallback = entryOrigin === "analyse" ? "/analyse" : "/cv";

  const exitActions = useCvEditorExitActions({
    cvId,
    sessionBaseline,
    setDraft,
    setSaveState,
  });

  const exitGuard = useCvEditorExitGuard({
    cvId,
    currentCv: activeCv,
    sessionBaseline,
    saveState,
    enabled: Boolean(cvId && activeCv),
    entryOrigin,
    onFinalize: async (cv) => {
      cancelScheduledPersist();
      pendingPersistRef.current = null;
      await exitActions.onFinalize(cv);
    },
    onSaveDraft: async (cv) => {
      cancelScheduledPersist();
      pendingPersistRef.current = null;
      await exitActions.onSaveDraft(cv);
    },
    onDiscard: async () => {
      cancelScheduledPersist();
      pendingPersistRef.current = null;
      await exitActions.onDiscard();
    },
  });

  function onSelectCv(id: string) {
    if (id === selectedId) return;
    if (cvId) {
      exitGuard.requestExit(`/cv/${id}`, "replace");
      return;
    }
    setSelectedId(id);
  }

  function openPreview() {
    setPreviewOpen(true);
  }

  if (cvId && !storeCv && !loaded) {
    return <BrandLoader fullPage size={72} label="Chargement de votre CV" />;
  }

  if (cvId && loaded && !storeCv) {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-3 rounded-xl bg-white p-8 text-center", cardShadow)}>
        <p>Ce CV est introuvable.</p>
        <BackButton fallbackHref="/cv" />
      </div>
    );
  }

  if (!activeCv || !preview) {
    return (
      <div className={cn("rounded-xl bg-white p-8 text-center", cardShadow)}>
        <p>Aucun CV à modifier pour le moment.</p>
        <Button className="mt-4 rounded-xl" asChild>
          <Link href="/cv/nouveau">Créer un CV</Link>
        </Button>
      </div>
    );
  }

  const cv = activeCv;
  const isImportedOriginal = cv.templateId === IMPORT_ORIGINAL_TEMPLATE_ID;

  if (isImportedOriginal) {
    return (
      <>
        <ImportedCvEditorView
          cv={cv}
          cvId={cvId}
          items={items}
          backFallback={backFallback}
          saveState={saveState}
          onSave={() => void persist()}
          onDownload={() => setDownloadOpen(true)}
          onPreview={() => setPreviewOpen(true)}
          onSelectCv={onSelectCv}
          onNavigateBack={(target) => exitGuard.requestExit(target)}
          onContentChange={() => setSaveState("dirty")}
          onApplyTemplate={async (templateId) => {
            const template = templatesCatalog.find((item) => item.id === templateId);
            try {
              const next = await fillCvFromImportedDocument(cv, templateId);
              const sections = describeFilledSections(next);
              patch(next);
              toast({
                title: "Modèle pré-rempli",
                description: sections.length
                  ? `L'IA a réparti le CV dans ${template?.name ? `« ${template.name} »` : "le modèle"} : ${sections.join(", ")}.`
                  : "Le modèle a été appliqué.",
                variant: "success",
              });
            } catch (error) {
              toast({
                title: "Pré-remplissage impossible",
                description:
                  error instanceof Error
                    ? error.message
                    : "L'IA n'a pas pu redistribuer le CV. Réessayez.",
                variant: "destructive",
              });
              throw error;
            }
          }}
          previewRef={importPreviewRef}
          onTranslated={(next) => patch(next)}
        />
        {downloadOpen ? (
          <DocumentDownloadModal
            variant="imported"
            open={downloadOpen}
            onOpenChange={setDownloadOpen}
            cv={cv}
            captureRef={importPreviewRef}
          />
        ) : null}
        {previewOpen ? (
          <CvPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} cv={cv} />
        ) : null}
        <CvExitEditorModal
          open={exitGuard.open}
          acting={exitGuard.acting}
          entryOrigin={exitGuard.entryOrigin}
          onOpenChange={(next) => {
            if (!next) exitGuard.cancelExit();
          }}
          onConfirm={(action) => void exitGuard.confirmExit(action)}
        />
      </>
    );
  }

  return (
    <>
    <div className="flex h-full min-h-0 flex-col print:block print:h-auto">
    <ResizableColumns
      className="h-full min-h-0 gap-0 print:block print:h-auto"
      defaultRatio={0.56}
      minStartPx={360}
      minEndPx={280}
      hideEndWhenStacked
      storageKey="nogalix-cv-editor-preview-split"
      start={
      <section className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white p-4 md:p-5 print:hidden", cardShadow)}>
        <div className="flex flex-wrap items-center gap-2">
          <BackButton fallbackHref={backFallback} onNavigate={(target) => exitGuard.requestExit(target)} />
          <h2 className="hidden font-display text-lg font-extrabold text-navy sm:block">Éditeur de CV</h2>
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
            onClick={() => openPreview()}
          >
            <Eye />
            Aperçu
          </Button>
          <CvTranslateControl
            cv={cv}
            disabled={saveState === "saving"}
            onTranslated={(next) => patch(next)}
          />
          <Button size="sm" className="rounded-xl" onClick={() => setDownloadOpen(true)}>
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
              <DropdownMenuItem onClick={() => void persist()}>Enregistrer</DropdownMenuItem>
              {cvId ? (
                <DropdownMenuItem onClick={() => exitGuard.requestExit("/cv")}>Mes CV</DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href={`/cv/${cv.id}`}>Ouvrir l&apos;éditeur</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="mt-2 hidden text-xs text-navy/55 sm:block print:hidden">
          Remplissez les champs ici, ou basculez en mode voix à tout moment. Le même CV est partagé.
        </p>

        <ResizableColumns
          className="mt-4 min-h-0 flex-1"
          defaultRatio={0.2}
          minStartPx={56}
          minEndPx={300}
          stackBelowPx={1024}
          startSizeWhenStacked="auto"
          storageKey="nogalix-cv-sections-split"
          start={
          <SectionsRail
            section={section}
            compactThreshold={SECTION_COMPACT_PX}
            horizontal={sectionsStacked}
            onSelect={setSection}
            onAddSection={() => {
              const empty = sections.find((item) => {
                if (item.id === "identite") return false;
                if (item.id === "accroche") return !cv.summary.trim();
                if (item.id === "experience") return cv.experiences.length === 0;
                if (item.id === "formation") return cv.education.length === 0;
                if (item.id === "competences") return cv.skills.length === 0;
                if (item.id === "projets") return cv.projects.length === 0;
                if (item.id === "certifications") return cv.certifications.length === 0;
                if (item.id === "langues") return cv.languages.length === 0;
                if (item.id === "interets") return !(cv.interests ?? []).length;
                if (item.id === "references") return !(cv.references ?? []).length;
                return false;
              });
              if (empty) {
                setSection(empty.id);
                return;
              }
              toast({
                title: "Toutes les sections sont déjà dans la liste",
                description: "Accroche, projets, certifications, centres d'intérêt et références sont disponibles ci-dessus.",
              });
            }}
          />
          }
          end={
          <ParallaxScrollColumn className="h-full" tone="form" depth={0.09} contentClassName="pr-1 pb-20">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-navy">{sectionTitles[section]}</h3>
              <MoreVertical className="h-4 w-4 text-navy/30" />
            </div>

            {section === "identite" ? (
              <IdentityForm draft={cv} patch={patch} onSave={() => void persist()} />
            ) : null}

            {section === "accroche" ? (
              <div className="space-y-3">
                <Label htmlFor="cv-summary">Présentez votre profil en quelques lignes</Label>
                <Textarea
                  id="cv-summary"
                  rows={6}
                  value={cv.summary}
                  onChange={(e) => patch({ ...cv, summary: e.target.value })}
                  onBlur={() => persistSoon()}
                />
              </div>
            ) : null}

            {section === "experience" ? (
              <ExperienceEditor
                draft={cv}
                patch={patch}
                persist={() => void persist()}
                editingExp={editingExp}
                setEditingExp={setEditingExp}
              />
            ) : null}

            {section === "formation" ? (
              <EditableListBlock
                emptyLabel="Aucune formation"
                addLabel="Ajouter une formation"
                items={cv.education}
                onSave={() => void persist()}
                renderSummary={(item) => ({
                  title: item.diploma,
                  subtitle: `${item.school} · ${item.year}`,
                })}
                renderEdit={(item, update) => (
                  <div className="grid gap-2">
                    <Input
                      placeholder="Diplôme"
                      value={item.diploma}
                      onChange={(e) => update({ diploma: e.target.value })}
                    />
                    <Input
                      placeholder="Établissement"
                      value={item.school}
                      onChange={(e) => update({ school: e.target.value })}
                    />
                    <Input
                      placeholder="Année"
                      value={item.year}
                      onChange={(e) => update({ year: e.target.value })}
                    />
                  </div>
                )}
                onAdd={() => {
                  const id = crypto.randomUUID();
                  patch({
                    ...cv,
                    education: [
                      ...cv.education,
                      { id, diploma: "Nouveau diplôme", school: "Établissement", year: "2024" },
                    ],
                  });
                  return id;
                }}
                onUpdate={(id, row) =>
                  patch({
                    ...cv,
                    education: cv.education.map((item) =>
                      item.id === id ? { ...item, ...row } : item,
                    ),
                  })
                }
                onRemove={(id) =>
                  patch({ ...cv, education: cv.education.filter((row) => row.id !== id) })
                }
              />
            ) : null}

            {section === "competences" ? (
              <EditableListBlock
                emptyLabel="Aucune compétence"
                addLabel="Ajouter une compétence"
                items={cv.skills}
                onSave={() => void persist()}
                renderSummary={(item) => ({
                  title: item.name,
                  subtitle: `Niveau ${item.level} %`,
                })}
                renderEdit={(item, update) => (
                  <div className="grid gap-2">
                    <Input
                      placeholder="Compétence"
                      value={item.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                    <div>
                      <Label htmlFor={`skill-level-${item.id}`} className="text-xs text-navy/55">
                        Niveau ({item.level} %)
                      </Label>
                      <Input
                        id={`skill-level-${item.id}`}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={item.level}
                        onChange={(e) => update({ level: Number(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
                onAdd={() => {
                  const id = crypto.randomUUID();
                  patch({
                    ...cv,
                    skills: [...cv.skills, { id, name: "Nouvelle compétence", level: 70 }],
                  });
                  return id;
                }}
                onUpdate={(id, row) =>
                  patch({
                    ...cv,
                    skills: cv.skills.map((item) => (item.id === id ? { ...item, ...row } : item)),
                  })
                }
                onRemove={(id) => patch({ ...cv, skills: cv.skills.filter((row) => row.id !== id) })}
              />
            ) : null}

            {section === "projets" ? (
              <EditableListBlock
                emptyLabel="Aucun projet"
                addLabel="Ajouter un projet"
                items={cv.projects}
                onSave={() => void persist()}
                renderSummary={(item) => ({
                  title: item.name,
                  subtitle: item.description,
                })}
                renderEdit={(item, update) => (
                  <div className="grid gap-2">
                    <Input
                      placeholder="Nom du projet"
                      value={item.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                    <Textarea
                      rows={3}
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => update({ description: e.target.value })}
                    />
                    <Input
                      placeholder="Lien (optionnel)"
                      value={item.url ?? ""}
                      onChange={(e) => update({ url: e.target.value })}
                    />
                  </div>
                )}
                onAdd={() => {
                  const id = crypto.randomUUID();
                  patch({
                    ...cv,
                    projects: [
                      ...cv.projects,
                      { id, name: "Nouveau projet", description: "Décrivez le projet." },
                    ],
                  });
                  return id;
                }}
                onUpdate={(id, row) =>
                  patch({
                    ...cv,
                    projects: cv.projects.map((item) => (item.id === id ? { ...item, ...row } : item)),
                  })
                }
                onRemove={(id) => patch({ ...cv, projects: cv.projects.filter((row) => row.id !== id) })}
              />
            ) : null}

            {section === "certifications" ? (
              <EditableListBlock
                emptyLabel="Aucune certification"
                addLabel="Ajouter une certification"
                items={cv.certifications}
                onSave={() => void persist()}
                renderSummary={(item) => ({
                  title: item.name,
                  subtitle: `${item.issuer} · ${item.year}`,
                })}
                renderEdit={(item, update) => (
                  <div className="grid gap-2">
                    <Input
                      placeholder="Certification"
                      value={item.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                    <Input
                      placeholder="Organisme"
                      value={item.issuer}
                      onChange={(e) => update({ issuer: e.target.value })}
                    />
                    <Input
                      placeholder="Année"
                      value={item.year}
                      onChange={(e) => update({ year: e.target.value })}
                    />
                  </div>
                )}
                onAdd={() => {
                  const id = crypto.randomUUID();
                  patch({
                    ...cv,
                    certifications: [
                      ...cv.certifications,
                      { id, name: "Nouvelle certification", issuer: "Organisme", year: "2024" },
                    ],
                  });
                  return id;
                }}
                onUpdate={(id, row) =>
                  patch({
                    ...cv,
                    certifications: cv.certifications.map((item) =>
                      item.id === id ? { ...item, ...row } : item,
                    ),
                  })
                }
                onRemove={(id) =>
                  patch({ ...cv, certifications: cv.certifications.filter((row) => row.id !== id) })
                }
              />
            ) : null}

            {section === "interets" ? (
              <EditableListBlock
                emptyLabel="Aucun centre d'intérêt"
                addLabel="Ajouter un centre d'intérêt"
                items={cv.interests ?? []}
                onSave={() => void persist()}
                renderSummary={(item) => ({
                  title: item.name,
                  subtitle: item.icon ? "Icône personnalisée" : "Icône automatique",
                })}
                renderEdit={(item, update) => (
                  <Input
                    placeholder="Lecture, sport, photographie…"
                    value={item.name}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                )}
                onAdd={() => {
                  const id = crypto.randomUUID();
                  patch({
                    ...cv,
                    interests: [...(cv.interests ?? []), { id, name: "Nouveau centre d'intérêt" }],
                  });
                  return id;
                }}
                onUpdate={(id, row) =>
                  patch({
                    ...cv,
                    interests: (cv.interests ?? []).map((item) =>
                      item.id === id ? { ...item, ...row } : item,
                    ),
                  })
                }
                onRemove={(id) =>
                  patch({
                    ...cv,
                    interests: (cv.interests ?? []).filter((item) => item.id !== id),
                  })
                }
              />
            ) : null}

            {section === "references" ? (
              <EditableListBlock
                emptyLabel="Aucune référence"
                addLabel="Ajouter une référence"
                items={cv.references ?? []}
                onSave={() => void persist()}
                renderSummary={(item) => ({
                  title: item.name,
                  subtitle: [item.role, item.company].filter(Boolean).join(" · ") || "Contact professionnel",
                })}
                renderEdit={(item, update) => (
                  <div className="grid gap-2">
                    <Input
                      placeholder="Nom du contact"
                      value={item.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                    <Input
                      placeholder="Fonction"
                      value={item.role}
                      onChange={(e) => update({ role: e.target.value })}
                    />
                    <Input
                      placeholder="Entreprise"
                      value={item.company}
                      onChange={(e) => update({ company: e.target.value })}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Téléphone"
                        value={item.phone ?? ""}
                        onChange={(e) => update({ phone: e.target.value })}
                      />
                      <Input
                        placeholder="Email"
                        value={item.email ?? ""}
                        onChange={(e) => update({ email: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                onAdd={() => {
                  const id = crypto.randomUUID();
                  patch({
                    ...cv,
                    references: [
                      ...(cv.references ?? []),
                      { id, name: "Nouvelle référence", role: "", company: "" },
                    ],
                  });
                  return id;
                }}
                onUpdate={(id, row) =>
                  patch({
                    ...cv,
                    references: (cv.references ?? []).map((item) =>
                      item.id === id ? { ...item, ...row } : item,
                    ),
                  })
                }
                onRemove={(id) =>
                  patch({
                    ...cv,
                    references: (cv.references ?? []).filter((item) => item.id !== id),
                  })
                }
              />
            ) : null}

            {section === "langues" ? (
              <EditableListBlock
                emptyLabel="Aucune langue"
                addLabel="Ajouter une langue"
                items={cv.languages}
                onSave={() => void persist()}
                renderSummary={(item) => ({
                  title: item.name,
                  subtitle: item.level,
                })}
                renderEdit={(item, update) => (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Langue"
                      value={item.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                    <Input
                      placeholder="Niveau (ex. Courant, B2…)"
                      value={item.level}
                      onChange={(e) => update({ level: e.target.value })}
                    />
                  </div>
                )}
                onAdd={() => {
                  const id = crypto.randomUUID();
                  patch({
                    ...cv,
                    languages: [...cv.languages, { id, name: "Langue", level: "Courant" }],
                  });
                  return id;
                }}
                onUpdate={(id, row) =>
                  patch({
                    ...cv,
                    languages: cv.languages.map((item) => (item.id === id ? { ...item, ...row } : item)),
                  })
                }
                onRemove={(id) =>
                  patch({ ...cv, languages: cv.languages.filter((row) => row.id !== id) })
                }
              />
            ) : null}
          </ParallaxScrollColumn>
          }
        />
      </section>
      }
      end={
      <aside
        className={cn(
          "flex h-full min-h-0 flex-col print:bg-transparent print:p-0 print:shadow-none",
          preview?.templateId === IMPORT_ORIGINAL_TEMPLATE_ID
            ? "bg-white p-0"
            : cn("rounded-xl bg-white p-3", cardShadow),
        )}
      >
        <ParallaxScrollColumn
          className="h-full"
          tone="preview"
          depth={0.14}
          shiftContent
          contentClassName="pb-16"
        >
          <CvPaper
            cv={preview}
            className={preview?.templateId === IMPORT_ORIGINAL_TEMPLATE_ID ? "min-h-[842px]" : "min-h-[640px] rounded-md"}
          />
        </ParallaxScrollColumn>
      </aside>
      }
    />
    </div>
    {downloadOpen ? (
      <DocumentDownloadModal variant="template" open={downloadOpen} onOpenChange={setDownloadOpen} cv={cv} />
    ) : null}
    {previewOpen ? (
      <CvPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} cv={cv} />
    ) : null}
    <CvExitEditorModal
      open={exitGuard.open}
      acting={exitGuard.acting}
      entryOrigin={exitGuard.entryOrigin}
      onOpenChange={(next) => {
        if (!next) exitGuard.cancelExit();
      }}
      onConfirm={(action) => void exitGuard.confirmExit(action)}
    />
    </>
  );
}

function IdentityForm({
  draft,
  patch,
  onSave,
}: {
  draft: CvData;
  patch: (cv: CvData) => void;
  onSave: () => void;
}) {
  const id = draft.identity;
  function setField<K extends keyof typeof id>(key: K, value: string) {
    patch({ ...draft, identity: { ...id, [key]: value } });
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="firstName">Prénom</Label>
        <Input id="firstName" value={id.firstName} onChange={(e) => setField("firstName", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="lastName">Nom</Label>
        <Input id="lastName" value={id.lastName} onChange={(e) => setField("lastName", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="jobTitle">Titre</Label>
        <Input id="jobTitle" value={id.title} onChange={(e) => setField("title", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={id.email} onChange={(e) => setField("email", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="phone">Téléphone</Label>
        <Input id="phone" value={id.phone} onChange={(e) => setField("phone", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="location">Localisation</Label>
        <Input id="location" value={id.location} onChange={(e) => setField("location", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="photo">Photo</Label>
        <Input
          id="photo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              patch({ ...draft, identity: { ...id, photo: String(reader.result) } });
            };
            reader.readAsDataURL(file);
          }}
        />
      </div>
      <div>
        <Label htmlFor="website">LinkedIn</Label>
        <Input
          id="website"
          placeholder="linkedin.com/in/…"
          value={id.website ?? ""}
          onChange={(e) => setField("website", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="github">GitHub</Label>
        <Input
          id="github"
          placeholder="github.com/…"
          value={id.github ?? ""}
          onChange={(e) => setField("github", e.target.value)}
        />
      </div>
      <Button type="button" className="rounded-xl sm:col-span-2" onClick={onSave}>
        Enregistrer
      </Button>
    </div>
  );
}

function ExperienceEditor({
  draft,
  patch,
  persist,
  editingExp,
  setEditingExp,
}: {
  draft: CvData;
  patch: (cv: CvData) => void;
  persist: () => void;
  editingExp: string | null;
  setEditingExp: (id: string | null) => void;
}) {
  function updateExp(id: string, next: Partial<ExperienceItem>) {
    patch({
      ...draft,
      experiences: draft.experiences.map((row) => (row.id === id ? { ...row, ...next } : row)),
    });
  }

  return (
    <div className="space-y-3">
      {draft.experiences.map((item) => (
        <article key={item.id} className={cn("flex items-start justify-between gap-2 rounded-xl bg-[#F8FAFC] p-4", cardShadow)}>
          <div className="min-w-0 flex-1">
            {editingExp === item.id ? (
              <div className="grid w-full gap-2">
                <Input
                  className="w-full"
                  placeholder="Intitulé du poste"
                  value={item.title}
                  onChange={(e) => updateExp(item.id, { title: e.target.value })}
                />
                <Input
                  className="w-full"
                  placeholder="Entreprise"
                  value={item.company}
                  onChange={(e) => updateExp(item.id, { company: e.target.value })}
                />
                <Textarea
                  className="w-full"
                  rows={4}
                  placeholder="Réalisations (une par ligne)"
                  value={item.bullets.join("\n")}
                  onChange={(e) =>
                    updateExp(item.id, {
                      bullets: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                />
              </div>
            ) : (
                <>
                  <p className="font-display font-bold text-navy">{item.title}</p>
                  <p className="text-sm text-navy/55">{item.company}</p>
                  <p className="mt-0.5 text-xs text-navy/45">
                    {formatCvPeriod(item.start, item.end, item.current)}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-navy/75">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5">
              <button
                type="button"
                aria-label={editingExp === item.id ? "Terminer" : "Modifier"}
                className="rounded-lg p-1.5 text-navy/45 hover:bg-white hover:text-principale"
                onClick={() => {
                  if (editingExp === item.id) persist();
                  setEditingExp(editingExp === item.id ? null : item.id);
                }}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Supprimer"
                className="rounded-lg p-1.5 text-navy/45 hover:bg-white hover:text-red-500"
                onClick={() => {
                  patch({
                    ...draft,
                    experiences: draft.experiences.filter((row) => row.id !== item.id),
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
          </div>
        </article>
      ))}
      <AddRow
        label="Ajouter une expérience"
        onClick={() =>
          patch({
            ...draft,
            experiences: [
              ...draft.experiences,
              {
                id: crypto.randomUUID(),
                title: "Nouveau poste",
                company: "Entreprise",
                start: "2024-01",
                end: "",
                current: true,
                bullets: ["Décrivez une réalisation chiffrée."],
              },
            ],
          })
        }
      />
    </div>
  );
}

function EditableListBlock<T extends { id: string }>({
  items,
  emptyLabel,
  addLabel,
  onAdd,
  onRemove,
  onUpdate,
  renderSummary,
  renderEdit,
  onSave,
}: {
  items: T[];
  emptyLabel: string;
  addLabel: string;
  onAdd: () => string;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<T>) => void;
  renderSummary: (item: T) => { title: string; subtitle?: string };
  renderEdit: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  onSave?: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd() {
    const newId = onAdd();
    setEditingId(newId);
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? <p className="text-sm text-navy/50">{emptyLabel}</p> : null}
      {items.map((item) => (
        <article
          key={item.id}
          className={cn("flex items-start justify-between gap-2 rounded-xl bg-[#F8FAFC] p-4", cardShadow)}
        >
          <div className="min-w-0 flex-1">
            {editingId === item.id ? (
              renderEdit(item, (patch) => onUpdate(item.id, patch))
            ) : (
              <>
                <p className="font-display font-bold text-navy">{renderSummary(item).title}</p>
                {renderSummary(item).subtitle ? (
                  <p className="text-sm text-navy/55">{renderSummary(item).subtitle}</p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              aria-label={editingId === item.id ? "Terminer" : "Modifier"}
              className="rounded-lg p-1.5 text-navy/45 hover:bg-white hover:text-principale"
              onClick={() => {
                if (editingId === item.id) {
                  onSave?.();
                  setEditingId(null);
                } else {
                  setEditingId(item.id);
                }
              }}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Supprimer"
              className="rounded-lg p-1.5 text-navy/45 hover:bg-white hover:text-red-500"
              onClick={() => {
                if (editingId === item.id) setEditingId(null);
                onRemove(item.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </article>
      ))}
      <AddRow label={addLabel} onClick={handleAdd} />
    </div>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1 rounded-xl bg-indigo-clair py-2.5 text-sm font-semibold text-principale transition-transform duration-brand ease-brand hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:translate-y-0 motion-reduce:transition-none"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}
