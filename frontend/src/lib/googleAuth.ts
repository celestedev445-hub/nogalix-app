import { appConfig } from "@/lib/appConfig";

export function googleClientId() {
  return appConfig.googleClientId.trim();
}

export function isGoogleAuthConfigured() {
  return Boolean(googleClientId());
}
