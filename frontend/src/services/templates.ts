import { makeRequest } from "@/lib/makeRequest";

export async function listTemplates() {
  return makeRequest("templates", "GET", null, false, false);
}
