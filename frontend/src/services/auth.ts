import { makeRequest } from "@/lib/makeRequest";
import { applyAuthSession, clearAuthSession } from "@/lib/applyAuthSession";
import { NetworkError } from "@/lib/networkError";

function pickUser(response: {
  user?: Record<string, unknown> | null;
  data?: { user?: Record<string, unknown> | null };
}) {
  return response?.user || response?.data?.user || null;
}

type AuthResponse = {
  user?: Record<string, unknown>;
  data?: { user?: Record<string, unknown> };
};

async function openSession(response: AuthResponse, fallbackMessage: string) {
  const user = pickUser(response);
  if (!user) {
    throw new NetworkError(fallbackMessage);
  }
  // Cookie HttpOnly déjà posé par le serveur (réponse de /api/auth/*).
  await applyAuthSession({ user });
  return response;
}

export async function login(payload: { email: string; password: string }) {
  const response = (await makeRequest("auth/login", "POST", payload, false, false)) as AuthResponse;
  return openSession(response, "Connexion impossible. Vérifiez vos identifiants.");
}

export async function signup(payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}) {
  const response = (await makeRequest("auth/register", "POST", payload, false, false)) as AuthResponse;
  return openSession(response, "Inscription impossible. Réessayez plus tard.");
}

export async function logout() {
  try {
    await makeRequest("auth/logout", "POST", null, true, false);
  } finally {
    await clearAuthSession();
  }
}

export async function getMe() {
  return makeRequest("auth/user", "GET", null, true, false);
}

export async function loginWithGoogle(payload: {
  code?: string;
  id_token?: string;
  credential?: string;
  access_token?: string;
}) {
  const idToken = payload.id_token || payload.credential;
  const response = (await makeRequest(
    "auth/google",
    "POST",
    {
      ...(payload.code ? { code: payload.code } : {}),
      ...(idToken ? { id_token: idToken, credential: idToken } : {}),
      ...(payload.access_token ? { access_token: payload.access_token } : {}),
    },
    false,
    false,
  )) as AuthResponse;
  return openSession(response, "Connexion Google impossible.");
}

export async function forgotPassword(payload: { email: string }) {
  return makeRequest("auth/forgot-password", "POST", payload, false, false) as Promise<{
    message?: string;
  }>;
}

export async function resetPassword(payload: {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
}) {
  return makeRequest("auth/reset-password", "POST", payload, false, false) as Promise<{
    message?: string;
  }>;
}
