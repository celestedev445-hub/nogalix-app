import type { ImageFontFamily, ImageTextAlign, ImageTextLine } from "@/services/imageText";

/** Un calque texte de l'éditeur d'image. Géométrie en fraction 0-1 de l'image. */
export type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  font: ImageFontFamily;
  bold: boolean;
  italic: boolean;
  align: ImageTextAlign;
  angle: number;
  /** Multiplicateur de la taille détectée (1 = taille d'origine). */
  scale: number;
  /** Réduit la police si le nouveau texte déborde du cadre. */
  fit: boolean;
  /** Texte retiré : la zone d'origine est effacée, rien n'est redessiné. */
  removed: boolean;
  /** Ligne détectée d'origine ; null pour un texte ajouté. */
  source: ImageTextLine | null;
};

export const FONT_STACKS: Record<ImageFontFamily, string> = {
  sans: "Arial, Helvetica, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Consolas, monospace",
  script: "'Brush Script MT', 'Segoe Script', cursive",
  display: "Impact, 'Arial Black', sans-serif",
};

export const FONT_LABELS: Record<ImageFontFamily, string> = {
  sans: "Sans serif",
  serif: "Serif",
  mono: "Machine à écrire",
  script: "Manuscrite",
  display: "Affiche",
};

export function layerFromLine(line: ImageTextLine, index: number): TextLayer {
  return {
    id: `l${index}-${Math.random().toString(36).slice(2, 7)}`,
    text: line.text,
    x: line.x,
    y: line.y,
    w: line.w,
    h: line.h,
    color: line.color,
    font: line.font,
    bold: line.bold,
    italic: line.italic,
    align: line.align,
    angle: line.angle,
    scale: 1,
    fit: true,
    removed: false,
    source: line,
  };
}

export function newLayer(): TextLayer {
  return {
    id: `n-${Math.random().toString(36).slice(2, 9)}`,
    text: "Votre texte",
    x: 0.3,
    y: 0.45,
    w: 0.4,
    h: 0.08,
    color: "#111111",
    font: "sans",
    bold: true,
    italic: false,
    align: "center",
    angle: 0,
    scale: 1,
    fit: true,
    removed: false,
    source: null,
  };
}

/** Le calque diffère-t-il de ce qui est déjà dans l'image ? */
export function isDirty(layer: TextLayer) {
  const s = layer.source;
  if (!s) return true;
  if (layer.removed) return true;
  const eps = 0.0005;
  return (
    layer.text !== s.text ||
    layer.color.toLowerCase() !== s.color.toLowerCase() ||
    layer.font !== s.font ||
    layer.bold !== s.bold ||
    layer.italic !== s.italic ||
    layer.align !== s.align ||
    layer.angle !== s.angle ||
    layer.scale !== 1 ||
    Math.abs(layer.x - s.x) > eps ||
    Math.abs(layer.y - s.y) > eps ||
    Math.abs(layer.w - s.w) > eps ||
    Math.abs(layer.h - s.h) > eps
  );
}

export function resetLayer(layer: TextLayer): TextLayer {
  return layer.source ? { ...layerFromLine(layer.source, 0), id: layer.id } : layer;
}

function fontString(layer: Pick<TextLayer, "font" | "bold" | "italic">, size: number) {
  return `${layer.italic ? "italic " : ""}${layer.bold ? "700 " : "400 "}${size}px ${FONT_STACKS[layer.font]}`;
}

/* ------------------------------------------------------------------ effacement */

type Rect = { x: number; y: number; w: number; h: number };

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Efface une zone de texte en reconstruisant le fond à partir de son pourtour :
 * aplat si le fond est uni, sinon interpolation bilinéaire bord à bord (dégradés, photos simples).
 */
export function eraseRegion(ctx: CanvasRenderingContext2D, rect: Rect) {
  const { width: cw, height: ch } = ctx.canvas;
  const ring = 3;
  const x0 = Math.max(ring, Math.floor(rect.x));
  const y0 = Math.max(ring, Math.floor(rect.y));
  const x1 = Math.min(cw - 1 - ring, Math.ceil(rect.x + rect.w));
  const y1 = Math.min(ch - 1 - ring, Math.ceil(rect.y + rect.h));
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  if (w < 2 || h < 2) return;

  const ox = x0 - ring;
  const oy = y0 - ring;
  const ow = w + ring * 2;
  const oh = h + ring * 2;
  const image = ctx.getImageData(ox, oy, ow, oh);
  const d = image.data;
  const at = (x: number, y: number) => (y * ow + x) * 4;

  // Couleur du bord : médiane sur l'épaisseur de l'anneau (écarte les bouts de lettres voisines).
  const sample = (x: number, y: number, dx: number, dy: number) => {
    const out = [0, 0, 0];
    for (let c = 0; c < 3; c += 1) {
      const vals: number[] = [];
      for (let k = 0; k < ring; k += 1) vals.push(d[at(x + dx * k, y + dy * k) + c]);
      out[c] = median(vals);
    }
    return out;
  };

  const left: number[][] = [];
  const right: number[][] = [];
  for (let y = 0; y < h; y += 1) {
    left.push(sample(ring - 1, ring + y, -1, 0));
    right.push(sample(ring + w, ring + y, 1, 0));
  }
  const top: number[][] = [];
  const bottom: number[][] = [];
  for (let x = 0; x < w; x += 1) {
    top.push(sample(ring + x, ring - 1, 0, -1));
    bottom.push(sample(ring + x, ring + h, 0, 1));
  }

  const border = [...left, ...right, ...top, ...bottom];
  const med = [0, 1, 2].map((c) => median(border.map((p) => p[c])));
  const spread =
    border.reduce((sum, p) => sum + Math.abs(p[0] - med[0]) + Math.abs(p[1] - med[1]) + Math.abs(p[2] - med[2]), 0) /
    (border.length * 3);
  const uniform = spread < 6;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = at(ring + x, ring + y);
      if (uniform) {
        d[i] = med[0];
        d[i + 1] = med[1];
        d[i + 2] = med[2];
      } else {
        const tx = (x + 1) / (w + 1);
        const ty = (y + 1) / (h + 1);
        const wx = 1 / Math.min(x + 1, w - x);
        const wy = 1 / Math.min(y + 1, h - y);
        for (let c = 0; c < 3; c += 1) {
          const hv = left[y][c] * (1 - tx) + right[y][c] * tx;
          const vv = top[x][c] * (1 - ty) + bottom[x][c] * ty;
          d[i + c] = (hv * wx + vv * wy) / (wx + wy);
        }
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(image, ox, oy);
}

function paddedRect(line: Pick<ImageTextLine, "x" | "y" | "w" | "h">, width: number, height: number): Rect {
  const px = line.h * height;
  const pad = Math.max(2, Math.round(px * 0.18));
  return {
    x: line.x * width - pad,
    y: line.y * height - pad,
    w: line.w * width + pad * 2,
    h: line.h * height + pad * 2,
  };
}

/* ------------------------------------------------------------------ texte */

const measureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

type Metrics = { size: number; baseline: number };

/** Taille et ligne de base qui font coïncider le texte d'origine avec son cadre détecté. */
function sourceMetrics(layer: TextLayer, width: number, height: number): Metrics {
  const boxH = layer.h * height;
  const ctx = measureCanvas?.getContext("2d");
  const probe = layer.source?.text || layer.text || "Hg";
  if (!ctx) return { size: boxH * 0.8, baseline: 0.8 };
  ctx.font = fontString(layer.source ?? layer, 100);
  const m = ctx.measureText(probe);
  const glyphH = (m.actualBoundingBoxAscent || 72) + (m.actualBoundingBoxDescent || 0);
  const byHeight = (boxH / Math.max(glyphH, 1)) * 100;
  let size = byHeight;
  if (layer.source) {
    const byWidth = ((layer.source.w * width) / Math.max(m.width, 1)) * 100;
    // Moyenne quand les deux estimations concordent, sinon on se fie à la hauteur.
    if (byWidth > byHeight * 0.65 && byWidth < byHeight * 1.5) size = (byHeight + byWidth) / 2;
  }
  const descent = ((m.actualBoundingBoxDescent || 0) / 100) * size;
  return { size, baseline: boxH - descent };
}

function drawLayer(ctx: CanvasRenderingContext2D, layer: TextLayer, width: number, height: number) {
  const text = layer.text;
  if (!text.trim()) return;
  const boxX = layer.x * width;
  const boxY = layer.y * height;
  const boxW = layer.w * width;
  const boxH = layer.h * height;
  const { size: baseSize, baseline } = sourceMetrics(layer, width, height);
  let size = baseSize * layer.scale;
  ctx.save();
  ctx.font = fontString(layer, size);
  if (layer.fit) {
    const measured = ctx.measureText(text).width;
    if (measured > boxW * 1.02) {
      size = Math.max(size * ((boxW * 1.02) / measured), 4);
      ctx.font = fontString(layer, size);
    }
  }
  ctx.fillStyle = layer.color;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = layer.align;
  ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
  if (layer.angle) ctx.rotate((layer.angle * Math.PI) / 180);
  const anchorX = layer.align === "left" ? -boxW / 2 : layer.align === "right" ? boxW / 2 : 0;
  // Même ligne de base que le texte d'origine, quelle que soit la nouvelle taille.
  ctx.fillText(text, anchorX, -boxH / 2 + baseline);
  ctx.restore();
}

/** Image d'origine avec les zones des calques modifiés effacées (mise en cache par l'appelant). */
export function renderErasedBase(image: CanvasImageSource, width: number, height: number, layers: TextLayer[]) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0, width, height);
  for (const layer of layers) {
    if (layer.source && isDirty(layer)) eraseRegion(ctx, paddedRect(layer.source, width, height));
  }
  return canvas;
}

/** Clé qui change seulement quand l'ensemble des zones à effacer change. */
export function eraseKey(layers: TextLayer[]) {
  return layers
    .filter((l) => l.source && isDirty(l))
    .map((l) => l.id)
    .join("|");
}

export function renderComposite(
  target: HTMLCanvasElement,
  base: HTMLCanvasElement,
  layers: TextLayer[],
) {
  const { width, height } = base;
  if (target.width !== width) target.width = width;
  if (target.height !== height) target.height = height;
  const ctx = target.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(base, 0, 0);
  for (const layer of layers) {
    if (!layer.removed && isDirty(layer)) drawLayer(ctx, layer, width, height);
  }
}
