import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "@/platform/navigation";
import { FileUp, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AnalyseResultSheet } from "@/components/cv/AnalyseResultSheet";
import type { AnalyseRewriteSource } from "@/components/cv/AnalyseRewriteModal";
import { CvStatusBadge } from "@/components/cv/CvStatusBadge";
import { CvThumbnail } from "@/components/cv/CvThumbnail";
import { toast } from "@/hooks/use-toast";
import type { CvMatchAnalysis } from "@/lib/cvMatchAnalysis";
import { extractResumeText, matchCvToOffer } from "@/services/analyse";
import { useCvStore } from "@/store/cvStore";
import { useInterfaceStore } from "@/store/interfaceStore";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { aiTrialsHint, canUseAi, syncPlanCapabilities } from "@/lib/planCapabilities";
import { PlanPageHeading } from "@/components/plan/PlanFeatureBadge";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const ALLOWED = [".pdf", ".doc", ".docx", ".txt"];
const MAX_SIZE = 5 * 1024 * 1024;
const MIN_OFFER = 40;

type CvSelection = { type: "cv"; id: string } | { type: "file"; file: File };

export function AnalyseView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const aiReady = canUseAi(user);
  const quotaHint = aiTrialsHint(user);
  const items = useCvStore((s) => s.items);
  const loaded = useCvStore((s) => s.loaded);
  const load = useCvStore((s) => s.load);
  const setAssistantOpen = useInterfaceStore((s) => s.setAssistantOpen);
  const fileRef = useRef<HTMLInputElement>(null);

  const queryCvId = searchParams.get("cv") || "";
  const defaultId =
    (queryCvId && items.some((item) => item.id === queryCvId) ? queryCvId : "") ||
    items.find((item) => item.principal)?.id ||
    items[0]?.id ||
    "";

  const [selection, setSelection] = useState<CvSelection | null>(null);
  const [dragging, setDragging] = useState(false);
  const [jobOffer, setJobOffer] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CvMatchAnalysis | null>(null);
  const [rewriteSource, setRewriteSource] = useState<AnalyseRewriteSource | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    if (!loaded || selection) return;
    if (defaultId) {
      setSelection({ type: "cv", id: defaultId });
    }
  }, [loaded, defaultId, selection]);

  useEffect(() => {
    if (!queryCvId || !items.some((item) => item.id === queryCvId)) return;
    setSelection({ type: "cv", id: queryCvId });
  }, [items, queryCvId]);

  const selectedCv = useMemo(() => {
    if (selection?.type !== "cv") return null;
    return items.find((item) => item.id === selection.id) ?? null;
  }, [items, selection]);

  const importedFile = selection?.type === "file" ? selection.file : null;

  const offerReady = jobOffer.trim().length >= MIN_OFFER;
  const hasSource = selection?.type === "cv" ? Boolean(selectedCv) : Boolean(importedFile);
  const canRun = hasSource && offerReady;

  function resetResult() {
    setResult(null);
    setRewriteSource(null);
    setSheetOpen(false);
  }

  function selectCv(id: string) {
    setSelection({ type: "cv", id });
    resetResult();
    router.replace(`/analyse?cv=${id}`, { scroll: false });
  }

  function takeFile(next: File | null) {
    if (!next) return;
    const ext = next.name.slice(next.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      toast({
        title: "Format non pris en charge",
        description: "Importez un PDF, Word ou fichier texte.",
        variant: "destructive",
      });
      return;
    }
    if (next.size > MAX_SIZE) {
      toast({
        title: "Fichier trop lourd",
        description: "La taille maximale est de 5 Mo.",
        variant: "destructive",
      });
      return;
    }
    setSelection({ type: "file", file: next });
    resetResult();
    router.replace("/analyse", { scroll: false });
  }

  async function runComparison() {
    const offer = jobOffer.trim();
    if (offer.length < MIN_OFFER) {
      toast({
        title: "Offre incomplète",
        description: "Collez l'intégralité de l'offre (titre, missions, compétences) pour une comparaison fiable.",
        variant: "destructive",
      });
      return;
    }
    if (!canRun || pending || !selection) return;
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
      let matchResult: CvMatchAnalysis;

      if (selection.type === "cv" && selectedCv) {
        matchResult = await matchCvToOffer({ jobOffer: offer, cvId: selectedCv.id });
        setRewriteSource({ sourceCv: selectedCv });
      } else if (selection.type === "file") {
        const file = selection.file;
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        let resumeText = "";
        let fileName = file.name;

        if (ext === ".txt") {
          resumeText = await file.text();
        } else {
          const extracted = await extractResumeText(file);
          resumeText = extracted.text;
          fileName = extracted.fileName || file.name;
        }

        matchResult = await matchCvToOffer({
          jobOffer: offer,
          resumeText,
          fileName,
        });
        setRewriteSource({ resumeText, fileName, importedFile: file });
      } else {
        return;
      }

      setResult(matchResult);
      setSheetOpen(true);
      void syncPlanCapabilities();
    } catch (error) {
      toast({
        title: "Comparaison impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5 overflow-x-clip">
      <div>
        <PlanPageHeading plan="essai-ia">Mon CV correspond-il à cette offre ?</PlanPageHeading>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-navy/60">
          Sélectionnez votre CV, collez l&apos;offre comme référence, et découvrez quoi modifier
          sur votre CV pour mieux correspondre au poste.
        </p>
        {quotaHint ? <p className="mt-2 text-xs font-medium text-principale">{quotaHint}</p> : null}
      </div>

      <section className={cn("rounded-2xl bg-white p-5 sm:p-6", cardShadow)}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-navy/55">
            {!loaded ? "Chargement…" : "Choisissez le CV à comparer"}
          </p>
        </div>

        {!loaded ? (
          <div className="cv-card-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-xl bg-[#F8FAFC]" aria-hidden />
            ))}
          </div>
        ) : (
          <div className="cv-card-grid">
            {items.map((cv) => {
              const active = selection?.type === "cv" && selection.id === cv.id;
              return (
                <button
                  key={cv.id}
                  type="button"
                  onClick={() => selectCv(cv.id)}
                  className={cn(
                    "flex min-w-0 flex-col rounded-xl bg-[#F8FAFC] p-3 text-left transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none",
                    cardShadow,
                    active && "ring-2 ring-principale/40",
                  )}
                >
                  <div className="relative overflow-hidden rounded-xl">
                    <CvThumbnail cv={cv} />
                    <div className="absolute left-2 top-2 z-10">
                      <CvStatusBadge cv={cv} />
                    </div>
                  </div>
                  <div className="min-w-0 px-1 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-navy" title={cv.title}>
                        {cv.title}
                      </p>
                      {cv.principal ? (
                        <span className="shrink-0 rounded-full bg-indigo/15 px-2 py-0.5 text-[10px] font-semibold text-indigo">
                          Principal
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-navy/50">Complété à {cv.completion} %</p>
                  </div>
                </button>
              );
            })}

            <div
              role="button"
              tabIndex={0}
              className={cn(
                "flex min-h-[14rem] min-w-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-[#F8FAFC] px-4 text-center text-navy/55",
                dragging
                  ? "border-principale bg-indigo-clair text-principale"
                  : "border-principale/30 hover:border-principale/60 hover:text-principale",
                selection?.type === "file" && "ring-2 ring-principale/40",
              )}
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
                takeFile(event.dataTransfer.files[0] ?? null);
              }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-clair text-principale">
                <FileUp className="h-6 w-6" />
              </span>
              {importedFile ? (
                <>
                  <span className="mt-3 max-w-full truncate px-2 font-semibold text-navy">
                    {importedFile.name}
                  </span>
                  <span className="text-xs text-navy/50">Fichier sélectionné</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2 h-7 rounded-full bg-white px-2.5 text-xs text-navy/60 shadow-none"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (defaultId) {
                        setSelection({ type: "cv", id: defaultId });
                      } else {
                        setSelection(null);
                      }
                      resetResult();
                    }}
                  >
                    <X className="h-3 w-3" />
                    Retirer
                  </Button>
                </>
              ) : (
                <>
                  <span className="mt-3 font-semibold text-navy">Importer un CV</span>
                  <span className="text-xs">PDF, Word ou TXT · 5 Mo max</span>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={ALLOWED.join(",")}
                className="hidden"
                onChange={(event) => {
                  takeFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-6">
          <Label htmlFor="analyse-job-offer" className="mb-1.5 text-sm font-medium text-navy">
            Offre d&apos;emploi
          </Label>
          <Textarea
            id="analyse-job-offer"
            rows={5}
            value={jobOffer}
            onChange={(event) => setJobOffer(event.target.value)}
            placeholder="Collez ici l'offre complète : intitulé, missions, compétences requises, expérience attendue…"
            className="rounded-xl border-navy/10 bg-[#F8FAFC] shadow-none focus-visible:ring-principale/30"
          />
          <p className="mt-1.5 text-xs text-navy/45">
            {offerReady
              ? "Offre prête pour la comparaison."
              : `Encore ${Math.max(0, MIN_OFFER - jobOffer.trim().length)} caractères minimum pour analyser.`}
          </p>
        </div>

        <Button
          className="mt-5 h-11 w-full rounded-xl sm:w-auto sm:px-6"
          disabled={!canRun || pending || !loaded || !aiReady}
          onClick={() => void runComparison()}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {pending ? "Analyse en cours…" : "Vérifier la correspondance"}
        </Button>
      </section>

      <AnalyseResultSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        result={result}
        jobOffer={jobOffer}
        rewriteSource={rewriteSource}
        onOpenAssistant={() => setAssistantOpen(true)}
      />
    </div>
  );
}
