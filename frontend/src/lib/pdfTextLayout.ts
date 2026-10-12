export type PdfTextLine = {
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
  angle: number;
  baseline: number;
  embeddedFont: boolean;
};

const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "arial",
  "helvetica",
  "times",
  "times new roman",
  "courier",
  "courier new",
]);

type PdfJsUtil = {
  transform: (m1: number[], m2: number[]) => number[];
};

type TextContentStyle = {
  fontFamily?: string;
  ascent?: number;
  descent?: number;
};

type TextContentItem = {
  str?: string;
  dir?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
  hasEOL?: boolean;
};

function cssFontFamily(pdfFontName: string) {
  const raw = (pdfFontName.split("+").pop() || pdfFontName).replace(/,/g, " ");
  const lower = raw.toLowerCase();
  const table: [RegExp, string][] = [
    [/calibri/, "Calibri, 'Segoe UI', Arial, sans-serif"],
    [/arial/, "Arial, Helvetica, sans-serif"],
    [/helvetica/, "Helvetica, Arial, sans-serif"],
    [/times/, "'Times New Roman', Times, serif"],
    [/georgia/, "Georgia, serif"],
    [/garamond/, "Garamond, 'Times New Roman', serif"],
    [/cambria/, "Cambria, Georgia, serif"],
    [/verdana/, "Verdana, Geneva, sans-serif"],
    [/tahoma/, "Tahoma, Geneva, sans-serif"],
    [/trebuchet/, "'Trebuchet MS', sans-serif"],
    [/courier|mono/, "'Courier New', Courier, monospace"],
    [/roboto/, "Roboto, Arial, sans-serif"],
    [/open.?sans/, "'Open Sans', Arial, sans-serif"],
    [/lato/, "Lato, Arial, sans-serif"],
    [/montserrat/, "Montserrat, Arial, sans-serif"],
    [/inter/, "Inter, Arial, sans-serif"],
    [/noto/, "'Noto Sans', Arial, sans-serif"],
    [/dejavu/, "'DejaVu Sans', Arial, sans-serif"],
    [/liberation/, "'Liberation Sans', Arial, sans-serif"],
    [/source.?sans/, "'Source Sans 3', Arial, sans-serif"],
  ];
  for (const [pattern, family] of table) {
    if (pattern.test(lower)) return family;
  }
  const cleaned = raw.replace(/[-_]?(bold|italic|oblique|regular|medium|light|black|semi)/gi, "").trim();
  return cleaned ? `"${cleaned}", Arial, Helvetica, sans-serif` : "Arial, Helvetica, sans-serif";
}

function isEmbeddedPdfFont(fontFamily: string) {
  const trimmed = fontFamily.trim().replace(/['"]/g, "");
  if (!trimmed) return false;
  return !GENERIC_FONTS.has(trimmed.toLowerCase());
}

function resolveLineFont(fontName: string, styleFamily?: string) {
  const loaded = (styleFamily || "").trim();
  const embedded = isEmbeddedPdfFont(loaded);
  if (embedded) {
    return {
      fontFamily: loaded.includes(",") ? loaded : `"${loaded.replace(/['"]/g, "")}"`,
      fontWeight: "400",
      fontStyle: "normal" as const,
      embeddedFont: true,
    };
  }
  return {
    fontFamily: cssFontFamily(loaded || fontName),
    fontWeight: cssFontWeight(fontName),
    fontStyle: cssFontStyle(fontName),
    embeddedFont: false,
  };
}

function cssFontWeight(pdfFontName: string) {
  const lower = pdfFontName.toLowerCase();
  if (/(^|[-_+ ])(bold|black|heavy)([-_+ ]|$)/.test(lower) || /boldmt/.test(lower)) return "700";
  return "400";
}

function cssFontStyle(pdfFontName: string) {
  return /italic|oblique/i.test(pdfFontName) ? "italic" : "normal";
}

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function sampleLineColors(
  canvas: HTMLCanvasElement,
  rect: { left: number; top: number; width: number; height: number },
  logicalSize: { width: number; height: number },
): { background: string; color: string } {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || logicalSize.width <= 0 || logicalSize.height <= 0) {
    return { background: "#ffffff", color: "#0F172A" };
  }

  const scaleX = canvas.width / logicalSize.width;
  const scaleY = canvas.height / logicalSize.height;
  const sx = Math.max(0, Math.floor(rect.left * scaleX));
  const syBg = Math.max(0, Math.floor(Math.max(0, rect.top - 3) * scaleY));
  const sy = Math.max(0, Math.floor(Math.max(0, rect.top) * scaleY));
  const sw = Math.max(1, Math.min(canvas.width - sx, Math.ceil(Math.max(rect.width, 2) * scaleX)));
  const sh = Math.max(1, Math.min(canvas.height - sy, Math.ceil(Math.max(rect.height, 2) * scaleY)));

  let bgData: ImageData;
  let data: ImageData;
  try {
    bgData = ctx.getImageData(sx, syBg, sw, 1);
    data = ctx.getImageData(sx, sy, sw, sh);
  } catch {
    return { background: "#ffffff", color: "#0F172A" };
  }

  const bgPixels = bgData.data;
  let br = 0;
  let bg = 0;
  let bb = 0;
  let count = 0;
  for (let index = 0; index < bgPixels.length; index += 4) {
    br += bgPixels[index];
    bg += bgPixels[index + 1];
    bb += bgPixels[index + 2];
    count += 1;
  }
  const backgroundRgb = count
    ? [Math.round(br / count), Math.round(bg / count), Math.round(bb / count)]
    : [255, 255, 255];
  const pixels = data.data;
  const bgLum = luminance(backgroundRgb[0], backgroundRgb[1], backgroundRgb[2]);

  let best = bgLum > 140 ? 400 : -1;
  let tr = 15;
  let tg = 23;
  let tb = 42;
  const step = Math.max(4, Math.floor(pixels.length / 4000) * 4);
  for (let index = 0; index < pixels.length; index += step) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const lum = luminance(r, g, b);
    if (bgLum > 140) {
      if (lum < best - 8) {
        best = lum;
        tr = r;
        tg = g;
        tb = b;
      }
    } else if (lum > best + 8) {
      best = lum;
      tr = r;
      tg = g;
      tb = b;
    }
  }

  return {
    background: `rgb(${backgroundRgb[0]}, ${backgroundRgb[1]}, ${backgroundRgb[2]})`,
    color: `rgb(${tr}, ${tg}, ${tb})`,
  };
}

export function cloneCanvas(source: HTMLCanvasElement) {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  const ctx = copy.getContext("2d");
  if (ctx) ctx.drawImage(source, 0, 0);
  return copy;
}

function lineBBox(line: PdfTextLine, extra = 1) {
  return {
    left: line.left - extra,
    top: line.top - extra,
    width: line.width + extra * 2,
    height: line.height + extra * 2,
  };
}

function restoreSourceRegion(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  line: PdfTextLine,
  logicalSize: { width: number; height: number },
  extra = 1,
) {
  const box = lineBBox(line, extra);
  const scaleX = ctx.canvas.width / logicalSize.width;
  const scaleY = ctx.canvas.height / logicalSize.height;
  const left = Math.max(0, box.left);
  const top = Math.max(0, box.top);
  const width = Math.min(logicalSize.width - left, box.width);
  const height = Math.min(logicalSize.height - top, box.height);
  const sx = Math.floor(left * scaleX);
  const sy = Math.floor(top * scaleY);
  const sw = Math.max(1, Math.ceil(width * scaleX));
  const sh = Math.max(1, Math.ceil(height * scaleY));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(source, sx, sy, sw, sh, sx, sy, sw, sh);
  return { sx, sy, sw, sh, scaleX, scaleY };
}

function eraseGlyphs(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  line: PdfTextLine,
  logicalSize: { width: number; height: number },
) {
  const restored = restoreSourceRegion(ctx, source, line, logicalSize, 1);
  const { sx, sy, sw, sh, scaleX, scaleY } = restored;
  const srcCtx = source.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) return restored;

  const sampleOffset = Math.max(1, Math.round(2 * scaleY));
  const srcY = Math.max(0, sy - sampleOffset);
  const extraTop = sy - srcY;
  const srcH = Math.min(source.height - srcY, sh + extraTop + sampleOffset);
  let srcData: ImageData;
  try {
    srcData = srcCtx.getImageData(sx, srcY, sw, srcH);
  } catch {
    return restored;
  }

  const dst = ctx.getImageData(sx, sy, sw, sh);
  const aboveRow = extraTop - sampleOffset;
  const belowRow = extraTop + sh + Math.min(sampleOffset, srcH - extraTop - sh) - 1;
  const useAbove = aboveRow >= 0;

  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      const sampleRow = useAbove ? Math.max(0, aboveRow) : Math.max(0, belowRow);
      const bgIndex = (sampleRow * sw + x) * 4;
      const srcIndex = ((y + extraTop) * sw + x) * 4;
      const di = (y * sw + x) * 4;
      const br = srcData.data[bgIndex] ?? 255;
      const bg = srcData.data[bgIndex + 1] ?? 255;
      const bb = srcData.data[bgIndex + 2] ?? 255;
      const r = srcData.data[srcIndex] ?? br;
      const g = srcData.data[srcIndex + 1] ?? bg;
      const b = srcData.data[srcIndex + 2] ?? bb;
      const dist = Math.abs(luminance(r, g, b) - luminance(br, bg, bb));
      if (dist > 10) {
        dst.data[di] = br;
        dst.data[di + 1] = bg;
        dst.data[di + 2] = bb;
        dst.data[di + 3] = 255;
      } else {
        dst.data[di] = r;
        dst.data[di + 1] = g;
        dst.data[di + 2] = b;
        dst.data[di + 3] = srcData.data[srcIndex + 3] ?? 255;
      }
    }
  }
  ctx.putImageData(dst, sx, sy);
  return restored;
}

function canvasFont(line: PdfTextLine) {
  return `${line.fontStyle} ${line.fontWeight} ${line.fontSize}px ${line.fontFamily}`;
}

export function paintLineEdit(
  display: HTMLCanvasElement,
  source: HTMLCanvasElement,
  line: PdfTextLine,
  text: string,
  logicalSize: { width: number; height: number },
  colors: { background: string; color: string },
  options?: { eraseOnly?: boolean },
) {
  const ctx = display.getContext("2d");
  if (!ctx || logicalSize.width <= 0) return;

  const unchanged = text === line.text;
  if (unchanged && !options?.eraseOnly) {
    restoreSourceRegion(ctx, source, line, logicalSize, 1);
    return;
  }

  eraseGlyphs(ctx, source, line, logicalSize);
  if (options?.eraseOnly || unchanged) return;

  const scaleX = display.width / logicalSize.width;
  const scaleY = display.height / logicalSize.height;
  ctx.save();
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.font = canvasFont(line);
  const natural = ctx.measureText(line.text).width;
  const hScale = natural > 0.4 ? Math.min(1.35, Math.max(0.65, line.width / natural)) : 1;
  ctx.fillStyle = colors.color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.translate(line.left, line.baseline);
  if (Math.abs(line.angle) > 0.02) ctx.rotate(line.angle);
  ctx.scale(hScale, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

type RawRun = PdfTextLine;

function mergeLine(runs: RawRun[], id: string): PdfTextLine {
  const first = runs[0];
  const last = runs[runs.length - 1];
  const parts: string[] = [];
  for (let index = 0; index < runs.length; index += 1) {
    if (index > 0) {
      const previous = runs[index - 1];
      const current = runs[index];
      const gap = current.left - (previous.left + previous.width);
      if (gap > previous.fontSize * 0.12) parts.push(" ");
    }
    parts.push(runs[index].text);
  }

  return {
    id,
    text: parts.join("").replace(/\s+/g, " ").trimEnd(),
    left: first.left,
    top: Math.min(...runs.map((run) => run.top)),
    width: last.left + last.width - first.left,
    height: Math.max(...runs.map((run) => run.height)),
    fontSize: first.fontSize,
    fontFamily: first.fontFamily,
    fontWeight: first.fontWeight,
    fontStyle: first.fontStyle,
    angle: first.angle,
    baseline: first.baseline,
    embeddedFont: first.embeddedFont,
  };
}

function groupRuns(runs: RawRun[]): PdfTextLine[] {
  if (!runs.length) return [];
  const sorted = [...runs].sort((a, b) => a.baseline - b.baseline || a.left - b.left);
  const buckets: RawRun[][] = [];

  for (const run of sorted) {
    const current = buckets[buckets.length - 1];
    if (!current) {
      buckets.push([run]);
      continue;
    }
    const previous = current[current.length - 1];
    const sameLine = Math.abs(run.baseline - previous.baseline) < Math.min(run.fontSize, previous.fontSize) * 0.38;
    const gap = run.left - (previous.left + previous.width);
    const columnBreak = gap > Math.max(previous.fontSize, run.fontSize, 14) * 2.4;
    const sizeJump = Math.abs(run.fontSize - previous.fontSize) > 1.8;
    const styleJump = run.fontWeight !== previous.fontWeight || run.fontFamily !== previous.fontFamily;
    if (sameLine && !columnBreak && !sizeJump && !styleJump && gap > -previous.fontSize * 0.2) {
      current.push(run);
    } else {
      buckets.push([run]);
    }
  }

  return buckets
    .map((group, index) => mergeLine(group, `${group[0].id.split(":")[0]}:${index}`))
    .filter((line) => line.text.trim().length > 0);
}

export function extractPdfTextLines(
  items: unknown[],
  styles: Record<string, TextContentStyle> | undefined,
  viewport: { transform: number[] },
  util: PdfJsUtil,
  pageNum: number,
): PdfTextLine[] {
  const runs: RawRun[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] as TextContentItem;
    if (!item || typeof item.str !== "string" || !item.transform) continue;
    const text = item.str.replace(/\u0000/g, "");
    if (!text.trim() && !item.hasEOL) continue;

    const tx = util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]) || 12;
    const hScale = Math.hypot(tx[0], tx[1]) || fontHeight;
    const angle = Math.atan2(tx[1], tx[0]);
    const fontName = item.fontName || "";
    const style = styles?.[fontName];
    const ascentRatio = style?.ascent && style.ascent > 0 ? style.ascent : 0.8;
    const visualWidth =
      typeof item.width === "number" && item.height
        ? (item.width * hScale) / item.height
        : text.length * fontHeight * 0.5;

    const font = resolveLineFont(fontName, style?.fontFamily);

    if (!text.trim()) continue;

    runs.push({
      id: `${pageNum}:${index}`,
      text,
      left: tx[4],
      top: tx[5] - fontHeight * ascentRatio,
      width: Math.max(visualWidth, fontHeight * 0.2),
      height: fontHeight,
      fontSize: fontHeight,
      fontFamily: font.fontFamily,
      fontWeight: font.fontWeight,
      fontStyle: font.fontStyle,
      angle,
      baseline: tx[5],
      embeddedFont: font.embeddedFont,
    });
  }

  return groupRuns(runs);
}
