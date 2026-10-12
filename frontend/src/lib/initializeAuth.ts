import { useAuthStore } from "@/store/authStore";
import { getMe } from "@/services/auth";
import { clearAuthSession } from "@/lib/applyAuthSession";
import { purgeLegacyLocalData, resetUserDataStores } from "@/lib/resetUserData";
import { isNetworkError } from "@/lib/networkError";
import { isProtectedPath, loginUrlFor } from "@/lib/protectedRoutes";

type SessionProbe = {
  authenticated?: boolean;
};

/** Le serveur a laissé passer (cookie présent) mais l'API refuse le jeton. */
function redirectToLoginIfProtected() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (!isProtectedPath(pathname)) return;
  window.location.replace(loginUrlFor(`${pathname}${search || ""}`));
}

export async function initializeAuth() {
  const store = useAuthStore.getState();
  purgeLegacyLocalData();

  // Purge legacy non-HttpOnly authToken leftovers (HttpOnly cookie is untouched).
  if (typeof document !== "undefined") {
    document.cookie = "authToken=; Path=/; Max-Age=0; SameSite=Lax";
  }

  let session: SessionProbe = { authenticated: false };
  try {
    const response = await fetch("/api/auth/cookie", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (response.ok) {
      session = (await response.json()) as SessionProbe;
    }
  } catch {
    /* offline / first paint */
  }

  if (!session.authenticated) {
    if (store.authenticated) {
      resetUserDataStores();
      store.reset();
    }
    store.setHydrated(true);
    return;
  }

  try {
    const me = (await getMe()) as { data?: unknown; user?: unknown };
    const user = (me?.data ?? me?.user ?? me) as Record<string, unknown>;
    if (user && typeof user === "object") {
      const current = store.user;
      const changed = Boolean(
        current && current.id != null && user.id != null && String(current.id) !== String(user.id),
      );
      if (changed) resetUserDataStores();
      // /auth/user inclut déjà plan + capabilities — pas de 3e requête.
      store.setUser({
        ...(changed ? {} : current || {}),
        ...user,
        role: (user.role as string) || "user",
        is_admin: Boolean(user.is_admin) || (user.role as string) === "admin",
      });
      store.setAuthenticated(true);
    }
  } catch (error) {
    if (isNetworkError(error) && error.status === 401) {
      // Le serveur a déjà effacé le cookie ; on nettoie l'état client puis on renvoie vers la connexion.
      await clearAuthSession();
      redirectToLoginIfProtected();
    }
    // Autres erreurs (serveur injoignable, 5xx) : la session est conservée.
  } finally {
    store.setHydrated(true);
  }
}
