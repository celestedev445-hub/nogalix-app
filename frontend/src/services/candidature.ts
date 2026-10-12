import { makeRequest } from "@/lib/makeRequest";
import type { CvData } from "@/lib/cvTypes";

export type CandidatureOutput = "checklist" | "cv" | "letter";

export type ChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type CandidatureResult = {
  source?: "gemini" | "local" | string;
  offer_title?: string;
  checklist?: {
    job_title?: string;
    company?: string | null;
    keywords_found?: string[];
    keywords_missing?: string[];
    items?: ChecklistItem[];
    summary?: string;
  };
  letter?: { title?: string; body?: string };
  cv?: Partial<CvData> & Record<string, unknown>;
  capabilities?: { checklist?: boolean; cv?: boolean; letter?: boolean };
};

export async function generateCandidature(body: {
  offer_text: string;
  cv_id?: string | null;
  outputs: CandidatureOutput[];
  cv_snapshot?: CvData | null;
}) {
  const payload = (await makeRequest("candidature/generate", "POST", body, true, false)) as {
    data?: CandidatureResult;
    message?: string;
  };
  return payload.data as CandidatureResult;
}
