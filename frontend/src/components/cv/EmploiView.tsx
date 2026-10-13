import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/platform/link";
import { useRouter } from "@/platform/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScoreRing } from "@/components/cv/ScoreRing";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { enterUp, reducedMotion, useSafeReducedMotion } from "@/lib/motion";
import {
  JOB_MATCH_MIN_SCORE,
  buildJobSearchNeedle,
  cvHasMatchSignal,
  filterAndRankJobs,
} from "@/lib/jobMatch";
import type { JobMatchScore } from "@/lib/jobMatch";
import { JOB_MAX_AGE_DAYS } from "@/lib/jobLimits";
import type { JobOffer } from "@/lib/jobTypes";
import type { CvData } from "@/lib/cvTypes";
import { cvFromUploadedFile } from "@/lib/emploiCvUpload";
import { jobsSearchErrorMessage, matchJobsWithCv, searchWebJobs } from "@/services/jobs";
import { useCvStore } from "@/store/cvStore";
import { useSavedJobsStore, type SavedJob } from "@/store/savedJobsStore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const LOGIN_NEXT = "/auth/login?suivant=/emploi";
const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const PAGE_SIZE = 20;
const CONTRACTS = ["tous", "CDI", "CDD", "Freelance", "Stage"] as const;
type ContractFilter = (typeof CONTRACTS)[number];

const DAYS_FILTERS = [
  { value: 1, label: "24 h" },
  { value: 3, label: "3 jours" },
  { value: 7, label: "7 jours" },
  { value: 14, label: "14 jours" },
  { value: JOB_MAX_AGE_DAYS, label: "30 jours" },
] as const;
type DaysFilter = (typeof DAYS_FILTERS)[number]["value"];

function matchColor(score: number) {
  if (score >= 80) return "text-succes";
  if (score >= 60) return "text-principale";
  return "text-amber-600";
}

function formatPostedAt(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

function candidatureBlob(job: JobOffer) {
  return [job.title, job.company, job.location, job.contract, job.summary, (job.tags || []).join(", ")]
    .filter(Boolean)
    .join("\n");
}

function openCandidature(job: JobOffer) {
  try {
    sessionStorage.setItem("nogalix-candidature-offer", candidatureBlob(job));
  } catch {
    /* ignore */
  }
  window.location.href = "/candidature?offre=1";
}

function visiblePages(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
}

function JobsPagination({
  page,
  totalPages,
  count,
  pageSize,
  pending,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  count: number;
  pageSize: number;
  pending?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (count <= 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);
  const pages = visiblePages(page, totalPages);

  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-gris/70 pt-4 sm:flex-row">
      <p className="text-sm text-navy/55">
        Affichage{" "}
        <span className="font-semibold text-navy">
          {from}–{to}
        </span>{" "}
        sur <span className="font-semibold text-navy">{count.toLocaleString("fr-FR")}</span> offre
        {count > 1 ? "s" : ""}
      </p>
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            disabled={pending || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          {pages.map((item, index) => {
            const prev = pages[index - 1];
            const showGap = prev != null && item - prev > 1;
            return (
              <span key={item} className="inline-flex items-center gap-1">
                {showGap ? <span className="px-1 text-navy/35">…</span> : null}
                <Button
                  type="button"
                  size="sm"
                  variant={item === page ? "default" : "outline"}
                  className={cn("h-9 min-w-9 rounded-xl", item === page && "shadow-brand")}
                  disabled={pending}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              </span>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            disabled={pending || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  disabled,
  icon: Icon,
  title,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-transform duration-brand ease-brand active:scale-[0.97] motion-reduce:transition-none disabled:opacity-60",
        active ? "bg-indigo-clair text-principale" : "text-navy/55 hover:bg-indigo-clair/70",
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}

/** Groupe de filtres du panneau mobile : icône du type filtré, libellé, puces. */
function FilterGroup({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-gris/70 py-4 first:border-t-0 first:pt-0">
      <p className="flex items-center gap-2 text-sm font-semibold text-navy">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-clair text-principale">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
      {hint ? <p className="mt-2 text-xs text-navy/50">{hint}</p> : null}
    </div>
  );
}

export function EmploiView() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loggedIn = Boolean(user);
  const cvs = useCvStore((s) => s.items);
  const loadCvs = useCvStore((s) => s.load);
  const savedIds = useSavedJobsStore((s) => s.ids);
  const toggleSave = useSavedJobsStore((s) => s.toggle);
  const savedJobs = useSavedJobsStore((s) => s.jobs);
  const savedLoading = useSavedJobsStore((s) => s.loading);
  const loadSavedJobs = useSavedJobsStore((s) => s.load);
  const [view, setView] = useState<"recherche" | "enregistrees">("recherche");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const reduce = useSafeReducedMotion();
  const motionProps = reduce ? reducedMotion : enterUp;

  const defaultCv = cvs.find((item) => item.principal)?.id ?? cvs[0]?.id ?? "";
  const [cvId, setCvId] = useState(defaultCv);
  const [uploadedCv, setUploadedCv] = useState<CvData | null>(null);
  const [matchOnly, setMatchOnly] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [contract, setContract] = useState<ContractFilter>("tous");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [daysOld, setDaysOld] = useState<DaysFilter>(JOB_MAX_AGE_DAYS);

  const [pool, setPool] = useState<JobOffer[]>([]);
  const [aiScores, setAiScores] = useState<Record<string, JobMatchScore>>({});
  const [aiScoring, setAiScoring] = useState(false);
  const aiSeq = useRef(0);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const requestSeq = useRef(0);
  const autoSearched = useRef(false);
  const filtersBootstrapped = useRef(false);
  const matchBootstrapped = useRef(false);
  const cvSearchBootstrapped = useRef(false);
  const runSearchRef = useRef<
    (
      page?: number,
      opts?: {
        silentToast?: boolean;
        scroll?: boolean;
        query?: string;
        location?: string;
        contract?: ContractFilter;
        daysOld?: DaysFilter;
        cv?: CvData | null;
      },
    ) => Promise<void>
  >(async () => undefined);

  const cv =
    (uploadedCv && uploadedCv.id === cvId ? uploadedCv : null) ||
    cvs.find((item) => item.id === cvId) ||
    uploadedCv ||
    cvs[0] ||
    null;
  const canMatch = cvHasMatchSignal(cv);

  useEffect(() => {
    if (!loggedIn) return;
    void loadCvs();
  }, [loggedIn, loadCvs]);

  useEffect(() => {
    if (!loggedIn) {
      setView("recherche");
      return;
    }
    void loadSavedJobs();
  }, [loggedIn, loadSavedJobs]);

  function onToggleSave(job: JobOffer) {
    if (!loggedIn) {
      requireLogin();
      return;
    }
    const wasSaved = savedIds.includes(job.id);
    void toggleSave(job).then((nowSaved) => {
      if (nowSaved === wasSaved) return;
      toast({
        title: nowSaved ? "Offre sauvegardée" : "Offre retirée",
        description: nowSaved ? "Retrouvez-la dans l'onglet « Enregistrées »." : undefined,
        variant: "success",
      });
    });
  }

  useEffect(() => {
    if (cvId || uploadedCv || !cvs[0]) return;
    setCvId(cvs.find((item) => item.principal)?.id ?? cvs[0].id);
  }, [cvs, cvId, uploadedCv]);

  // Active le filtre match dès qu'un CV exploitable est dispo (une seule fois).
  useEffect(() => {
    if (matchBootstrapped.current || !canMatch) return;
    matchBootstrapped.current = true;
    setMatchOnly(true);
  }, [canMatch]);

  // Relance la recherche une fois le CV chargé (évite q=emploi puis match vide).
  useEffect(() => {
    if (!loggedIn || !autoSearched.current || !cv || !canMatch) return;
    if (cvSearchBootstrapped.current) return;
    if (query.trim()) {
      cvSearchBootstrapped.current = true;
      return;
    }
    cvSearchBootstrapped.current = true;
    void runSearchRef.current(1, { silentToast: true, scroll: false, cv });
  }, [loggedIn, canMatch, cv, query]);

  // Classement plus fiable que le simple recoupement de mots-clés : l'IA lit le CV
  // et juge chaque offre (métier, séniorité, secteur). Best-effort, jamais bloquant —
  // le score local (déjà calculé dans `ranked`) reste affiché tant que ça tourne.
  useEffect(() => {
    if (!loggedIn || !cv || !canMatch || !pool.length) {
      setAiScores({});
      setAiScoring(false);
      return;
    }
    const seq = ++aiSeq.current;
    setAiScoring(true);
    setAiScores({});
    void matchJobsWithCv(cv, pool).then((result) => {
      if (seq !== aiSeq.current) return;
      setAiScoring(false);
      if (result?.scores && Object.keys(result.scores).length) {
        setAiScores(result.scores);
      }
    });
  }, [loggedIn, cv, canMatch, pool]);

  const ranked = useMemo(
    () =>
      filterAndRankJobs(pool, {
        contract,
        remoteOnly,
        daysOld,
        cv,
        matchOnly: matchOnly && canMatch,
        aiScores,
      }),
    [pool, contract, remoteOnly, daysOld, cv, matchOnly, canMatch, aiScores],
  );
  const active = ranked.find((item) => item.job.id === activeId);
  const [detailJob, setDetailJob] = useState<JobOffer | null>(null);

  const runSearch = useCallback(
    async (
      pageToLoad = 1,
      opts?: {
        silentToast?: boolean;
        scroll?: boolean;
        query?: string;
        location?: string;
        contract?: ContractFilter;
        daysOld?: DaysFilter;
        cv?: CvData | null;
      },
    ) => {
      const seq = ++requestSeq.current;
      setPending(true);
      setError(null);
      setPage(pageToLoad);

      const nextQuery = opts?.query ?? query;
      const nextLocation = opts?.location ?? location;
      const nextContract = opts?.contract ?? contract;
      const nextDaysOld = opts?.daysOld ?? daysOld;
      const nextCv = opts?.cv !== undefined ? opts.cv : cv;
      const needle = buildJobSearchNeedle(nextQuery, nextCv);

      try {
        const result = await searchWebJobs(needle, {
          location: nextLocation,
          page: pageToLoad,
          contract: nextContract,
          // Remote Adzuna trop approximatif → filtre local uniquement.
          remote: false,
          maxDaysOld: nextDaysOld,
        });
        if (seq !== requestSeq.current) return;

        setPool(result.jobs);
        setTotalCount(result.count);
        setTotalPages(result.totalPages);
        setPageSize(result.pageSize || PAGE_SIZE);
        setPage(result.page);
        setSearched(true);

        if (!opts?.silentToast) {
          toast({
            title: "Recherche terminée",
            description:
              result.count > 0
                ? `${result.count.toLocaleString("fr-FR")} offre${result.count > 1 ? "s" : ""} trouvée${result.count > 1 ? "s" : ""} (≤ ${nextDaysOld} j).`
                : `Aucune offre sur les ${nextDaysOld === 1 ? "dernières 24 h" : `${nextDaysOld} derniers jours`}.`,
            variant: "success",
          });
        }

        if (opts?.scroll !== false) {
          window.requestAnimationFrame(() => {
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      } catch (err) {
        if (seq !== requestSeq.current) return;
        const message = jobsSearchErrorMessage(err);
        setError(message);
        setSearched(true);
        setPool([]);
        toast({
          title: "Recherche impossible",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (seq === requestSeq.current) setPending(false);
      }
    },
    [contract, cv, daysOld, location, query],
  );

  runSearchRef.current = runSearch;

  useEffect(() => {
    if (autoSearched.current) return;
    autoSearched.current = true;
    void runSearchRef.current(1, { silentToast: true, scroll: false });
  }, []);

  useEffect(() => {
    if (!autoSearched.current) return;
    if (!filtersBootstrapped.current) {
      filtersBootstrapped.current = true;
      return;
    }
    void runSearchRef.current(1, { silentToast: true });
  }, [loggedIn, contract, daysOld]);

  function onSubmitSearch(event: React.FormEvent) {
    event.preventDefault();
    void runSearch(1);
  }

  function requireLogin() {
    router.push(LOGIN_NEXT);
  }

  async function onUploadCv(file: File | null) {
    if (!file) return;
    if (!loggedIn) {
      requireLogin();
      return;
    }
    setUploadingCv(true);
    try {
      const parsed = await cvFromUploadedFile(file);
      setUploadedCv(parsed);
      setCvId(parsed.id);
      matchBootstrapped.current = true;
      setMatchOnly(cvHasMatchSignal(parsed));
      cvSearchBootstrapped.current = true;
      toast({
        title: "CV prêt pour le matching",
        description: cvHasMatchSignal(parsed)
          ? `Profil analysé depuis « ${file.name} ». Seules les offres correspondantes sont affichées.`
          : `Fichier importé, mais le profil est trop pauvre pour filtrer — affinez le CV ou saisissez un métier.`,
        variant: "success",
      });
      void runSearchRef.current(1, { silentToast: true, cv: parsed });
    } catch (err) {
      toast({
        title: "Import impossible",
        description: err instanceof Error ? err.message : "Réessayez avec un autre fichier.",
        variant: "destructive",
      });
    } finally {
      setUploadingCv(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }

  function resetFilters() {
    setContract("tous");
    setRemoteOnly(false);
    setDaysOld(JOB_MAX_AGE_DAYS);
    setMatchOnly(canMatch);
    setLocation("");
    setQuery("");
    void runSearchRef.current(1, {
      silentToast: true,
      query: "",
      location: "",
      contract: "tous",
      daysOld: JOB_MAX_AGE_DAYS,
    });
  }

  const displayedCount = ranked.length;
  const matchFilterOn = loggedIn && matchOnly && canMatch;
  const activeFilterCount =
    Number(contract !== "tous") + Number(remoteOnly) + Number(matchFilterOn) + Number(daysOld !== JOB_MAX_AGE_DAYS);
  const filterSummary: { key: string; icon: LucideIcon; label: string }[] = [
    { key: "contrat", icon: Briefcase, label: contract === "tous" ? "Tous les contrats" : contract },
    ...(remoteOnly ? [{ key: "remote", icon: Globe, label: "Remote" }] : []),
    ...(matchFilterOn ? [{ key: "match", icon: Sparkles, label: `Match ≥ ${JOB_MATCH_MIN_SCORE}` }] : []),
    {
      key: "publie",
      icon: Clock,
      label: DAYS_FILTERS.find((item) => item.value === daysOld)?.label ?? `${daysOld} jours`,
    },
  ];
  const hasCvOptions = Boolean(uploadedCv) || cvs.length > 0;

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div>
        <h1 className="min-w-0 font-display text-2xl font-bold title-logo sm:text-3xl">Emploi</h1>
        <p className="mt-1 max-w-2xl text-sm text-navy/65">
          {loggedIn
            ? `Sélectionnez ou importez un CV pour ne voir que les offres qui collent à votre profil. Les sources sont limitées aux ${JOB_MAX_AGE_DAYS} derniers jours.`
            : `Parcourez les offres des ${JOB_MAX_AGE_DAYS} derniers jours. Connectez-vous pour voir l’entreprise, la source et le détail.`}
        </p>
        <p className="mt-2 text-xs text-navy/45">
          Offres fournies par{" "}
          <a
            href="https://www.adzuna.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-navy/25 underline-offset-2 hover:text-navy/70"
          >
            Adzuna
          </a>
          {" "}et{" "}
          <a
            href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-navy/25 underline-offset-2 hover:text-navy/70"
          >
            JSearch
          </a>
          .
        </p>
      </div>

      <section className={cn("rounded-xl bg-white p-5", cardShadow)}>
        <form className="space-y-3" onSubmit={onSubmitSearch}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Métier, compétence, entreprise…"
              aria-label="Recherche d'offre"
              className="h-11 rounded-xl bg-[#F8FAFC] shadow-none"
            />
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ville, région ou remote"
              aria-label="Lieu"
              className="h-11 rounded-xl bg-[#F8FAFC] shadow-none"
            />
            <Button type="submit" className="h-11 rounded-xl shadow-brand" disabled={pending || uploadingCv}>
              {pending ? <Loader2 className="animate-spin" /> : <Search />}
              {pending ? "Recherche…" : "Rechercher"}
            </Button>
          </div>

          {loggedIn ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              {hasCvOptions ? (
                <Select
                  value={cvId || undefined}
                  onValueChange={(value) => {
                    setCvId(value);
                    const next =
                      (uploadedCv && uploadedCv.id === value ? uploadedCv : null) ||
                      cvs.find((item) => item.id === value) ||
                      null;
                    matchBootstrapped.current = true;
                    setMatchOnly(cvHasMatchSignal(next));
                    cvSearchBootstrapped.current = true;
                    void runSearchRef.current(1, { silentToast: true, cv: next });
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-[#F8FAFC] shadow-none">
                    <SelectValue placeholder="CV pour le matching" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadedCv ? (
                      <SelectItem value={uploadedCv.id}>Importé · {uploadedCv.title}</SelectItem>
                    ) : null}
                    {cvs.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                        {item.identity.title ? ` · ${item.identity.title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-11 items-center rounded-xl bg-[#F8FAFC] px-3 text-sm text-navy/55">
                  Aucun CV enregistré — importez un fichier pour filtrer.
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  onChange={(event) => void onUploadCv(event.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 rounded-xl bg-indigo-clair text-principale shadow-none"
                  disabled={pending || uploadingCv}
                  onClick={() => uploadInputRef.current?.click()}
                >
                  {uploadingCv ? <Loader2 className="animate-spin" /> : <Upload />}
                  {uploadingCv ? "Analyse…" : "Importer un CV"}
                </Button>
                {!cvs.length ? (
                  <Button asChild type="button" variant="ghost" className="h-11 rounded-xl">
                    <Link href="/cv/nouveau">Créer un CV</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl bg-[#F8FAFC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-navy/65">
                Connectez-vous pour voir l&apos;entreprise, la source et le détail de chaque offre.
              </p>
              <Button asChild className="h-10 shrink-0 rounded-xl">
                <Link href={LOGIN_NEXT}>
                  <Lock className="h-4 w-4" />
                  Se connecter
                </Link>
              </Button>
            </div>
          )}
        </form>

        <div className="mt-4 hidden flex-wrap items-center gap-2 sm:flex">
          <Briefcase className="h-4 w-4 text-navy/35" aria-label="Contrat" />
          {CONTRACTS.map((item) => (
            <FilterChip key={item} active={contract === item} disabled={pending} onClick={() => setContract(item)}>
              {item === "tous" ? "Tous les contrats" : item}
            </FilterChip>
          ))}
          <FilterChip
            active={remoteOnly}
            disabled={pending}
            icon={Globe}
            onClick={() => setRemoteOnly((value) => !value)}
          >
            Remote uniquement
          </FilterChip>
          {loggedIn ? (
            <FilterChip
              active={matchOnly && canMatch}
              disabled={pending || !canMatch}
              icon={Sparkles}
              onClick={() => setMatchOnly((value) => !value)}
              title={!canMatch ? "Choisissez ou importez un CV avec un métier / des compétences" : undefined}
            >
              Match CV uniquement
              {canMatch ? ` (≥ ${JOB_MATCH_MIN_SCORE})` : ""}
            </FilterChip>
          ) : null}
        </div>

        <div className="mt-3 hidden flex-wrap items-center gap-2 sm:flex">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy/40">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Publié
          </span>
          {DAYS_FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              active={daysOld === item.value}
              disabled={pending}
              onClick={() => setDaysOld(item.value)}
            >
              {item.label}
            </FilterChip>
          ))}
        </div>

        {/* Mobile : bouton Filtres + résumé des filtres appliqués, chacun avec l'icône de son type. */}
        <div className="mt-4 flex items-center gap-2 sm:hidden">
          <Button
            type="button"
            variant="secondary"
            className="h-10 shrink-0 rounded-xl bg-indigo-clair px-3 text-principale shadow-none"
            aria-haspopup="dialog"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal />
            Filtres
            {activeFilterCount ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-principale px-1.5 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
          <div className="scroll-row-mobile flex min-w-0 gap-1.5">
            {filterSummary.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-gris bg-[#F8FAFC] px-2.5 text-xs font-medium text-navy/70"
                >
                  <Icon className="h-3.5 w-3.5 text-principale" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-[1.5rem] border-gris px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gris" aria-hidden />
            <SheetHeader className="mb-4 text-left">
              <SheetTitle className="flex items-center gap-2 font-display text-base">
                <SlidersHorizontal className="h-4 w-4 text-principale" aria-hidden />
                Filtrer les offres
              </SheetTitle>
              <SheetDescription className="text-xs text-navy/55">
                Les filtres s&apos;appliquent directement aux résultats.
              </SheetDescription>
            </SheetHeader>

            <FilterGroup icon={Briefcase} label="Type de contrat">
              {CONTRACTS.map((item) => (
                <FilterChip key={item} active={contract === item} disabled={pending} onClick={() => setContract(item)}>
                  {item === "tous" ? "Tous les contrats" : item}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup icon={Globe} label="Lieu de travail">
              <FilterChip
                active={remoteOnly}
                disabled={pending}
                icon={Globe}
                onClick={() => setRemoteOnly((value) => !value)}
              >
                Remote uniquement
              </FilterChip>
            </FilterGroup>

            {loggedIn ? (
              <FilterGroup
                icon={Sparkles}
                label="Correspondance avec le CV"
                hint={!canMatch ? "Choisissez ou importez un CV avec un métier / des compétences" : undefined}
              >
                <FilterChip
                  active={matchOnly && canMatch}
                  disabled={pending || !canMatch}
                  icon={Sparkles}
                  onClick={() => setMatchOnly((value) => !value)}
                >
                  Match CV uniquement
                  {canMatch ? ` (≥ ${JOB_MATCH_MIN_SCORE})` : ""}
                </FilterChip>
              </FilterGroup>
            ) : null}

            <FilterGroup icon={Clock} label="Date de publication">
              {DAYS_FILTERS.map((item) => (
                <FilterChip
                  key={item.value}
                  active={daysOld === item.value}
                  disabled={pending}
                  onClick={() => setDaysOld(item.value)}
                >
                  {item.label}
                </FilterChip>
              ))}
            </FilterGroup>

            <Button type="button" className="mt-2 h-11 w-full rounded-xl shadow-brand" onClick={() => setFiltersOpen(false)}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Voir les offres
            </Button>
          </SheetContent>
        </Sheet>

        {loggedIn && cv ? (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-navy/45">
            <span>
              Matching sur « {cv.title} »
              {cv.identity.title ? ` · ${cv.identity.title}` : ""}
              {!canMatch
                ? " · profil trop pauvre pour filtrer (ajoutez un métier ou des compétences)"
                : matchOnly
                  ? " · seules les offres correspondantes sont listées"
                  : " · toutes les offres, triées par score"}
            </span>
            {canMatch && aiScoring ? (
              <span className="inline-flex items-center gap-1 text-principale">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyse IA du CV en cours…
              </span>
            ) : null}
          </p>
        ) : null}
      </section>

      {loggedIn ? (
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Affichage des offres">
          {(
            [
              { id: "recherche", label: "Résultats de recherche" },
              { id: "enregistrees", label: `Enregistrées${savedIds.length ? ` (${savedIds.length})` : ""}` },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-transform duration-brand ease-brand active:scale-[0.97] motion-reduce:transition-none",
                view === item.id ? "bg-indigo-clair text-principale" : "text-navy/55 hover:bg-indigo-clair/70",
              )}
            >
              {item.id === "enregistrees" ? <BookmarkCheck className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {loggedIn && view === "enregistrees" ? (
        <SavedJobsList
          items={savedJobs}
          loading={savedLoading}
          onRemove={(job) => onToggleSave(job)}
          onRemoveId={(id) => {
            void toggleSave(id).then((nowSaved) => {
              if (!nowSaved) toast({ title: "Offre retirée", variant: "success" });
            });
          }}
          onView={(job) => setDetailJob(job)}
        />
      ) : null}

      <div ref={resultsRef} className={cn(loggedIn && view === "enregistrees" && "hidden")}>
        <AnimatePresence mode="wait">
          {pending && !searched ? (
            <motion.div key="emploi-loading" {...motionProps}>
              <BrandLoader fullPage size={72} label="Recherche des offres…" />
            </motion.div>
          ) : searched ? (
            <motion.div key={`emploi-results-${page}-${contract}-${remoteOnly}-${matchOnly}`} {...motionProps} className="relative">
              {pending && displayedCount > 0 ? (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#F9FBFF]/90 backdrop-blur-[2px]"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <BrandLoader size={72} label="Mise à jour des offres…" />
                </div>
              ) : null}

              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm text-navy/55">
                    {error
                      ? "La dernière recherche a échoué."
                      : pending && displayedCount === 0
                        ? "Recherche des offres…"
                        : displayedCount > 0
                          ? `${displayedCount.toLocaleString("fr-FR")} offre${displayedCount > 1 ? "s" : ""}${
                              matchOnly && canMatch ? " correspondante" + (displayedCount > 1 ? "s" : "") : ""
                            }${cv ? ` pour « ${cv.title} »` : ""} · ${daysOld === 1 ? "24 h" : `${daysOld} jours`}`
                          : pool.length > 0 && matchOnly && canMatch
                            ? "Aucune offre ne correspond assez à ce CV sur cette page."
                            : "Aucune offre pour ces critères."}
                  </p>
                  {totalPages > 1 && !error && !(pending && displayedCount === 0) ? (
                    <p className="mt-0.5 text-xs text-navy/40">
                      Page {page} sur {totalPages}
                      {totalCount > 0 ? ` · ${totalCount.toLocaleString("fr-FR")} au total (source)` : ""}
                    </p>
                  ) : null}
                </div>
                {error ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 rounded-xl bg-indigo-clair text-principale shadow-none"
                    disabled={pending}
                    onClick={() => void runSearch(page)}
                  >
                    Réessayer
                  </Button>
                ) : null}
              </div>

              {error ? (
                <section className={cn("rounded-xl bg-white p-8 text-center", cardShadow)}>
                  <p className="font-medium text-navy">Impossible de charger les offres</p>
                  <p className="mt-1 text-sm text-navy/55">{error}</p>
                </section>
              ) : pending && displayedCount === 0 ? (
                <BrandLoader fullPage size={72} label="Recherche des offres…" />
              ) : displayedCount === 0 ? (
                <section className={cn("rounded-xl bg-white p-8 text-center", cardShadow)}>
                  <p className="font-medium text-navy">Aucune offre pour ces filtres</p>
                  <p className="mt-1 text-sm text-navy/55">
                    {matchOnly && canMatch
                      ? "Assouplissez « Match CV uniquement », changez de CV, ou élargissez la période / le contrat."
                      : `Élargissez la période (max. ${JOB_MAX_AGE_DAYS} jours), le contrat ou le métier.`}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {matchOnly && canMatch ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 rounded-xl bg-indigo-clair text-principale shadow-none"
                        onClick={() => setMatchOnly(false)}
                      >
                        Afficher toutes les offres
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 rounded-xl"
                      disabled={pending}
                      onClick={resetFilters}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </div>
                </section>
              ) : (
                <>
                  <div className="grid gap-4">
                    {ranked.map(({ job, match }) => {
                      const saved = savedIds.includes(job.id);
                      const posted = formatPostedAt(job.postedAt);
                      return (
                        <article
                          key={job.id}
                          className={cn(
                            "rounded-xl bg-white p-5",
                            cardShadow,
                            "transition-transform duration-brand ease-brand hover:-translate-y-0.5 motion-reduce:translate-y-0 motion-reduce:transition-none",
                          )}
                        >
                          <div
                            className={cn(
                              "grid items-start gap-x-3 sm:gap-x-4",
                              loggedIn ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1",
                            )}
                          >
                            {loggedIn ? (
                              <div className="shrink-0 sm:row-span-2">
                              <ScoreRing
                                value={match.score}
                                size={72}
                                stroke={7}
                                trackClassName="text-gris"
                                barClassName="text-principale"
                              >
                                <p className={cn("font-display text-sm font-extrabold", matchColor(match.score))}>
                                  {match.score}
                                </p>
                                <p className="text-[9px] text-navy/45">match</p>
                              </ScoreRing>
                              </div>
                            ) : null}
                            <div className="min-w-0 self-center sm:self-start">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h2 className="font-display text-lg font-bold text-navy">
                                    <button
                                      type="button"
                                      className="text-left hover:text-principale"
                                      onClick={() => (loggedIn ? setActiveId(job.id) : requireLogin())}
                                    >
                                      {job.title}
                                    </button>
                                  </h2>
                                  <p className="text-sm text-navy/65">
                                    {loggedIn ? job.company || "Entreprise confidentielle" : "Entreprise masquée"}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="rounded-full">
                                  {loggedIn ? job.source || "Source" : "Source masquée"}
                                </Badge>
                              </div>
                            </div>
                            {/* Mobile : le titre reste à côté du cercle, le détail prend toute la largeur dessous. */}
                            <div className={cn("min-w-0", loggedIn && "col-span-2 sm:col-span-1 sm:col-start-2")}>
                              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy/50">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {job.location}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Briefcase className="h-3.5 w-3.5" />
                                  {job.contract}
                                  {job.remote ? " · Remote" : ""}
                                </span>
                                {loggedIn && job.salary ? <span>{job.salary}</span> : null}
                                {posted ? <span>{posted}</span> : null}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-xl"
                                  onClick={() => (loggedIn ? setActiveId(job.id) : requireLogin())}
                                >
                                  Voir l&apos;offre
                                  {!loggedIn ? <Lock className="h-3.5 w-3.5" /> : null}
                                </Button>
                                {loggedIn && job.url ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="rounded-xl bg-indigo-clair text-principale shadow-none"
                                    asChild
                                  >
                                    <a href={job.url} target="_blank" rel="noreferrer">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Source
                                    </a>
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="rounded-xl bg-indigo-clair text-principale shadow-none"
                                    onClick={requireLogin}
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                    Source
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-xl"
                                  onClick={() => (loggedIn ? openCandidature(job) : requireLogin())}
                                >
                                  Préparer ma candidature
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-xl"
                                  onClick={() => onToggleSave(job)}
                                >
                                  {saved ? (
                                    <BookmarkCheck className="h-4 w-4 text-principale" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                  {saved ? "Enregistrée" : "Sauvegarder"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <JobsPagination
                    page={page}
                    totalPages={totalPages}
                    count={totalCount}
                    pageSize={pageSize}
                    pending={pending}
                    onPageChange={(next) => void runSearch(next, { silentToast: true })}
                  />
                </>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <Dialog open={Boolean(detailJob) && loggedIn} onOpenChange={(open) => !open && setDetailJob(null)}>
        <DialogContent className="max-w-lg rounded-xl">
          {detailJob ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{detailJob.title}</DialogTitle>
                <DialogDescription>
                  {[detailJob.company, detailJob.location, detailJob.contract].filter(Boolean).join(" · ")}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-relaxed text-navy/75">
                {detailJob.summary || "Aucune description enregistrée pour cette offre."}
              </p>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl bg-indigo-clair text-principale shadow-none"
                  onClick={() => openCandidature(detailJob)}
                >
                  <Sparkles />
                  Préparer ma candidature
                </Button>
                {detailJob.url ? (
                  <Button asChild className="rounded-xl">
                    <a href={detailJob.url} target="_blank" rel="noreferrer">
                      Ouvrir sur {detailJob.source || "la source"}
                    </a>
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(active) && loggedIn} onOpenChange={(open) => !open && setActiveId(null)}>
        <DialogContent className="max-w-lg rounded-xl">
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{active.job.title}</DialogTitle>
                <DialogDescription>
                  {active.job.company} · {active.job.location} · {active.match.score} % de correspondance
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-relaxed text-navy/75">{active.job.summary}</p>
              {active.match.found.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy/40">Déjà dans votre CV</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {active.match.found.map((word) => (
                      <Badge key={word} variant="success" className="rounded-full">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {active.match.missing.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy/40">À ajouter pour mieux matcher</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {active.match.missing.map((word) => (
                      <Badge key={word} variant="warning" className="rounded-full">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl bg-indigo-clair text-principale shadow-none"
                  onClick={() => openCandidature(active.job)}
                >
                  <Sparkles />
                  Préparer ma candidature
                </Button>
                <Button asChild className="rounded-xl">
                  <a href={active.job.url} target="_blank" rel="noreferrer">
                    Ouvrir sur {active.job.source}
                  </a>
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SavedJobsList({
  items,
  loading,
  onRemove,
  onRemoveId,
  onView,
}: {
  items: SavedJob[];
  loading: boolean;
  onRemove: (job: JobOffer) => void;
  onRemoveId: (id: string) => void;
  onView: (job: JobOffer) => void;
}) {
  if (loading && !items.length) {
    return <BrandLoader size={72} label="Chargement des offres enregistrées…" className="w-full py-12" />;
  }
  if (!items.length) {
    return (
      <section className={cn("rounded-xl bg-white p-8 text-center", cardShadow)}>
        <Bookmark className="mx-auto h-6 w-6 text-principale" />
        <p className="mt-2 font-medium text-navy">Aucune offre enregistrée</p>
        <p className="mt-1 text-sm text-navy/55">
          Cliquez sur « Sauvegarder » sur une offre pour la retrouver ici, même après une nouvelle recherche.
        </p>
      </section>
    );
  }
  return (
    <div className="grid gap-4">
      <p className="text-sm text-navy/55">
        {items.length} offre{items.length > 1 ? "s" : ""} enregistrée{items.length > 1 ? "s" : ""}
      </p>
      {items.map(({ id, job, savedAt }) => {
        const savedLabel = (() => {
          const date = new Date(savedAt);
          if (Number.isNaN(date.getTime())) return null;
          return `Enregistrée ${formatDistanceToNow(date, { addSuffix: true, locale: fr })}`;
        })();
        if (!job) {
          return (
            <article key={id} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5", cardShadow)}>
              <div className="min-w-0">
                <p className="font-medium text-navy">Offre indisponible</p>
                <p className="text-xs text-navy/50">
                  Le détail de cette offre n&apos;a pas été conservé.{savedLabel ? ` ${savedLabel}.` : ""}
                </p>
              </div>
              <Button type="button" size="sm" variant="ghost" className="rounded-xl" onClick={() => onRemoveId(id)}>
                <BookmarkCheck className="h-4 w-4 text-principale" />
                Retirer
              </Button>
            </article>
          );
        }
        const posted = formatPostedAt(job.postedAt);
        return (
          <article
            key={id}
            className={cn(
              "rounded-xl bg-white p-5",
              cardShadow,
              "transition-transform duration-brand ease-brand hover:-translate-y-0.5 motion-reduce:translate-y-0 motion-reduce:transition-none",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-navy">
                  <button type="button" className="text-left hover:text-principale" onClick={() => onView(job)}>
                    {job.title}
                  </button>
                </h2>
                <p className="text-sm text-navy/65">{job.company || "Entreprise confidentielle"}</p>
              </div>
              {job.source ? (
                <Badge variant="secondary" className="rounded-full">
                  {job.source}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy/50">
              {job.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </span>
              ) : null}
              {job.contract ? (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {job.contract}
                  {job.remote ? " · Remote" : ""}
                </span>
              ) : null}
              {job.salary ? <span>{job.salary}</span> : null}
              {posted ? <span>{posted}</span> : null}
              {savedLabel ? <span>{savedLabel}</span> : null}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" className="rounded-xl" onClick={() => onView(job)}>
                Voir l&apos;offre
              </Button>
              {job.url ? (
                <Button size="sm" variant="secondary" className="rounded-xl bg-indigo-clair text-principale shadow-none" asChild>
                  <a href={job.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Source
                  </a>
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" className="rounded-xl" onClick={() => openCandidature(job)}>
                Préparer ma candidature
              </Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-xl" onClick={() => onRemove(job)}>
                <BookmarkCheck className="h-4 w-4 text-principale" />
                Retirer
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
