import { useEffect, useState } from "react";
import { fetchGeolocation, getGeolocationCookie } from "@/lib/geolocation";
import { mesombCountryByIso2 } from "@/lib/mesombCountries";

function iso2FromGeo(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const code = (value as { countryCode?: unknown }).countryCode;
  return typeof code === "string" ? code.toLowerCase() : "";
}

/**
 * Détecteur IP comme CBC (`fetchGeolocation` / cookie `geolocalisation`).
 * Retourne un iso2 MeSomb (`cm`, `ci`…) pour le drapeau du champ téléphone.
 */
export function useMesombDetectedCountry(enabled: boolean): string {
  const [iso2, setIso2] = useState("cm");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const apply = (code: string) => {
      if (cancelled || !mesombCountryByIso2(code)) return;
      setIso2(code.toLowerCase());
    };

    apply(iso2FromGeo(getGeolocationCookie()));

    void fetchGeolocation()
      .then((geo) => apply(iso2FromGeo(geo)))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return iso2;
}
