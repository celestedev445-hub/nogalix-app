import type { PlanTierLabel } from "@/components/plan/PlanFeatureBadge";

export type ProductTool = {
  id: string;
  title: string;
  text: string;
  href: string;
  plan: PlanTierLabel;
};

/** Outils récents à mettre en avant sur les accueil vitrine et connecté. */
export const productTools: ProductTool[] = [
  {
    id: "convert",
    title: "Convertir",
    text: "PDF et Word, PNG ou texte, sans compte.",
    href: "/convertir",
    plan: "gratuit",
  },
  {
    id: "import",
    title: "Éditer",
    text: "PDF, Word ou texte, même éditeur que dans l’espace.",
    href: "/editer",
    plan: "gratuit",
  },
  {
    id: "image",
    title: "Texte d'une image",
    text: "Modifiez le texte d'une image ou extrayez-le, mise en forme gardée.",
    href: "/image",
    plan: "gratuit",
  },
  {
    id: "translate",
    title: "Traduire",
    text: "Passez le CV dans une autre langue, contacts intacts.",
    href: "/cv",
    plan: "essai-ia",
  },
  {
    id: "candidature",
    title: "Candidature IA",
    text: "CV adapté, lettre et checklist à partir d'une offre.",
    href: "/candidature",
    plan: "essai-ia",
  },
  {
    id: "emploi",
    title: "Emploi",
    text: "Offres récentes. Connexion pour le détail et la source.",
    href: "/emploi",
    plan: "gratuit",
  },
];
