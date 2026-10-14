import { appConfig } from "@/lib/appConfig";

export type HomeHighlight = {
  title: string;
  text: string;
  image: string;
  alt: string;
};

/** Cartes image + texte — accueil vitrine uniquement. */
export const homeHighlights: HomeHighlight[] = [
  {
    title: "Modèles",
    text: "Choisissez un modèle, remplissez, c'est prêt.",
    image: "/images/modele-cv.png",
    alt: "Pile de modèles de CV",
  },
  {
    title: "Vérifier votre CV",
    text: "Recevez une note et des conseils pour l'améliorer.",
    image: "/images/ats.png",
    alt: "Score de compatibilité ATS",
  },
  {
    title: "PDF et Word",
    text: "Transformez un PDF en Word, ou l'inverse. Sans compte.",
    image: "/images/formats.png",
    alt: "Import et export PDF et Word",
  },
  {
    title: "Parler au micro",
    text: `Racontez votre parcours, ${appConfig.assistantFirstName} écrit le CV.`,
    image: "/images/assistantIA-detoure.png",
    alt: "Assistant vocal qui écoute et rédige le CV",
  },
  {
    title: "Lettre de motivation",
    text: "Collez une offre, recevez le CV et la lettre adaptés.",
    image: "/images/generationDoc.png",
    alt: "Génération de CV et documents de candidature",
  },
  {
    title: "Traduction",
    text: "Traduisez votre CV dans une autre langue en un clic.",
    image: "/images/traductionCv.png",
    alt: "Traduction de CV dans plusieurs langues",
  },
];
