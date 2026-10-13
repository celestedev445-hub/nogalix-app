import { useEffect, useMemo, useState } from "react";
import Link from "@/platform/link";
import { useRouter, useSearchParams } from "@/platform/navigation";
import {
  Check,
  CircleAlert,
  ClipboardList,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { emptyCv } from "@/lib/demoData";
import { aiTrialsHint, canUseAi, canUseCapability, capabilityLimit, syncPlanCapabilities } from "@/lib/planCapabilities";
import { PlanFeatureBadge, PlanPageHeading } from "@/components/plan/PlanFeatureBadge";
import { markNewCvEditingSession } from "@/lib/cvEditorSession";
import { cn } from "@/lib/utils";
import {
  generateCandidature,
  type CandidatureOutput,
  type CandidatureResult,
} from "@/services/candidature";
import { useAuthStore } from "@/store/authStore";
import { useCvStore } from "@/store/cvStore";
import { useDocumentStore } from "@/store/documentStore";
import type { CvData } from "@/lib/cvTypes";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const OFFER_STORAGE_KEY = "nogalix-candidature-offer";

const OUTPUTS: {
  id: CandidatureOutput;
  title: string;
  hint: string;
  free?: boolean;
  capability?: string;
}[] = [
  {
    id: "checklist",
    title: "Checklist candidature",
    hint: "L'IA compare l'offre et votre CV, puis liste les actions",
    free: true,
  },
  {
    id: "cv",
    title: "CV adapté",
    hint: "L'IA réécrit accroche et missions pour cette offre",
    capability: "candidature.generate",
  },
  {
    id: "letter",
    title: "Lettre de motivation",
    hint: "L'IA rédige une lettre personnalisée, prête à envoyer",
    capability: "documents.letters",
  },
];

export function CandidatureView() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const cvs = useCvStore((s) => s.items);
  const loadCvs = useCvStore((s) => s.load);
  const upsertCv = useCvStore((s) => s.upsert);
  const upsertDoc = useDocumentStore((s) => s.upsert);

  const canCv = canUseCapability(user, "candidature.generate");
  const canLetter = canUseCapability(user, "documents.letters");
  const cvLimit = capabilityLimit(user, "cv.max");

  const defaultCvId = cvs.find((item) => item.principal)?.id ?? cvs[0]?.id ?? "";
  const [offer, setOffer] = useState("");
  const [cvId, setCvId] = useState(defaultCvId);
  const [selected, setSelected] = useState<CandidatureOutput[]>(["checklist"]);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CandidatureResult | null>(null);
  const [letterDraft, setLetterDraft] = useState("");
  const [savingCv, setSavingCv] = useState(false);
  const [savingLetter, setSavingLetter] = useState(false);

  useEffect(() => {
    void loadCvs();
  }, [loadCvs]);

  useEffect(() => {
    if (cvId || !defaultCvId) return;
    setCvId(defaultCvId);
  }, [cvId, defaultCvId]);

  useEffect(() => {
    const fromQuery = params.get("offre");
    if (fromQuery === "1" || fromQuery === "saved") {
      try {
        const saved = sessionStorage.getItem(OFFER_STORAGE_KEY);
        if (saved) setOffer(saved);
      } catch {
        /* ignore */
      }
    }
  }, [params]);

  const sourceCv = useMemo(
    () => cvs.find((item) => item.id === cvId) ?? cvs[0] ?? null,
    [cvs, cvId],
  );

  function toggleOutput(id: CandidatureOutput) {
    const meta = OUTPUTS.find((item) => item.id === id);
    if (meta?.capability && !canUseCapability(user, meta.capability)) {
      toast({
        title: `${meta.title} · action IA`,
        description: aiTrialsHint(user) || "Passez à un plan supérieur pour continuer.",
      });
      router.push("/plans");
      return;
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onGenerate() {
    if (offer.trim().length < 40) {
      toast({
        title: "Offre trop courte",
        description: "Collez le texte de l'annonce (au moins quelques lignes).",
        variant: "destructive",
      });
      return;
    }
    if (!selected.length) {
      toast({ title: "Choisissez au moins un livrable", variant: "destructive" });
      return;
    }
    const usesAi = selected.some((id) => id === "cv" || id === "letter");
    if (usesAi && !canUseAi(user)) {
      toast({
        title: "Quota IA atteint",
        description: aiTrialsHint(user) || "Passez à un plan supérieur pour continuer.",
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }
    const locked = selected.filter((id) => {
      const meta = OUTPUTS.find((item) => item.id === id);
      return meta?.capability && !canUseCapability(user, meta.capability);
    });
    if (locked.length) {
      toast({
        title: "Livrable réservé",
        description: aiTrialsHint(user) || "Ces livrables consomment une action IA.",
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }
    if (selected.includes("cv") && cvLimit !== null && cvLimit !== -1 && cvs.length >= cvLimit) {
      toast({
        title: "Limite de CV atteinte",
        description: `Votre plan autorise ${cvLimit} CV. Passez à Pro ou archivez un CV.`,
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }

    setPending(true);
    setResult(null);
    try {
      const snapshot = sourceCv
        ? {
            ...sourceCv,
            identity: { ...sourceCv.identity, photo: null },
          }
        : null;
      const data = await generateCandidature({
        offer_text: offer.trim(),
        cv_id: sourceCv?.id,
        outputs: selected,
        cv_snapshot: snapshot,
      });
      setResult(data);
      setLetterDraft(data.letter?.body || "");
      void syncPlanCapabilities();
      toast({
        title: "Livrables rédigés",
        description: data.offer_title
          ? `L'IA a ciblé : ${data.offer_title}`
          : "L'IA a rédigé vos livrables.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Génération impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  async function saveAdaptedCv() {
    if (!result?.cv) return;
    setSavingCv(true);
    try {
      const base = sourceCv || emptyCv();
      const patched = result.cv;
      const next = emptyCv({
        ...base,
        id: crypto.randomUUID(),
        principal: false,
        templateId: String(patched.templateId || base.templateId || "atlas"),
        title: String(patched.title || `CV · ${result.offer_title || "offre"}`),
        identity: {
          ...base.identity,
          ...(patched.identity as CvData["identity"] | undefined),
        },
        summary: String(patched.summary ?? base.summary),
        experiences: (patched.experiences as CvData["experiences"]) || base.experiences,
        education: (patched.education as CvData["education"]) || base.education,
        skills: (patched.skills as CvData["skills"]) || base.skills,
        languages: (patched.languages as CvData["languages"]) || base.languages,
        projects: (patched.projects as CvData["projects"]) || base.projects,
        certifications: (patched.certifications as CvData["certifications"]) || base.certifications,
        interests: (patched.interests as CvData["interests"]) || base.interests,
        references: (patched.references as CvData["references"]) || base.references,
      });
      const saved = await upsertCv(next, true);
      markNewCvEditingSession(saved.id);
      toast({ title: "CV enregistré", description: "Nouvelle variante créée.", variant: "success" });
      router.push(`/cv/${saved.id}`);
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : "Vérifiez votre quota de CV.",
        variant: "destructive",
      });
    } finally {
      setSavingCv(false);
    }
  }

  async function saveLetter() {
    if (!letterDraft.trim() || savingLetter) return;
    setSavingLetter(true);
    try {
      const title = result?.letter?.title || `Lettre · ${result?.offer_title || "offre"}`;
      const slug = title
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      await upsertDoc({
        kind: "lettre",
        title,
        fileName: `${slug || "lettre"}.txt`,
        mime: "text/plain",
        cvId: sourceCv?.id,
        body: letterDraft,
      });
      toast({ title: "Lettre enregistrée", description: "Disponible dans Documents.", variant: "success" });
      router.push("/documents");
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSavingLetter(false);
    }
  }

  const tabClass =
    "rounded-xl px-3 py-2 shadow-none data-[state=active]:bg-indigo-clair data-[state=active]:text-principale data-[state=active]:shadow-none";

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div>
        <PlanPageHeading plan="essai-ia">Candidature</PlanPageHeading>
        <p className="mt-1 max-w-2xl text-sm text-navy/65">
          Collez une offre : l&apos;IA rédige les livrables à partir de votre CV. La checklist ne
          consomme pas votre quota. Le CV adapté et la lettre comptent pour une action IA.
        </p>
        {aiTrialsHint(user) ? (
          <p className="mt-2 text-xs font-medium text-principale">{aiTrialsHint(user)}</p>
        ) : null}
      </div>

      <section className={cn("rounded-xl bg-white p-5", cardShadow)}>
        <Label htmlFor="offer" className="text-sm font-medium text-navy">
          Offre d&apos;emploi
        </Label>
        <Textarea
          id="offer"
          rows={8}
          value={offer}
          onChange={(event) => setOffer(event.target.value)}
          placeholder="Collez ici le titre, l'entreprise, les missions et le profil recherché…"
          className="mt-2 rounded-xl bg-[#F8FAFC] shadow-none"
        />
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <Label className="text-sm font-medium text-navy">CV source (optionnel)</Label>
            <Select value={cvId || "none"} onValueChange={(value) => setCvId(value === "none" ? "" : value)}>
              <SelectTrigger className="mt-2 h-11 rounded-xl bg-[#F8FAFC] shadow-none">
                <SelectValue placeholder="Choisir un CV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sans CV (profil de base)</SelectItem>
                {cvs.map((cv) => (
                  <SelectItem key={cv.id} value={cv.id}>
                    {cv.title}
                    {cv.principal ? " · principal" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!cvs.length ? (
              <p className="mt-2 text-xs text-navy/55">
                Pas encore de CV ?{" "}
                <Link href="/cv/nouveau" className="font-medium text-principale hover:underline">
                  Créez-en un
                </Link>{" "}
                pour un meilleur ciblage.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className={cn("rounded-xl bg-white p-5", cardShadow)}>
        <h2 className="font-display text-lg font-bold text-navy">Livrables</h2>
        <p className="mt-1 text-sm text-navy/55">Sélectionnez un ou plusieurs éléments.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {OUTPUTS.map((item) => {
            const locked = Boolean(item.capability && !canUseCapability(user, item.capability));
            const active = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleOutput(item.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl bg-[#F8FAFC] p-4 text-left transition-transform duration-brand ease-brand hover:-translate-y-0.5 motion-reduce:translate-y-0",
                  cardShadow,
                  active && "ring-2 ring-principale/40",
                  locked && "opacity-90",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 font-semibold text-navy">{item.title}</p>
                  <PlanFeatureBadge plan={item.free ? "gratuit" : "essai-ia"} compact />
                </div>
                <p className="mt-2 text-xs text-navy/55">{item.hint}</p>
                {active ? (
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-principale">
                    <Check className="h-3.5 w-3.5" /> Sélectionné
                  </p>
                ) : locked ? (
                  <p className="mt-3 text-xs text-navy/45">Cliquez pour voir les plans</p>
                ) : null}
              </button>
            );
          })}
        </div>

        <Button
          className="mt-5 h-11 rounded-xl px-5 shadow-brand"
          disabled={pending || !selected.length}
          onClick={() => void onGenerate()}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {pending ? "Rédaction IA…" : "Rédiger avec l'IA"}
        </Button>
      </section>

      {result ? (
        <section className={cn("rounded-xl bg-white p-5", cardShadow)}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-navy">Résultats</h2>
              <p className="text-sm text-navy/55">
                {result.offer_title || "Offre analysée"}
                {result.source === "gemini" ? " · rédigé par l'IA" : result.source === "local" ? " · estimation locale" : ""}
              </p>
            </div>
          </div>

          <Tabs
            defaultValue={
              result.checklist ? "checklist" : result.cv ? "cv" : "letter"
            }
          >
            <TabsList className="scroll-row-mobile h-auto flex-wrap gap-1 rounded-xl bg-[#F8FAFC] p-1">
              {result.checklist ? (
                <TabsTrigger value="checklist" className={tabClass}>
                  <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                  Checklist
                </TabsTrigger>
              ) : null}
              {result.cv ? (
                <TabsTrigger value="cv" className={tabClass}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  CV adapté
                </TabsTrigger>
              ) : null}
              {result.letter ? (
                <TabsTrigger value="letter" className={tabClass}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Lettre
                </TabsTrigger>
              ) : null}
            </TabsList>

            {result.checklist ? (
              <TabsContent value="checklist" className="mt-4 space-y-4">
                <p className="text-sm text-navy/70">{result.checklist.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {(result.checklist.keywords_found || []).map((word) => (
                    <span key={`f-${word}`} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-succes">
                      {word}
                    </span>
                  ))}
                  {(result.checklist.keywords_missing || []).map((word) => (
                    <span key={`m-${word}`} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700">
                      {word}
                    </span>
                  ))}
                </div>
                <ul className="space-y-2">
                  {(result.checklist.items || []).map((item) => (
                    <li key={item.id} className="flex gap-3 rounded-xl bg-[#F8FAFC] px-3 py-3">
                      {item.ok ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-succes" />
                      ) : (
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      )}
                      <div>
                        <p className="font-medium text-navy">{item.label}</p>
                        <p className="text-sm text-navy/60">{item.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            ) : null}

            {result.cv ? (
              <TabsContent value="cv" className="mt-4 space-y-4">
                <div className="rounded-xl bg-[#F8FAFC] p-4">
                  <p className="text-xs uppercase tracking-wide text-navy/45">Titre</p>
                  <p className="font-display text-lg font-bold text-navy">{String(result.cv.title || "")}</p>
                  <p className="mt-1 text-sm text-navy/65">
                    {(result.cv.identity as { title?: string } | undefined)?.title || "Non renseigné"}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-navy/75">{String(result.cv.summary || "")}</p>
                  {(result.cv.skills as { name?: string }[] | undefined)?.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(result.cv.skills as { name?: string }[]).slice(0, 12).map((skill, index) => (
                        <span
                          key={`${skill.name}-${index}`}
                          className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-navy/70"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="h-11 rounded-xl" disabled={savingCv || !canCv} onClick={() => void saveAdaptedCv()}>
                    {savingCv ? <Loader2 className="animate-spin" /> : <Save />}
                    Enregistrer comme nouveau CV
                  </Button>
                  {!canCv ? (
                    <Button asChild variant="outline" className="h-11 rounded-xl">
                      <Link href="/plans">Passer à Pro</Link>
                    </Button>
                  ) : null}
                </div>
              </TabsContent>
            ) : null}

            {result.letter ? (
              <TabsContent value="letter" className="mt-4 space-y-4">
                <Textarea
                  rows={12}
                  value={letterDraft}
                  onChange={(event) => setLetterDraft(event.target.value)}
                  className="rounded-xl bg-[#F8FAFC] shadow-none"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="h-11 rounded-xl"
                    disabled={savingLetter || !canLetter || !letterDraft.trim()}
                    onClick={() => void saveLetter()}
                  >
                    {savingLetter ? <Loader2 className="animate-spin" /> : <Save />}
                    Enregistrer dans Documents
                  </Button>
                  {!canLetter ? (
                    <Button asChild variant="outline" className="h-11 rounded-xl">
                      <Link href="/plans">Passer à Pro</Link>
                    </Button>
                  ) : null}
                </div>
              </TabsContent>
            ) : null}
          </Tabs>
        </section>
      ) : null}
    </div>
  );
}
