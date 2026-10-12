export type EditablePdfFont = {
  family: string;
  format: string;
  data: string;
};

export type EditablePdfSpan = {
  id: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  ascent: number;
  rotate: number;
};

export type EditablePdfPage = {
  width: number;
  height: number;
  background: string;
  spans: EditablePdfSpan[];
};

export type EditablePdfDocument = {
  fonts: EditablePdfFont[];
  pages: EditablePdfPage[];
};

const CSS_FORMAT: Record<string, string> = {
  truetype: "truetype",
  opentype: "opentype",
  woff: "woff",
  woff2: "woff2",
};

export function buildEditablePdfFontFaceCss(fonts: EditablePdfFont[]) {
  return fonts
    .map((font) => {
      const format = CSS_FORMAT[font.format] || "truetype";
      const mime = format === "opentype" ? "font/otf" : `font/${format === "truetype" ? "ttf" : format}`;
      return `@font-face{font-family:"${font.family}";src:url(data:${mime};base64,${font.data}) format("${format}");font-display:block;font-weight:400;font-style:normal;}`
    })
    .join("\n");
}

export function isEditablePdfDocument(value: unknown): value is EditablePdfDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as EditablePdfDocument;
  return Array.isArray(doc.pages) && Array.isArray(doc.fonts);
}
