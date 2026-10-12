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
    text: "Des mises en page soignées, prêtes à envoyer.",
    image: "/images/modele-cv.png",
    alt: "Pile de modèles de CV",
  },
  {
    title: "Compatible ATS",
    text: "Analyse IA, score et actions pour passer les filtres recruteurs.",
    image: "/images/ats.png",
    alt: "Score de compatibilité ATS",
  },
  {
    title: "Formats",
    text: "Convertissez PDF et Word sans compte, ou importez pour éditer.",
    image: "/images/formats.png",
    alt: "Import et export PDF et Word",
  },
  {
    title: "Assistant vocal",
    text: `Parlez au micro : ${appConfig.assistantFirstName} écoute votre parcours et rédige le CV.`,
    image: "/images/assistantIA.png",
    alt: "Assistant vocal qui écoute et rédige le CV",
  },
  {
    title: "Génération de documents",
    text: "CV, lettre de motivation et documents prêts à partir d'une offre.",
    image: "/images/generationDoc.png",
    alt: "Génération de CV et documents de candidature",
  },
  {
    title: "Traduction de CV",
    text: "Passez votre CV dans une autre langue, contacts et format intacts.",
    image: "/images/traductionCv.png",
    alt: "Traduction de CV dans plusieurs langues",
  },
];
