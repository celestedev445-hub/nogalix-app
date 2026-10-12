export type SpanFormatPatch = {
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  backgroundColor?: string;
  textDecoration?: string;
  textAlign?: "left" | "center" | "right";
  textTransform?: string;
  verticalAlign?: string;
  lineHeight?: string;
};

export type SpanStyleOverride = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  backgroundColor?: string;
  textDecoration?: string;
  textAlign?: "left" | "center" | "right";
  textTransform?: string;
  verticalAlign?: string;
  lineHeight?: string;
};

export type SpanFormatState = {
  fontFamily: string;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  color: string;
  backgroundColor: string;
  textDecoration: string;
  textAlign: "left" | "center" | "right";
  textTransform: string;
  verticalAlign: string;
  lineHeight: string;
};

export function pxToPt(px: number) {
  return px * (72 / 96);
}

export function ptToPx(pt: number) {
  return pt * (96 / 72);
}

export function parseRgbToHex(value: string) {
  if (!value) return "#0F172A";
  if (value.startsWith("#")) return value;
  const parts = value.match(/\d+/g);
  if (!parts || parts.length < 3) return "#0F172A";
  return `#${parts
    .slice(0, 3)
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function isBoldWeight(weight: string | number | undefined) {
  if (weight === undefined || weight === "") return false;
  if (weight === "bold" || weight === "bolder") return true;
  const numeric = Number(weight);
  return Number.isFinite(numeric) && numeric >= 600;
}

export function applyFormatPatch(current: SpanStyleOverride, patch: SpanFormatPatch): SpanStyleOverride {
  const next = { ...current };
  if (patch.fontFamily !== undefined) {
    const family = patch.fontFamily.trim();
    next.fontFamily = /[\s,]/.test(family) ? `"${family}", sans-serif` : `${family}, sans-serif`;
  }
  if (patch.fontSizePt !== undefined) next.fontSize = ptToPx(patch.fontSizePt);
  if (patch.bold !== undefined) {
    next.fontWeight = patch.bold ? "700" : "400";
  }
  if (patch.italic !== undefined) next.fontStyle = patch.italic ? "italic" : "normal";
  if (patch.color !== undefined) next.color = patch.color;
  if (patch.backgroundColor !== undefined) next.backgroundColor = patch.backgroundColor;
  if (patch.textDecoration !== undefined) next.textDecoration = patch.textDecoration;
  if (patch.textAlign !== undefined) next.textAlign = patch.textAlign;
  if (patch.textTransform !== undefined) next.textTransform = patch.textTransform;
  if (patch.verticalAlign !== undefined) next.verticalAlign = patch.verticalAlign;
  if (patch.lineHeight !== undefined) next.lineHeight = patch.lineHeight;
  return next;
}
