export const APP_CHROME_MAX = 1279;

export function isAppTabActive(pathname: string, href: string, match: string[] = []) {
  if (href === "/" || href === "/dashboard" || href === "/admin") {
    return pathname === href;
  }
  const prefixes = [href, ...match];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isToolsPath(pathname: string) {
  return pathname.startsWith("/convertir") || pathname.startsWith("/editer") || pathname.startsWith("/image");
}

export function modulePageTitle(pathname: string) {
  if (pathname === "/dashboard") return "Accueil";
  if (pathname === "/cv") return "Mes CV";
  if (pathname === "/cv/nouveau") return "Nouveau CV";
  if (pathname.startsWith("/cv/") && pathname.endsWith("/voix")) return "Dictée vocale";
  if (/^\/cv\/[^/]+$/.test(pathname)) return "Éditeur";
  if (pathname.startsWith("/modeles")) return "Modèles";
  if (pathname.startsWith("/convertir")) return "Convertir";
  if (pathname.startsWith("/editer")) return "Éditer";
  if (pathname.startsWith("/image")) return "Image";
  if (pathname.startsWith("/analyse")) return "Analyse IA";
  if (pathname.startsWith("/candidature")) return "Candidature";
  if (pathname.startsWith("/documents")) return "Documents";
  if (pathname.startsWith("/emploi") || pathname.startsWith("/carriere")) return "Emploi";
  if (pathname.startsWith("/profil")) return "Profil";
  if (pathname.startsWith("/plans")) return "Plans";
  if (pathname.startsWith("/support")) return "Support";
  return "Nogalix";
}

export function vitrinePageTitle(pathname: string) {
  if (pathname === "/") return "Accueil";
  if (pathname.startsWith("/modeles")) return "Modèles";
  if (pathname.startsWith("/convertir")) return "Convertir";
  if (pathname.startsWith("/editer")) return "Éditer";
  if (pathname.startsWith("/image")) return "Image";
  if (pathname.startsWith("/emploi") || pathname.startsWith("/carriere")) return "Emploi";
  if (pathname.startsWith("/plans")) return "Plans";
  if (pathname.startsWith("/faq")) return "FAQ";
  if (pathname.startsWith("/contact")) return "Contact";
  if (pathname.startsWith("/auth/login")) return "Connexion";
  if (pathname.startsWith("/auth/signup")) return "Créer un compte";
  if (pathname.startsWith("/auth/reset-password")) return "Mot de passe";
  if (pathname.startsWith("/mentions-legales")) return "Mentions légales";
  if (pathname.startsWith("/cgu")) return "CGU";
  if (pathname.startsWith("/politique-confidentialite")) return "Confidentialité";
  return "Nogalix";
}

export function adminPageTitle(pathname: string) {
  if (pathname === "/admin") return "Vue d'ensemble";
  if (pathname.startsWith("/admin/utilisateurs")) return "Utilisateurs";
  if (pathname.startsWith("/admin/plans")) return "Plans";
  if (pathname.startsWith("/admin/paiements")) return "Paiements";
  if (pathname.startsWith("/admin/cvs")) return "CV";
  if (pathname.startsWith("/admin/messages")) return "Messages";
  return "Administration";
}

export function isModuleEditorPath(pathname: string) {
  return /^\/cv\/[^/]+$/.test(pathname) && pathname !== "/cv/nouveau";
}

export function isVitrineAuthPath(pathname: string) {
  return pathname.startsWith("/auth");
}
