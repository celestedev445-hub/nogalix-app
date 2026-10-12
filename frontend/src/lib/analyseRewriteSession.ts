import type { CvMatchAction } from "@/lib/cvMatchAnalysis";

export type AnalyseRewriteContext = {
  jobOffer: string;
  jobTitle?: string | null;
  actions: CvMatchAction[];
};

const PREFIX = "nogalix:analyse-rewrite:";

export function storeAnalyseRewriteContext(cvId: string, context: AnalyseRewriteContext) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${PREFIX}${cvId}`, JSON.stringify(context));
}

export function readAnalyseRewriteContext(cvId: string): AnalyseRewriteContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${cvId}`);
    if (!raw) return null;
    return JSON.parse(raw) as AnalyseRewriteContext;
  } catch {
    return null;
  }
}
