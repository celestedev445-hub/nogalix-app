import { appConfig } from "@/lib/appConfig";

export const assistantCopy = {
  greetingVitrine: (firstName?: string) =>
    `Bonjour${firstName ? ` ${firstName}` : ""} ! Je suis ${appConfig.assistantFirstName || appConfig.assistantName || "l'assistante"} de ${appConfig.name}. Je peux vous aider à choisir un modèle, comprendre les sections d'un CV ou préparer un export.`,
  greetingApp: (firstName?: string) =>
    `Bonjour${firstName ? ` ${firstName}` : ""} ! Comment puis-je vous aider aujourd'hui ? Vous pouvez saisir au clavier ou me parler.`,
  welcomeNewCv:
    "Pour créer un CV, choisissez un modèle puis remplissez l'éditeur. Je peux rédiger ou reformuler chaque section.",
  templates:
    "Les modèles moderne, minimaliste, créatif, classique et premium s'adaptent à votre métier. Vous pouvez en changer plus tard sans perdre vos données.",
  sections:
    "Un CV complet contient : identité, accroche, expériences, formations, compétences, langues, projets, certifications, centres d'intérêt et références.",
  export:
    "Vous pouvez prévisualiser votre CV, l'enregistrer, puis l'exporter en PDF ou l'imprimer depuis l'éditeur.",
  saisieVsVoix:
    "Saisie : vous remplissez les champs étape par étape. Voix : vous parlez, j'organise le contenu dans les champs. Vous pouvez aussi écrire dans le fil à tout moment.",
  micDenied:
    "L'accès au microphone a été refusé. Vous pouvez continuer à écrire dans le fil, ou autoriser le micro dans les paramètres du navigateur.",
  online: "En ligne",
  placeholder: "Posez-moi une question…",
  clickToSpeak: "Cliquez pour parler",
  listening: "J'écoute…",
  mute: "Couper la lecture",
  unmute: "Activer la lecture",
};

export type AssistantZone = "vitrine" | "app" | "cv";

export const voiceCvCopy = {
  greeting: (firstName?: string) =>
    `Bonjour${firstName ? ` ${firstName}` : ""} ! Je suis ${appConfig.assistantFirstName || appConfig.assistantName || "Noga"}. Parlez-moi de vous : prénom, nom, métier, expériences… Je remplis votre CV au fur et à mesure. Le clavier reste disponible.`,
  placeholder: "Dictez ou écrivez une info pour votre CV…",
  listening: "J'écoute…",
  clickToSpeak: "Appuyer pour parler",
  micDenied:
    "L'accès au microphone a été refusé. Vous pouvez continuer à écrire dans le fil.",
  unsupported:
    "La reconnaissance vocale n'est pas disponible dans ce navigateur. Écrivez dans le fil.",
};

export function dayPartGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function assistantPeekLine(
  pathname: string,
  zone: AssistantZone = "vitrine",
  date = new Date(),
): string {
  const hi = dayPartGreeting(date);
  const name = appConfig.assistantFirstName || appConfig.assistantName || "Noga";

  if (zone === "app") {
    if (pathname.startsWith("/cv")) {
      return `${hi}, tu veux que je t’aide à rédiger ton CV ?`;
    }
    if (pathname.startsWith("/emploi") || pathname.startsWith("/carriere")) {
      return `${hi}, besoin d’un coup de main pour les offres ?`;
    }
    if (pathname.startsWith("/candidature")) {
      return `${hi}, colle une offre et je t’aide pour le CV, la lettre ou la checklist.`;
    }
    if (pathname.startsWith("/documents")) {
      return `${hi}, je t’aide pour une lettre si tu veux.`;
    }
    if (pathname.startsWith("/analyse")) {
      return `${hi}, on regarde l’analyse ATS ensemble ?`;
    }
    return `${hi}, moi c’est ${name}. Tu veux que je t’aide ?`;
  }

  if (pathname.startsWith("/modeles")) {
    return `${hi}, besoin d’un coup de main pour choisir un modèle ?`;
  }
  if (pathname.startsWith("/convertir")) {
    return `${hi}, je peux t’expliquer la conversion PDF ↔ Word.`;
  }
  if (pathname.startsWith("/editer")) {
    return `${hi}, dépose un PDF ou un Word et je t’ouvre le même éditeur.`;
  }
  if (pathname.startsWith("/image")) {
    return `${hi}, dépose une image : je lis son texte pour que tu le modifies ou l’extraies.`;
  }
  if (pathname.startsWith("/plans")) {
    return `${hi}, une question sur les offres ?`;
  }
  if (pathname.startsWith("/faq") || pathname.startsWith("/contact")) {
    return `${hi}, tu veux que je t’aide ?`;
  }
  return `${hi}, moi c’est ${name}. Tu veux que je t’aide ?`;
}
