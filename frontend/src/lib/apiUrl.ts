/**
 * L'API est servie par le même serveur que le site (`/api/*`). Le cookie de
 * session HttpOnly est envoyé automatiquement et converti en jeton Bearer par
 * le serveur — le jeton n'est jamais lisible en JavaScript.
 */
export function apiUrl(path = "") {
  const suffix = path.replace(/^\//, "");
  return suffix ? `/api/${suffix}` : "/api";
}
