import { makeRequest } from "@/lib/makeRequest";
import type { JobOffer } from "@/lib/jobTypes";
import type { CvData } from "@/lib/cvTypes";
import type { JobMatchScore } from "@/lib/jobMatch";
import { NetworkError } from "@/lib/networkError";
import { JOB_MAX_AGE_DAYS, clampJobMaxDaysOld } from "@/lib/jobLimits";
import { filterJobsByMaxDays } from "@/lib/jobDateFilter";

export type JobsSearchResult = {
  jobs: JobOffer[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source: string;
  maxDaysOld: number;
  revealed: boolean;
};

type JobsSearchResponse = {
  data?: Partial<JobsSearchResult> & { jobs?: JobOffer[] };
  message?: string;
};

export type JobsSearchOptions = {
  location?: string;
  page?: number;
  contract?: string;
  remote?: boolean;
  maxDaysOld?: number | null;
};

export async function searchWebJobs(
  query: string,
  options: JobsSearchOptions = {},
): Promise<JobsSearchResult> {
  const maxDaysOld = clampJobMaxDaysOld(options.maxDaysOld ?? JOB_MAX_AGE_DAYS);
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (options.location?.trim()) params.set("where", options.location.trim());
  if (options.page && options.page > 1) params.set("page", String(options.page));
  if (options.contract && options.contract !== "tous") params.set("contract", options.contract);
  if (options.remote) params.set("remote", "true");
  params.set("max_days_old", String(maxDaysOld));
  const suffix = params.toString() ? `?${params.toString()}` : "";

  const payload = (await makeRequest(
    `jobs/search${suffix}`,
    "GET",
    null,
    false,
    false,
  )) as JobsSearchResponse;

  const data = payload?.data;
  const rawJobs = Array.isArray(data?.jobs) ? data.jobs : [];
  const jobs = filterJobsByMaxDays(rawJobs, maxDaysOld);
  const pageSize = Number(data?.pageSize) || 20;
  const count = Number(data?.count) || jobs.length;
  const page = Number(data?.page) || options.page || 1;
  const totalPages =
    Number(data?.totalPages) || Math.max(1, Math.ceil(count / pageSize) || 1);

  return {
    jobs,
    count,
    page,
    pageSize,
    totalPages,
    source: data?.source || "Adzuna + JSearch",
    maxDaysOld,
    revealed: data?.revealed !== false,
  };
}

export type JobMatchApiResult = {
  scores: Record<string, JobMatchScore>;
  source: "ai" | "local" | "none";
};

/**
 * Fait juger par l'IA la pertinence réelle de chaque offre pour ce CV (métier,
 * séniorité, secteur) — plus fiable que le simple recoupement de mots-clés.
 * Best-effort : timeout court et échec silencieux, la recherche ne doit jamais
 * dépendre de cet appel (repli sur le score local déjà géré par l'appelant).
 */
export async function matchJobsWithCv(
  cv: CvData,
  jobs: JobOffer[],
  { timeoutMs = 35000 }: { timeoutMs?: number } = {},
): Promise<JobMatchApiResult | null> {
  if (!jobs.length) return { scores: {}, source: "none" };

  const body = {
    cv: {
      title: cv.title || "",
      jobTitle: cv.identity.title || "",
      summary: cv.summary || "",
      skills: cv.skills.map((item) => item.name).filter(Boolean).slice(0, 25),
      experiences: cv.experiences
        .map((item) =>
          [item.title, item.company && `chez ${item.company}`, item.bullets.length ? `: ${item.bullets.join("; ")}` : ""]
            .filter(Boolean)
            .join(" "),
        )
        .slice(0, 8),
    },
    jobs: jobs.slice(0, 30).map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      tags: job.tags,
      summary: job.summary,
    })),
  };

  try {
    const payload = (await makeRequest("jobs/match", "POST", body, true, false, {
      signal: AbortSignal.timeout(timeoutMs),
    })) as {
      data?: { scores?: Record<string, JobMatchScore>; source?: string };
    } | null;
    const data = payload?.data;
    if (!data) return null;
    return {
      scores: data.scores || {},
      source: (data.source as JobMatchApiResult["source"]) || "local",
    };
  } catch {
    return null;
  }
}

export function jobsSearchErrorMessage(error: unknown) {
  if (error instanceof NetworkError) {
    if (error.status === 403) {
      return "La recherche d'offres est réservée au plan Premium.";
    }
    if (error.status === 429) {
      return "Trop de recherches. Patientez une minute puis réessayez.";
    }
    return error.message || "Recherche impossible pour le moment.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Recherche impossible pour le moment.";
}
