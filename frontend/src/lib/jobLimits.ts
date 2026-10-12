/** Plafond global : aucune source d'offres au-delà d'un mois. */
export const JOB_MAX_AGE_DAYS = 30 as const;

export function clampJobMaxDaysOld(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return JOB_MAX_AGE_DAYS;
  return Math.max(1, Math.min(Math.floor(value), JOB_MAX_AGE_DAYS));
}
