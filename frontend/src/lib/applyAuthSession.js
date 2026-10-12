import { useAuthStore } from "@/store/authStore";
import { resetUserDataStores } from "@/lib/resetUserData";

async function deleteAuthCookie() {
  await fetch("/api/auth/cookie", {
    method: "DELETE",
    credentials: "include",
  }).catch(() => undefined);
}

/** Même compte : pas d'utilisateur courant → non ; id absent d'un côté → même compte (mise à jour partielle). */
function isSameAccount(current, next) {
  if (!current) return false;
  if (current.id == null || next?.id == null) return true;
  return String(current.id) === String(next.id);
}

/**
 * Met à jour le store d'authentification côté client. Le jeton n'est jamais
 * manipulé ici : il est posé en cookie HttpOnly par le serveur (`/api/auth/*`).
 *
 * - Nouvel utilisateur (id différent) → réinitialise les stores de données.
 * - Même utilisateur (mise à jour de profil) → fusion, `plan` / `capabilities` conservés.
 */
export async function applyAuthSession({ user } = {}) {
  const store = useAuthStore.getState();
  const current = store.user;

  if (user) {
    const same = isSameAccount(current, user);
    if (!same) {
      resetUserDataStores();
    }
    store.setUser(same ? { ...current, ...user } : user);
  }

  store.setAuthenticated(Boolean(user || useAuthStore.getState().user));
}

export async function clearAuthSession() {
  await deleteAuthCookie();
  resetUserDataStores();
  useAuthStore.getState().reset();
}
