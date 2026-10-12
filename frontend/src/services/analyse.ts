import { makeRequest } from "@/lib/makeRequest";
import type { CvMatchAnalysis } from "@/lib/cvMatchAnalysis";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Lecture du fichier impossible."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Lecture du fichier impossible."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

export async function extractResumeText(file: File) {
  const contentBase64 = await fileToBase64(file);
  return makeRequest("cv/analyse/upload", "POST", {
    fileName: file.name,
    contentBase64,
  }, true, false) as Promise<{
    text: string;
    fileName: string;
  }>;
}

export async function matchCvToOffer(payload: {
  jobOffer: string;
  cvId?: string;
  resumeText?: string;
  fileName?: string;
}) {
  return makeRequest("cv/analyse/match", "POST", payload, true, false) as Promise<CvMatchAnalysis>;
}

export async function rewriteCvFromAnalyse(payload: {
  jobOffer: string;
  templateId: string;
  cvId?: string;
  resumeText?: string;
  fileName?: string;
  jobTitle?: string | null;
  actions?: CvMatchAnalysis["actions"];
}) {
  return makeRequest("cv/analyse/rewrite", "POST", payload, true, false) as Promise<{
    payload: Record<string, unknown>;
    source: "ai" | "local";
  }>;
}
