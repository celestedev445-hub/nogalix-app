import { defaultCountries, parseCountry } from "react-international-phone";

export type CvLanguage = {
  code: string;
  name: string;
};

const PREFERRED_LANGS = ["fr", "en", "es", "de", "pt", "ar", "it", "nl", "zh", "ja", "ko", "ru"];

const LANGUAGE_BY_COUNTRY: Record<string, { code: string; name: string }> = {
  fr: { code: "fr", name: "français" },
  be: { code: "fr", name: "français" },
  lu: { code: "fr", name: "français" },
  mc: { code: "fr", name: "français" },
  sn: { code: "fr", name: "français" },
  ci: { code: "fr", name: "français" },
  ml: { code: "fr", name: "français" },
  bf: { code: "fr", name: "français" },
  ne: { code: "fr", name: "français" },
  tg: { code: "fr", name: "français" },
  bj: { code: "fr", name: "français" },
  gn: { code: "fr", name: "français" },
  td: { code: "fr", name: "français" },
  cf: { code: "fr", name: "français" },
  cg: { code: "fr", name: "français" },
  cd: { code: "fr", name: "français" },
  ga: { code: "fr", name: "français" },
  cm: { code: "fr", name: "français" },
  mg: { code: "fr", name: "français" },
  ht: { code: "fr", name: "français" },
  km: { code: "fr", name: "français" },
  dj: { code: "fr", name: "français" },
  bi: { code: "fr", name: "français" },
  re: { code: "fr", name: "français" },
  yt: { code: "fr", name: "français" },
  gf: { code: "fr", name: "français" },
  pf: { code: "fr", name: "français" },
  nc: { code: "fr", name: "français" },
  pm: { code: "fr", name: "français" },
  wf: { code: "fr", name: "français" },
  mq: { code: "fr", name: "français" },
  gp: { code: "fr", name: "français" },
  us: { code: "en", name: "anglais" },
  gb: { code: "en", name: "anglais" },
  ie: { code: "en", name: "anglais" },
  au: { code: "en", name: "anglais" },
  nz: { code: "en", name: "anglais" },
  ca: { code: "en", name: "anglais" },
  ng: { code: "en", name: "anglais" },
  gh: { code: "en", name: "anglais" },
  ke: { code: "en", name: "anglais" },
  ug: { code: "en", name: "anglais" },
  tz: { code: "en", name: "anglais" },
  zw: { code: "en", name: "anglais" },
  zm: { code: "en", name: "anglais" },
  mw: { code: "en", name: "anglais" },
  sl: { code: "en", name: "anglais" },
  lr: { code: "en", name: "anglais" },
  gm: { code: "en", name: "anglais" },
  bw: { code: "en", name: "anglais" },
  na: { code: "en", name: "anglais" },
  sz: { code: "en", name: "anglais" },
  ls: { code: "en", name: "anglais" },
  ss: { code: "en", name: "anglais" },
  rw: { code: "en", name: "anglais" },
  za: { code: "en", name: "anglais" },
  in: { code: "en", name: "anglais" },
  pk: { code: "en", name: "anglais" },
  bd: { code: "en", name: "anglais" },
  lk: { code: "en", name: "anglais" },
  sg: { code: "en", name: "anglais" },
  my: { code: "en", name: "anglais" },
  ph: { code: "en", name: "anglais" },
  hk: { code: "en", name: "anglais" },
  mt: { code: "en", name: "anglais" },
  jm: { code: "en", name: "anglais" },
  bb: { code: "en", name: "anglais" },
  bs: { code: "en", name: "anglais" },
  es: { code: "es", name: "espagnol" },
  mx: { code: "es", name: "espagnol" },
  ar: { code: "es", name: "espagnol" },
  co: { code: "es", name: "espagnol" },
  cl: { code: "es", name: "espagnol" },
  pe: { code: "es", name: "espagnol" },
  ve: { code: "es", name: "espagnol" },
  ec: { code: "es", name: "espagnol" },
  gt: { code: "es", name: "espagnol" },
  cu: { code: "es", name: "espagnol" },
  bo: { code: "es", name: "espagnol" },
  do: { code: "es", name: "espagnol" },
  hn: { code: "es", name: "espagnol" },
  py: { code: "es", name: "espagnol" },
  sv: { code: "es", name: "espagnol" },
  ni: { code: "es", name: "espagnol" },
  cr: { code: "es", name: "espagnol" },
  pa: { code: "es", name: "espagnol" },
  uy: { code: "es", name: "espagnol" },
  pt: { code: "pt", name: "portugais" },
  br: { code: "pt", name: "portugais" },
  ao: { code: "pt", name: "portugais" },
  mz: { code: "pt", name: "portugais" },
  de: { code: "de", name: "allemand" },
  at: { code: "de", name: "allemand" },
  ch: { code: "de", name: "allemand" },
  sa: { code: "ar", name: "arabe" },
  ae: { code: "ar", name: "arabe" },
  qa: { code: "ar", name: "arabe" },
  eg: { code: "ar", name: "arabe" },
  ma: { code: "ar", name: "arabe" },
  dz: { code: "ar", name: "arabe" },
  tn: { code: "ar", name: "arabe" },
  it: { code: "it", name: "italien" },
  nl: { code: "nl", name: "néerlandais" },
  cn: { code: "zh", name: "chinois" },
  tw: { code: "zh", name: "chinois" },
  jp: { code: "ja", name: "japonais" },
  kr: { code: "ko", name: "coréen" },
  ru: { code: "ru", name: "russe" },
  tr: { code: "tr", name: "turc" },
  pl: { code: "pl", name: "polonais" },
  ua: { code: "uk", name: "ukrainien" },
  ro: { code: "ro", name: "roumain" },
  cs: { code: "cs", name: "tchèque" },
  sk: { code: "sk", name: "slovaque" },
  hu: { code: "hu", name: "hongrois" },
  gr: { code: "el", name: "grec" },
  se: { code: "sv", name: "suédois" },
  no: { code: "no", name: "norvégien" },
  dk: { code: "da", name: "danois" },
  fi: { code: "fi", name: "finnois" },
  vi: { code: "vi", name: "vietnamien" },
  th: { code: "th", name: "thaï" },
  id: { code: "id", name: "indonésien" },
  ir: { code: "fa", name: "persan" },
  il: { code: "he", name: "hébreu" },
};

function languageForCountry(iso2: string) {
  return LANGUAGE_BY_COUNTRY[iso2.toLowerCase()] ?? null;
}

function languageDisplayName(code: string, fallback: string) {
  try {
    if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
      return new Intl.DisplayNames(["fr"], { type: "language" }).of(code) || fallback;
    }
  } catch {
    /* garder le libellé connu */
  }
  return fallback;
}

/** Langues uniques issues des pays de react-international-phone. */
export const cvLanguages: CvLanguage[] = (() => {
  const seen = new Map<string, CvLanguage>();
  for (const entry of defaultCountries) {
    const parsed = parseCountry(entry);
    const language = languageForCountry(parsed.iso2);
    if (!language || seen.has(language.code)) continue;
    seen.set(language.code, {
      code: language.code,
      name: languageDisplayName(language.code, language.name),
    });
  }
  return [...seen.values()].sort((a, b) => {
    const preferredA = PREFERRED_LANGS.indexOf(a.code);
    const preferredB = PREFERRED_LANGS.indexOf(b.code);
    if (preferredA !== -1 || preferredB !== -1) {
      if (preferredA === -1) return 1;
      if (preferredB === -1) return -1;
      return preferredA - preferredB;
    }
    return a.name.localeCompare(b.name, "fr");
  });
})();
