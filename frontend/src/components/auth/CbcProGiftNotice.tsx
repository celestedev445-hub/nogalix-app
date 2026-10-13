import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const OFFERS = {
  basic: {
    title: "Forfait Gratuit activé",
    description:
      "Votre connexion avec CBC active le forfait Gratuit, celui de votre pack Basic. Il est actif sur votre compte.",
  },
  pro: {
    title: "Forfait Pro offert",
    description:
      "Votre connexion avec CBC vous offre le forfait Pro, celui de votre pack Pro. Il est actif sur votre compte.",
  },
  gold: {
    title: "Forfait Premium offert",
    description:
      "Votre connexion avec CBC vous offre le forfait Premium, celui de votre pack Gold. Il est actif sur votre compte.",
  },
  free: {
    title: "Forfait Gratuit activé",
    description:
      "Votre connexion avec CBC active le forfait Gratuit. Il est actif sur votre compte.",
  },
} as const;

type CbcOffer = keyof typeof OFFERS;

function isOffer(value: string | null): value is CbcOffer {
  return value === "basic" || value === "pro" || value === "gold" || value === "free";
}

/**
 * Après un retour CBC qui vient d'aligner le forfait (`?cbc_offer=pro`),
 * affiche l'alerte une fois puis retire le paramètre de l'adresse.
 */
export function CbcProGiftNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get("cbc_offer");
    const legacyPro = url.searchParams.get("cbc_pro") === "1" ? "pro" : null;
    const fromUrl = isOffer(fromQuery) ? fromQuery : legacyPro;
    const pending = sessionStorage.getItem("cbc_offer_notice");
    const offer = fromUrl || (isOffer(pending) ? pending : null);
    if (!offer) return;
    if (fromUrl) {
      url.searchParams.delete("cbc_offer");
      url.searchParams.delete("cbc_pro");
      const search = url.searchParams.toString();
      window.history.replaceState(null, "", `${url.pathname}${search ? `?${search}` : ""}${url.hash}`);
      sessionStorage.setItem("cbc_offer_notice", offer);
    }
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem("cbc_offer_notice");
      const copy = OFFERS[offer];
      toast({
        title: copy.title,
        description: copy.description,
        variant: "success",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
