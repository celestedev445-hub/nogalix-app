/** Pays et opérateurs couverts par MeSomb (même liste que CBC). */

export type MesombService =
  | "ORANGE"
  | "MTN"
  | "WAVE"
  | "MOOV"
  | "AIRTEL"
  | "MPESA"
  | "VODACOM"
  | "ZAMTEL"
  | "TNM"
  | "HALOTEL"
  | "YAS";

export type MesombMethod = MesombService | "OM_CM" | "MOMO_CM";

export type MesombCountry = {
  iso: string;
  iso2: string;
  name: string;
  dial: string;
  currency: string;
  localLen: number;
  services: MesombService[];
};

export const MESOMB_COUNTRIES: MesombCountry[] = [
  { iso: "CM", iso2: "cm", name: "Cameroun", dial: "237", currency: "XAF", localLen: 9, services: ["ORANGE", "MTN"] },
  { iso: "CI", iso2: "ci", name: "Côte d'Ivoire", dial: "225", currency: "XOF", localLen: 10, services: ["ORANGE", "MTN", "MOOV", "WAVE"] },
  { iso: "SN", iso2: "sn", name: "Sénégal", dial: "221", currency: "XOF", localLen: 9, services: ["ORANGE", "WAVE"] },
  { iso: "BJ", iso2: "bj", name: "Bénin", dial: "229", currency: "XOF", localLen: 10, services: ["MTN", "MOOV", "WAVE"] },
  { iso: "BF", iso2: "bf", name: "Burkina Faso", dial: "226", currency: "XOF", localLen: 8, services: ["ORANGE", "MOOV", "WAVE"] },
  { iso: "GA", iso2: "ga", name: "Gabon", dial: "241", currency: "XAF", localLen: 9, services: ["AIRTEL"] },
  { iso: "CG", iso2: "cg", name: "Congo", dial: "242", currency: "XAF", localLen: 9, services: ["MTN", "AIRTEL"] },
  { iso: "CD", iso2: "cd", name: "RD Congo", dial: "243", currency: "CDF", localLen: 9, services: ["AIRTEL", "ORANGE", "VODACOM"] },
  { iso: "KE", iso2: "ke", name: "Kenya", dial: "254", currency: "KES", localLen: 9, services: ["MPESA", "AIRTEL"] },
  { iso: "UG", iso2: "ug", name: "Ouganda", dial: "256", currency: "UGX", localLen: 9, services: ["MTN", "AIRTEL"] },
  { iso: "RW", iso2: "rw", name: "Rwanda", dial: "250", currency: "RWF", localLen: 9, services: ["MTN", "AIRTEL"] },
  { iso: "ZM", iso2: "zm", name: "Zambie", dial: "260", currency: "ZMW", localLen: 9, services: ["MTN", "AIRTEL", "ZAMTEL"] },
  { iso: "SL", iso2: "sl", name: "Sierra Leone", dial: "232", currency: "SLE", localLen: 8, services: ["ORANGE"] },
  { iso: "NG", iso2: "ng", name: "Nigeria", dial: "234", currency: "NGN", localLen: 10, services: ["MTN", "AIRTEL"] },
  { iso: "TZ", iso2: "tz", name: "Tanzanie", dial: "255", currency: "TZS", localLen: 9, services: ["VODACOM", "AIRTEL", "HALOTEL", "YAS"] },
  { iso: "MW", iso2: "mw", name: "Malawi", dial: "265", currency: "MWK", localLen: 9, services: ["TNM", "AIRTEL"] },
];

export const MESOMB_PHONE_COUNTRIES = [
  "cm", "ci", "sn", "bj", "bf", "ga", "cg", "cd", "ke", "ug", "rw", "zm", "sl",
  "ng", "tz", "mw",
] as const;

export const MESOMB_SERVICE_LABELS: Record<MesombService, string> = {
  ORANGE: "Orange Money",
  MTN: "MTN MoMo",
  WAVE: "Wave",
  MOOV: "Moov Money",
  AIRTEL: "Airtel Money",
  MPESA: "M-Pesa",
  VODACOM: "M-Pesa Vodacom",
  ZAMTEL: "Zamtel",
  TNM: "TNM Mpamba",
  HALOTEL: "Halotel",
  YAS: "Yas",
};

export const MESOMB_SERVICE_STYLE: Record<
  MesombService,
  { badge: string; badgeClass: string; activeClass: string; hoverClass: string; checkClass: string }
> = {
  ORANGE: { badge: "OM", badgeClass: "bg-orange-500 text-white", activeClass: "border-orange-500 bg-orange-50 ring-2 ring-orange-400/60", hoverClass: "hover:border-orange-300", checkClass: "text-orange-600" },
  MTN: { badge: "MTN", badgeClass: "bg-yellow-400 text-gray-900", activeClass: "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-400/70", hoverClass: "hover:border-yellow-300", checkClass: "text-yellow-600" },
  WAVE: { badge: "WV", badgeClass: "bg-sky-500 text-white", activeClass: "border-sky-500 bg-sky-50 ring-2 ring-sky-400/60", hoverClass: "hover:border-sky-300", checkClass: "text-sky-600" },
  MOOV: { badge: "MV", badgeClass: "bg-blue-700 text-white", activeClass: "border-blue-700 bg-blue-50 ring-2 ring-blue-500/50", hoverClass: "hover:border-blue-300", checkClass: "text-blue-700" },
  AIRTEL: { badge: "AT", badgeClass: "bg-red-600 text-white", activeClass: "border-red-600 bg-red-50 ring-2 ring-red-400/50", hoverClass: "hover:border-red-300", checkClass: "text-red-600" },
  MPESA: { badge: "MP", badgeClass: "bg-green-600 text-white", activeClass: "border-green-600 bg-green-50 ring-2 ring-green-400/50", hoverClass: "hover:border-green-300", checkClass: "text-green-600" },
  VODACOM: { badge: "VD", badgeClass: "bg-red-700 text-white", activeClass: "border-red-700 bg-red-50 ring-2 ring-red-500/50", hoverClass: "hover:border-red-300", checkClass: "text-red-700" },
  ZAMTEL: { badge: "ZT", badgeClass: "bg-emerald-700 text-white", activeClass: "border-emerald-700 bg-emerald-50 ring-2 ring-emerald-500/50", hoverClass: "hover:border-emerald-300", checkClass: "text-emerald-700" },
  TNM: { badge: "TNM", badgeClass: "bg-indigo-600 text-white", activeClass: "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-400/50", hoverClass: "hover:border-indigo-300", checkClass: "text-indigo-600" },
  HALOTEL: { badge: "HL", badgeClass: "bg-violet-600 text-white", activeClass: "border-violet-600 bg-violet-50 ring-2 ring-violet-400/50", hoverClass: "hover:border-violet-300", checkClass: "text-violet-600" },
  YAS: { badge: "YAS", badgeClass: "bg-fuchsia-600 text-white", activeClass: "border-fuchsia-600 bg-fuchsia-50 ring-2 ring-fuchsia-400/50", hoverClass: "hover:border-fuchsia-300", checkClass: "text-fuchsia-600" },
};

export function mapMethodToService(method: string): MesombService | null {
  const m = method.toUpperCase().replace(/[-\s]/g, "_");
  if (m === "OM_CM" || m === "ORANGE" || m === "ORANGE_MONEY") return "ORANGE";
  if (m === "MOMO_CM" || m === "MTN" || m === "MTN_MOMO") return "MTN";
  if (m === "WAVE") return "WAVE";
  if (m === "MOOV" || m === "MOOV_MONEY") return "MOOV";
  if (m === "AIRTEL") return "AIRTEL";
  if (m === "MPESA" || m === "M_PESA") return "MPESA";
  if (m === "VODACOM") return "VODACOM";
  if (m === "ZAMTEL") return "ZAMTEL";
  if (m === "TNM") return "TNM";
  if (m === "HALOTEL") return "HALOTEL";
  if (m === "YAS") return "YAS";
  return null;
}

export function mesombCountryByIso2(iso2?: string | null): MesombCountry | null {
  const code = (iso2 || "").trim().toLowerCase();
  if (!code) return null;
  return MESOMB_COUNTRIES.find((c) => c.iso2 === code) ?? null;
}

export function detectMesombCountry(phone: string, fallbackIso2?: string | null): MesombCountry {
  return mesombDialCountry(phone) ?? mesombCountryByIso2(fallbackIso2) ?? MESOMB_COUNTRIES[0];
}

/** Pays MeSomb seulement si le numéro commence par un indicatif connu (pas un simple fallback). */
export function mesombDialCountry(phone: string): MesombCountry | null {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (!digits) return null;
  const sorted = [...MESOMB_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of sorted) {
    if (digits.startsWith(country.dial) && digits.length > country.dial.length) {
      return country;
    }
  }
  return null;
}

/** Numéro local MeSomb (sans indicatif), aligné sur le backend. */
export function formatPhoneForMesomb(phone: string, fallbackIso2?: string | null): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  const country = mesombCountryByIso2(fallbackIso2) ?? detectMesombCountry(digits, fallbackIso2);
  let local = digits;
  if (digits.startsWith(country.dial)) {
    local = digits.slice(country.dial.length);
  }

  if (country.iso === "BJ") {
    if (local.length === 8 && !local.startsWith("01")) {
      return `01${local}`;
    }
    return local;
  }
  if (country.iso === "GA") {
    if (local.length === 8 && !local.startsWith("0")) {
      return `0${local}`;
    }
    return local;
  }
  if (country.iso === "CI") {
    return local;
  }
  if (local.startsWith("0") && local.length === country.localLen + 1) {
    return local.slice(1);
  }
  return local;
}

export function mesombServiceLabel(method: string): string {
  const service = mapMethodToService(method);
  if (service) return MESOMB_SERVICE_LABELS[service];
  return method;
}

const MESOMB_USSD: Record<string, Partial<Record<MesombService, string>>> = {
  CM: { ORANGE: "#150*50#", MTN: "*126#" },
  CI: { ORANGE: "#144#", MTN: "*133#", MOOV: "*155#" },
  SN: { ORANGE: "#144#" },
  BJ: { MTN: "*880#", MOOV: "*855#" },
  BF: { ORANGE: "#144#", MOOV: "*555#" },
  GA: { AIRTEL: "*150#" },
  CG: { MTN: "*105#" },
  CD: { ORANGE: "#144#", AIRTEL: "*501#" },
  KE: { MPESA: "*334#" },
  UG: { MTN: "*165#", AIRTEL: "*185#" },
  RW: { MTN: "*182#", AIRTEL: "*500#" },
  ZM: { MTN: "*115#", AIRTEL: "*115#" },
  SL: { ORANGE: "#144#" },
};

export function ussdHint(countryIso: string, service: MesombService): string | null {
  return MESOMB_USSD[countryIso.toUpperCase()]?.[service] ?? null;
}
