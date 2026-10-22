import { parseAdminEmails } from "@/lib/security";

/**
 * Configuration publique injectée par le serveur Python dans la page
 * (`window.__NOGALIX_CONFIG__`, voir backend/app/web/public_config.py).
 * Une seule source : le fichier .env du serveur — plus de variables figées au build.
 */
type PublicConfig = Partial<{
  appName: string;
  appShortName: string;
  appUrl: string;
  googleClientId: string;
  turnstileSiteKey: string;
  assistantName: string;
  assistantFirstName: string;
  contactEmail: string;
  supportEmail: string;
  contactPhone: string;
  cbcName: string;
  cbcUrl: string;
  adminEmails: string;
  onlyOfficeUrl: string;
}>;

declare global {
  interface Window {
    __NOGALIX_CONFIG__?: PublicConfig;
  }
}

// `globalThis` = `window` dans le navigateur ; le pré-rendu (entry-server) y place la même configuration.
const injected: PublicConfig =
  (globalThis as typeof globalThis & { __NOGALIX_CONFIG__?: PublicConfig }).__NOGALIX_CONFIG__ || {};

function read(key: keyof PublicConfig, fallback = "") {
  const value = injected[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export const appConfig = {
  name: read("appName", "Nogalix"),
  shortName: read("appShortName", "Nogalix"),
  logoSrc: "/logo.png",
  logoCourtSrc: "/logoCourt.png",
  appUrl: read("appUrl"),
  googleClientId: read("googleClientId"),
  turnstileSiteKey: read("turnstileSiteKey"),
  assistantName: read("assistantName", "Noga"),
  assistantFirstName: read("assistantFirstName", "Noga"),
  contactEmail: read("contactEmail", "contact@nogalix.avexsolution.com"),
  supportEmail: read("supportEmail", ""),
  contactPhone: read("contactPhone", ""),
  cbcName: read("cbcName", "CBC"),
  cbcUrl: read("cbcUrl", "https://contactsbusinesscenter.com"),
  /** Optional bootstrap emails treated as admin if DB role not yet refreshed. */
  adminEmails: parseAdminEmails(read("adminEmails")),
  onlyOfficeUrl: read("onlyOfficeUrl"),
  onlyOfficeEnabled: Boolean(read("onlyOfficeUrl")),
} as const;
