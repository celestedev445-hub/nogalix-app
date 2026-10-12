import { makeRequest } from "@/lib/makeRequest";

export type ImageFontFamily = "sans" | "serif" | "mono" | "script" | "display";
export type ImageTextAlign = "left" | "center" | "right";

/** Ligne de texte repérée dans l'image. Coordonnées en fraction 0-1 de l'image. */
export type ImageTextLine = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  background: string;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  font: ImageFontFamily;
  align: ImageTextAlign;
  angle: number;
};

function formData(image: Blob, mode: "layout" | "extract") {
  const data = new FormData();
  data.append("file", image, image.type === "image/jpeg" ? "image.jpg" : "image.png");
  data.append("mode", mode);
  return data;
}

export async function readImageLayout(image: Blob, signal?: AbortSignal): Promise<ImageTextLine[]> {
  const payload = (await makeRequest("convert/image-text", "POST", formData(image, "layout"), false, false, {
    signal,
  })) as { lines?: ImageTextLine[] } | null;
  return Array.isArray(payload?.lines) ? payload.lines : [];
}

export async function extractImageMarkdown(image: Blob, signal?: AbortSignal): Promise<string> {
  const payload = (await makeRequest("convert/image-text", "POST", formData(image, "extract"), false, false, {
    signal,
  })) as { markdown?: string } | null;
  return typeof payload?.markdown === "string" ? payload.markdown : "";
}
