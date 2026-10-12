export function cloneCanvas(source: HTMLCanvasElement) {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  const ctx = copy.getContext("2d");
  if (ctx) ctx.drawImage(source, 0, 0);
  return copy;
}

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function canvasRectFromSpan(canvas: HTMLCanvasElement, span: HTMLElement, page: HTMLElement) {
  const pageRect = page.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(pageRect.width, 1);
  const scaleY = canvas.height / Math.max(pageRect.height, 1);
  const sx = Math.max(0, Math.floor((spanRect.left - pageRect.left) * scaleX));
  const sy = Math.max(0, Math.floor((spanRect.top - pageRect.top) * scaleY));
  const sw = Math.max(1, Math.min(canvas.width - sx, Math.ceil(spanRect.width * scaleX)));
  const sh = Math.max(1, Math.min(canvas.height - sy, Math.ceil(spanRect.height * scaleY)));
  return { sx, sy, sw, sh, scaleX, scaleY, cssWidth: spanRect.width, cssHeight: spanRect.height };
}

export function sampleSpanColor(
  source: HTMLCanvasElement,
  span: HTMLElement,
  page: HTMLElement,
): { color: string; background: string } {
  const ctx = source.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { color: "#0F172A", background: "#ffffff" };

  const { sx, sy, sw, sh } = canvasRectFromSpan(source, span, page);
  const sampleY = Math.max(0, sy - 2);
  let bgData: ImageData;
  let inkData: ImageData;
  try {
    bgData = ctx.getImageData(sx, sampleY, Math.max(1, sw), 1);
    inkData = ctx.getImageData(sx, sy, sw, sh);
  } catch {
    return { color: "#0F172A", background: "#ffffff" };
  }

  let br = 0;
  let bg = 0;
  let bb = 0;
  let n = 0;
  for (let i = 0; i < bgData.data.length; i += 4) {
    br += bgData.data[i];
    bg += bgData.data[i + 1];
    bb += bgData.data[i + 2];
    n += 1;
  }
  const backgroundRgb = n
    ? [Math.round(br / n), Math.round(bg / n), Math.round(bb / n)]
    : [255, 255, 255];
  const bgLum = luminance(backgroundRgb[0], backgroundRgb[1], backgroundRgb[2]);

  let best = bgLum > 140 ? 400 : -1;
  let tr = 15;
  let tg = 23;
  let tb = 42;
  const pixels = inkData.data;
  const step = Math.max(4, Math.floor(pixels.length / 3000) * 4);
  for (let i = 0; i < pixels.length; i += step) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const lum = luminance(r, g, b);
    if (bgLum > 140) {
      if (lum < best - 6) {
        best = lum;
        tr = r;
        tg = g;
        tb = b;
      }
    } else if (lum > best + 6) {
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

export function restoreSpanRect(
  display: HTMLCanvasElement,
  source: HTMLCanvasElement,
  span: HTMLElement,
  page: HTMLElement,
) {
  const ctx = display.getContext("2d");
  if (!ctx) return;
  const { sx, sy, sw, sh } = canvasRectFromSpan(display, span, page);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(source, sx, sy, sw, sh, sx, sy, sw, sh);
}

export function coverSpanGlyphs(
  display: HTMLCanvasElement,
  source: HTMLCanvasElement,
  span: HTMLElement,
  page: HTMLElement,
  originalText: string,
  forceCover = false,
) {
  const ctx = display.getContext("2d");
  const srcCtx = source.getContext("2d", { willReadFrequently: true });
  if (!ctx || !srcCtx) return;

  const { sx, sy, sw, sh, cssWidth, cssHeight } = canvasRectFromSpan(display, span, page);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(source, sx, sy, sw, sh, sx, sy, sw, sh);

  const current = span.textContent ?? "";
  if (current === originalText && !forceCover) return;

  const style = window.getComputedStyle(span);
  const mask = document.createElement("canvas");
  mask.width = sw;
  mask.height = sh;
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) return;

  const scaleX = sw / Math.max(cssWidth, 1);
  const scaleY = sh / Math.max(cssHeight, 1);
  maskCtx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  const transform = style.transform;
  if (transform && transform !== "none") {
    try {
      const matrix = new DOMMatrix(transform);
      maskCtx.transform(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0);
    } catch {
      /* ignore */
    }
  }
  maskCtx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  maskCtx.fillStyle = "#000";
  maskCtx.textBaseline = "top";
  maskCtx.textAlign = "left";
  maskCtx.fillText(originalText, 0, 0);

  let srcData: ImageData;
  let maskData: ImageData;
  try {
    srcData = srcCtx.getImageData(sx, sy, sw, sh);
    maskData = maskCtx.getImageData(0, 0, sw, sh);
  } catch {
    return;
  }

  const sampleY = Math.max(0, sy - 2);
  let bgRow: ImageData;
  try {
    bgRow = srcCtx.getImageData(sx, sampleY, sw, 1);
  } catch {
    return;
  }

  const dst = ctx.getImageData(sx, sy, sw, sh);
  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      const index = (y * sw + x) * 4;
      const maskAlpha = maskData.data[index + 3];
      if (maskAlpha < 24) {
        dst.data[index] = srcData.data[index];
        dst.data[index + 1] = srcData.data[index + 1];
        dst.data[index + 2] = srcData.data[index + 2];
        dst.data[index + 3] = srcData.data[index + 3];
        continue;
      }
      const bgIndex = x * 4;
      dst.data[index] = bgRow.data[bgIndex];
      dst.data[index + 1] = bgRow.data[bgIndex + 1];
      dst.data[index + 2] = bgRow.data[bgIndex + 2];
      dst.data[index + 3] = 255;
    }
  }
  ctx.putImageData(dst, sx, sy);
}
