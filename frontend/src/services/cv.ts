import { makeRequest } from "@/lib/makeRequest";

export async function listCvs() {
  return makeRequest("cv", "GET", null, true, false);
}

export async function getCv(id: string | number) {
  return makeRequest(`cv/${id}`, "GET", null, true, false);
}

export async function createCv(payload: Record<string, unknown>) {
  return makeRequest("cv", "POST", payload, true, false);
}

export async function updateCv(id: string | number, payload: Record<string, unknown>) {
  return makeRequest(`cv/${id}`, "PUT", payload, true, false);
}

export async function deleteCv(id: string | number) {
  return makeRequest(`cv/${id}`, "DELETE", null, true, false);
}

export async function analyzeCv(id: string | number, jobOffer = "") {
  return makeRequest(`cv/${id}/analyse`, "POST", { jobOffer }, true, false);
}

export async function translateCv(payload: {
  languageCode: string;
  languageName: string;
  cv: Record<string, unknown>;
}) {
  return makeRequest("cv/translate", "POST", payload, true, false) as Promise<{
    payload: Record<string, unknown>;
    source: "ai";
    languageName: string;
  }>;
}
