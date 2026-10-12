export const charteColors = {
  principale: "#3A83F7",
  indigo: "#4338CA",
  secondaire: "#4338CA",
  navy: "#0F172A",
  quatrieme: "#0F172A",
  gris: "#E2E8F0",
  troisieme: "#E2E8F0",
  indigoClair: "#EEF2FF",
  surface: "#EEF2FF",
  succes: "#10B981",
} as const;

export const charte = {
  colors: charteColors,
  radius: "0.75rem",
  radiusPill: "2rem",
  maxWidth: "1580px",
  pageInner: "site-inner",
  pageGutter: "site-gutter",
  gradients: {
    brand: "linear-gradient(135deg, #3A83F7 0%, #4338CA 100%)",
    brandSoft:
      "linear-gradient(135deg, rgba(58,131,247,0.12) 0%, rgba(67,56,202,0.08) 100%)",
  },
  shadow: "0 4px 20px -4px rgba(58, 131, 247, 0.35)",
} as const;
