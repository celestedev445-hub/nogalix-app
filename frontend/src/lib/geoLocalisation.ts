/** Réponse de `/api/geoLocalisation` (résolution par IP côté serveur : backend/app/web/geo.py). */
export type GeoLocalisation = {
  ip: string;
  country: string;
  city: string;
  countryCode: string;
};
