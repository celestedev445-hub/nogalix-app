import type { CvData } from "@/lib/cvTypes";
import type { JobOffer } from "@/lib/jobTypes";
import { filterJobsByMaxDays } from "@/lib/jobDateFilter";

/** Score mini pour considérer qu'une offre « correspond » au CV. */
export const JOB_MATCH_MIN_SCORE = 55;

export type JobMatchScore = { score: number; found: string[]; missing: string[] };

function tokenize(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9+.#]+/)
        .filter((word) => word.length > 2),
    ),
  );
}

export function cvCorpus(cv: CvData) {
  return [
    cv.title,
    cv.identity.title,
    cv.summary,
    ...cv.skills.map((item) => item.name),
    ...cv.experiences.flatMap((item) => [item.title, item.company, ...item.bullets]),
    ...cv.projects.map((item) => item.name),
  ].join(" ");
}

export function matchJobToCv(job: JobOffer, cv: CvData) {
  // Les mots-clés propres au CV (compétences) sont le signal le plus fiable :
  // contrairement au reste du corpus, ce ne sont jamais des mots de remplissage.
  const cvSkillTokens = new Set(cv.skills.flatMap((item) => tokenize(item.name)));
  const cvKeywords = new Set([...tokenize(cvCorpus(cv)), ...cvSkillTokens]);
  // Repli sur le corpus complet si le CV n'a pas de compétences listées explicitement
  // (ex : import minimal), pour ne pas perdre tout signal de correspondance.
  const preciseTokens = cvSkillTokens.size ? cvSkillTokens : cvKeywords;

  const titleTokens = tokenize(job.title);
  const bodyTokens = new Set(tokenize(job.summary));
  const tags = job.tags || [];

  // Le titre de l'offre recoupe-t-il le vocabulaire du CV (métier, expériences, compétences) ?
  const titleHits = titleTokens.filter((token) => cvKeywords.has(token));
  const titleScore = titleTokens.length ? titleHits.length / titleTokens.length : 0;

  // Les tags (compétences requises côté offre) recoupent-ils mes compétences ?
  const tagHits = tags.filter((tag) =>
    Array.from(preciseTokens).some((token) => tag.toLowerCase().includes(token) || token.includes(tag.toLowerCase())),
  );
  const tagScore = tags.length ? tagHits.length / tags.length : 0;

  // Combien de mes compétences sont explicitement citées dans l'offre (titre + description) ?
  const skillHits = Array.from(preciseTokens).filter(
    (token) => bodyTokens.has(token) || titleTokens.includes(token),
  );
  const skillDenom = Math.min(preciseTokens.size, 8) || 1;
  const skillScore = skillHits.length / skillDenom;

  const score = Math.max(
    0,
    Math.min(98, Math.round(titleScore * 35 + tagScore * 30 + skillScore * 35)),
  );

  const found = Array.from(new Set([...titleHits, ...skillHits])).slice(0, 8);
  const missing = tags.filter((tag) => !tagHits.includes(tag)).slice(0, 6);
  return { score, found, missing };
}

/** Titres de document trop génériques — ne jamais les envoyer à Adzuna. */
const GENERIC_CV_TITLES = new Set([
  "mon cv",
  "mon doc",
  "cv",
  "resume",
  "curriculum vitae",
  "nouveau cv",
  "cv importe",
  "cv importé",
  "sans titre",
]);

function looksLikeJobTitle(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!normalized || normalized.length < 3) return false;
  if (GENERIC_CV_TITLES.has(normalized)) return false;
  if (/^(cv|resume|doc|document|fichier)\b/.test(normalized)) return false;
  return true;
}

/** Requête Adzuna dérivée du CV (métier + compétences), pas du nom de fichier. */
export function buildJobSearchNeedle(query: string, cv?: CvData | null) {
  if (query.trim()) return query.trim();
  if (!cv) return "emploi";
  const skills = cv.skills.map((item) => item.name).filter(Boolean).slice(0, 5);
  const jobTitle = (cv.identity.title || "").trim();
  const docTitle = (cv.title || "").trim();
  const title = looksLikeJobTitle(jobTitle)
    ? jobTitle
    : looksLikeJobTitle(docTitle)
      ? docTitle
      : "";
  const parts = [title, ...skills].filter(Boolean);
  return parts.join(" ").trim() || "emploi";
}

/** True si le CV a assez de contenu pour un matching utile. */
export function cvHasMatchSignal(cv?: CvData | null) {
  if (!cv) return false;
  const skills = cv.skills.filter((item) => item.name?.trim()).length;
  const experiences = cv.experiences.length;
  const summary = (cv.summary || "").trim().length;
  const jobTitle = (cv.identity.title || "").trim();
  return Boolean(skills >= 1 || experiences >= 1 || summary >= 40 || looksLikeJobTitle(jobTitle));
}

export function filterJobsByContractAndRemote(
  jobs: JobOffer[],
  {
    contract,
    remoteOnly,
  }: {
    contract: string;
    remoteOnly: boolean;
  },
) {
  return jobs.filter((job) => {
    const matchContract = contract === "tous" || job.contract === contract;
    const matchRemote = !remoteOnly || job.remote;
    return matchContract && matchRemote;
  });
}

/**
 * Classe les offres déjà récupérées côté API selon le CV.
 * `aiScores` (facultatif) prévaut sur le score local calculé job par job : c'est
 * l'IA qui juge la pertinence réelle (métier, séniorité, secteur), le calcul
 * local ne sert que de repli quand l'IA est indisponible pour une offre donnée.
 */
export function rankJobs(
  jobs: JobOffer[],
  cv?: CvData | null,
  aiScores?: Record<string, JobMatchScore>,
) {
  return jobs
    .map((job) => {
      const ai = aiScores?.[job.id];
      const match = ai ?? (cv ? matchJobToCv(job, cv) : { score: 0, found: [] as string[], missing: [] as string[] });
      return { job, match };
    })
    .sort((a, b) => b.match.score - a.match.score);
}

export function filterAndRankJobs(
  jobs: JobOffer[],
  {
    contract,
    remoteOnly,
    daysOld,
    cv,
    matchOnly,
    minScore = JOB_MATCH_MIN_SCORE,
    aiScores,
  }: {
    contract: string;
    remoteOnly: boolean;
    daysOld: number;
    cv?: CvData | null;
    matchOnly?: boolean;
    minScore?: number;
    aiScores?: Record<string, JobMatchScore>;
  },
) {
  const dated = filterJobsByMaxDays(jobs, daysOld);
  const filtered = filterJobsByContractAndRemote(dated, { contract, remoteOnly });
  let ranked = rankJobs(filtered, cv, aiScores);
  if (matchOnly && cv) {
    ranked = ranked.filter((item) => item.match.score >= minScore);
  }
  return ranked;
}

export function searchJobs(
  jobs: JobOffer[],
  {
    query,
    location,
    contract,
    remoteOnly,
    cv,
  }: {
    query: string;
    location: string;
    contract: string;
    remoteOnly: boolean;
    cv?: CvData;
  },
) {
  const q = query.trim().toLowerCase();
  const loc = location.trim().toLowerCase();
  const filtered = jobs.filter((job) => {
    const hay = `${job.title} ${job.company} ${job.tags.join(" ")} ${job.summary}`.toLowerCase();
    const matchQuery = !q || hay.includes(q);
    const matchLoc =
      !loc || job.location.toLowerCase().includes(loc) || (job.remote && loc.includes("remote"));
    const matchContract = contract === "tous" || job.contract === contract;
    const matchRemote = !remoteOnly || job.remote;
    return matchQuery && matchLoc && matchContract && matchRemote;
  });
  return rankJobs(filtered, cv);
}
