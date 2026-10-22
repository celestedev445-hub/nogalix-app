import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  detectMesombCountry,
  formatPhoneForMesomb,
  mesombCountryByIso2,
  MESOMB_COUNTRIES,
  MESOMB_PHONE_COUNTRIES,
} from "@/lib/mesombCountries";

function withPlus(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const LOCATION_COUNTRY: Record<string, string> = {
  cameroun: "cm",
  cameroon: "cm",
  france: "fr",
  belgique: "be",
  belgium: "be",
  canada: "ca",
  cotedivoire: "ci",
  ivorycoast: "ci",
  senegal: "sn",
  suisse: "ch",
  switzerland: "ch",
  allemagne: "de",
  germany: "de",
  espagne: "es",
  spain: "es",
  italie: "it",
  italy: "it",
  luxembourg: "lu",
  maroc: "ma",
  morocco: "ma",
  tunisie: "tn",
  tunisia: "tn",
  algerie: "dz",
  algeria: "dz",
  gabon: "ga",
  congo: "cg",
  rdc: "cd",
  rdcongo: "cd",
  mali: "ml",
  togo: "tg",
  benin: "bj",
  burkinafaso: "bf",
  niger: "ne",
  nigeria: "ng",
  kenya: "ke",
  ouganda: "ug",
  uganda: "ug",
  zambie: "zm",
  zambia: "zm",
  sierraleone: "sl",
  tanzanie: "tz",
  tanzania: "tz",
  malawi: "mw",
  guinee: "gn",
  madagascar: "mg",
  rwanda: "rw",
  etatsunis: "us",
  usa: "us",
  unitedstates: "us",
  royaumeuni: "gb",
  unitedkingdom: "gb",
};

/** Valeur saisie (souvent sans « + ») → E.164 si valide, sinon +chiffres. */
export function phoneFromInputValue(value: string): string {
  const international = withPlus(value);
  if (!international) return "";
  const parsed = parsePhoneNumberFromString(international);
  return parsed?.isValid() ? parsed.number : international;
}

/** react-phone-input-2 attend les chiffres, sans préfixe +. */
export function phoneToInputValue(value?: string): string {
  return String(value ?? "").replace(/^\+/, "").replace(/\s/g, "");
}

export function countryFromPhone(value?: string): string {
  const international = withPlus(value ?? "");
  if (!international) return "";
  return parsePhoneNumberFromString(international)?.country?.toLowerCase() || "";
}

export function countryFromLocation(location?: string): string {
  const raw = String(location ?? "").trim();
  if (!raw) return "";
  const parts = raw.split(",").map((part) => normalizeKey(part)).filter(Boolean);
  const candidates = parts.length ? [parts[parts.length - 1], ...parts] : [];
  for (const key of candidates) {
    if (LOCATION_COUNTRY[key]) return LOCATION_COUNTRY[key];
  }
  return "";
}

export function resolvePhoneCountry(phone?: string, location?: string): string {
  return countryFromPhone(phone) || countryFromLocation(location) || "fr";
}

export function isValidPhone(value: string): boolean {
  const international = withPlus(value);
  if (!international) return false;
  return Boolean(parsePhoneNumberFromString(international)?.isValid());
}

/**
 * Validation Mobile Money : longueurs nationales MeSomb (ex. Bénin 10 chiffres),
 * pas seulement libphonenumber.
 */
export function isValidMesombMobile(value: string, fallbackIso2?: string | null): boolean {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits) return false;

  const country = detectMesombCountry(digits, fallbackIso2);
  const local = formatPhoneForMesomb(digits, fallbackIso2);
  if (local.length === country.localLen) return true;

  const parsed = parsePhoneNumberFromString(withPlus(value));
  if (!parsed?.isValid()) return false;
  const iso = (parsed.country || "").toLowerCase();
  return (MESOMB_PHONE_COUNTRIES as readonly string[]).includes(iso)
    && MESOMB_COUNTRIES.some((c) => c.iso2 === iso);
}
