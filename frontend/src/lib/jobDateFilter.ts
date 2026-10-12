import type { JobOffer } from "@/lib/jobTypes";
import { JOB_MAX_AGE_DAYS, clampJobMaxDaysOld } from "@/lib/jobLimits";

/** Garde les offres publiées dans la fenêtre demandée (marge fuseau +1 jour). */
export function filterJobsByMaxDays(jobs: JobOffer[], maxDaysOld: number | null | undefined): JobOffer[] {
  const days = clampJobMaxDaysOld(maxDaysOld ?? JOB_MAX_AGE_DAYS);
  const cutoff = Date.now() - (days + 1) * 24 * 60 * 60 * 1000;
  return jobs.filter((job) => {
    if (!job.postedAt) return true;
    const time = new Date(job.postedAt).getTime();
    if (Number.isNaN(time)) return true;
    return time >= cutoff;
  });
}
