import { NetworkError } from "@/lib/networkError";
import { toast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/apiUrl";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function makeRequest(
  endpoint: string,
  method: HttpMethod = "GET",
  data: unknown = null,
  requiresToken = false,
  showError = true,
  options: { signal?: AbortSignal } = {},
) {
  const url = apiUrl(endpoint);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  // Bearer is injected by the server from the HttpOnly cookie — never read token in JS.
  // `requiresToken` kept for call-site clarity (401 handling still applies).
  void requiresToken;

  const init: RequestInit = {
    method,
    headers,
    credentials: "include",
    ...(options.signal ? { signal: options.signal } : {}),
  };

  if (data instanceof FormData) {
    init.body = data;
  } else if (data != null && method !== "GET") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(data);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    const error = new NetworkError(
      "Impossible de joindre le serveur. Vérifiez votre connexion.",
    );
    if (showError) {
      toast({
        title: "Connexion interrompue",
        description: error.message,
        variant: "destructive",
      });
    }
    throw error;
  }

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload, response.status);
    const error = new NetworkError(message, response.status);
    if (showError) {
      toast({
        title: response.status === 401 ? "Session expirée" : "Une erreur est survenue",
        description: message,
        variant: "destructive",
      });
    }
    throw error;
  }

  return payload;
}

function extractErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const body = payload as {
      message?: string;
      error?: string;
      detail?: string | { message?: string } | Array<{ msg?: string; message?: string }>;
    };
    if (typeof body.message === "string" && body.message) return body.message;
    if (typeof body.error === "string" && body.error) return body.error;
    if (typeof body.detail === "string" && body.detail) return body.detail;
    if (body.detail && typeof body.detail === "object" && !Array.isArray(body.detail)) {
      if (typeof body.detail.message === "string" && body.detail.message) return body.detail.message;
    }
    if (Array.isArray(body.detail) && body.detail.length) {
      const first = body.detail[0];
      if (first && typeof first === "object") {
        if (typeof first.msg === "string" && first.msg) return first.msg;
        if (typeof first.message === "string" && first.message) return first.message;
      }
    }
    const errors = (body as { errors?: Record<string, string[]> }).errors;
    if (errors && typeof errors === "object") {
      const firstField = Object.keys(errors)[0];
      const firstError = firstField ? errors[firstField]?.[0] : undefined;
      if (firstError) return firstError;
    }
  }
  if (status === 401) return "Veuillez vous reconnecter.";
  if (status === 403) return "Vous n'avez pas accès à cette ressource.";
  if (status === 404) return "Ressource introuvable.";
  if (status === 422) return "Les informations saisies sont invalides.";
  return "Une erreur inattendue s'est produite.";
}
