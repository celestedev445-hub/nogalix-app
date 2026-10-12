import type { GeoLocalisation } from "@/lib/geoLocalisation";

const COOKIE = "geolocalisation";
const MAX_AGE = 60 * 60 * 24 * 7;

function readCookie(): GeoLocalisation | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1))) as GeoLocalisation;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* cookie invalide */
  }
  return null;
}

function writeCookie(value: GeoLocalisation) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function getGeolocationCookie(): GeoLocalisation | null {
  return readCookie();
}

/** Même flux que CBC : cookie `geolocalisation`, puis `/api/geoLocalisation`. */
export async function fetchGeolocation(): Promise<GeoLocalisation | Record<string, never>> {
  try {
    const previous = readCookie();
    const response = await fetch("/api/geoLocalisation", { cache: "no-store" });
    const result = response.ok ? ((await response.json()) as GeoLocalisation) : null;
    if (result?.countryCode) {
      const geo = {
        ...result,
        countryCode: String(result.countryCode).toLowerCase(),
      };
      writeCookie(geo);
      return geo;
    }
    const fallback = await fetch("https://ipwho.is/", { cache: "no-store" }).then((res) => res.json()) as {
      success?: boolean;
      ip?: string;
      country?: string;
      country_code?: string;
      city?: string;
    };
    if (fallback?.success !== false && fallback?.country_code) {
      const geo: GeoLocalisation = {
        ip: fallback.ip || "",
        country: fallback.country || "",
        city: fallback.city || "",
        countryCode: String(fallback.country_code).toLowerCase(),
      };
      writeCookie(geo);
      return geo;
    }
    return previous || {};
  } catch {
    return readCookie() || {};
  }
}
