import { useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "@/platform/navigation";
import { emptyCv } from "@/lib/demoData";
import { templatesCatalog } from "@/lib/templatesCatalog";
import { useAuthStore } from "@/store/authStore";
import { useCvStore } from "@/store/cvStore";
import { toast } from "@/hooks/use-toast";
import { canUseCapability, capabilityLimit } from "@/lib/planCapabilities";
import { markCvEntryOrigin, markNewCvEditingSession } from "@/lib/cvEditorSession";

export function useCreateCvFromTemplate() {
  const router = useRouter();
  const upsert = useCvStore((s) => s.upsert);
  const items = useCvStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const authenticated = useAuthStore((s) => s.authenticated);
  const canPremium = canUseCapability(user, "templates.premium");
  const cvLimit = capabilityLimit(user, "cv.max");
  const [saving, setSaving] = useState(false);

  async function createCv(templateId: string) {
    if (!templateId || saving) return;
    const selected = templatesCatalog.find((item) => item.id === templateId);

    if (!authenticated) {
      const next = `/cv/nouveau?modele=${encodeURIComponent(templateId)}`;
      router.push(`/auth/signup?suivant=${encodeURIComponent(next)}`);
      return;
    }

    if (cvLimit !== null && cvLimit !== -1 && items.length >= cvLimit) {
      toast({
        title: "Limite de CV atteinte",
        description: `Votre plan autorise ${cvLimit} CV. Passez à Pro pour en créer davantage.`,
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }
    if (selected?.premium && !canPremium) {
      toast({
        title: "Modèle réservé",
        description: "Ce modèle nécessite le plan Pro ou Premium.",
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }

    flushSync(() => {
      setSaving(true);
    });

    try {
      const nameParts = (user?.name || "").split(" ").filter(Boolean);
      const cv = emptyCv({
        templateId,
        title: "Nouveau CV",
        identity: {
          firstName: user?.first_name || nameParts[0] || "",
          lastName: user?.last_name || nameParts.slice(1).join(" ") || "",
          title: "",
          email: user?.email || "",
          phone: user?.phone || "",
          location: user?.location || "",
          photo: user?.avatar ?? null,
          website: "",
          github: "",
        },
      });

      await upsert(cv, false);
      markNewCvEditingSession(cv.id);
      markCvEntryOrigin(cv.id, "nouveau");

      router.push(`/cv/${cv.id}`);
      setSaving(false);

      void upsert(cv, true).catch((error) => {
        toast({
          title: "Synchronisation en attente",
          description:
            error instanceof Error
              ? error.message
              : "Votre CV est ouvert localement. La sauvegarde serveur reprendra automatiquement.",
          variant: "destructive",
        });
      });
    } catch (error) {
      setSaving(false);
      toast({
        title: "Création impossible",
        description: error instanceof Error ? error.message : "Vérifiez votre plan ou réessayez.",
        variant: "destructive",
      });
    }
  }

  return { saving, createCv };
}
