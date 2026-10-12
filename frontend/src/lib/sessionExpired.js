import { clearAuthSession } from "@/lib/applyAuthSession";
import { makeRequest } from "@/lib/makeRequest";
import { toast } from "@/hooks/use-toast";

let expiring = false;

export async function handleSessionExpired(message) {
  if (expiring) return;
  expiring = true;
  try {
    // Révoque la session côté serveur (qui efface aussi le cookie HttpOnly).
    await makeRequest("auth/logout", "POST", null, true, false);
  } catch {
    /* session déjà invalide ou serveur injoignable : on efface quand même */
  }
  await clearAuthSession();
  toast({
    title: "Session expirée",
    description: message || "Veuillez vous reconnecter pour continuer.",
    variant: "destructive",
  });
  if (typeof window !== "undefined") {
    window.location.href = "/auth/login";
  }
}
