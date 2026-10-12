export type MatchVerdict = "forte" | "partielle" | "faible";

export type CvMatchAction = {
  title: string;
  detail: string;
};

export type CvMatchAnalysis = {
  matchScore: number;
  verdict: MatchVerdict;
  verdictLabel: string;
  summary: string;
  alignedPoints: string[];
  gaps: string[];
  actions: CvMatchAction[];
  source: "ai" | "local";
  cvLabel: string;
  jobTitle?: string | null;
  cvId?: string | null;
};

export function verdictTone(verdict: MatchVerdict) {
  if (verdict === "forte") {
    return {
      ring: "text-succes",
      badge: "bg-emerald-50 text-succes",
      label: "text-succes",
    };
  }
  if (verdict === "partielle") {
    return {
      ring: "text-amber-500",
      badge: "bg-amber-50 text-amber-700",
      label: "text-amber-700",
    };
  }
  return {
    ring: "text-red-500",
    badge: "bg-red-50 text-red-600",
    label: "text-red-600",
  };
}
