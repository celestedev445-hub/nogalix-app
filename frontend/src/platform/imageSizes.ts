/**
 * Largeurs et URL d'images optimisées (largeurs d'écran / tailles d'icônes). Reproduit côté serveur dans
 * backend/app/web/images.py pour les préchargements de la page initiale.
 */
export const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
export const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384];
const ALL_SIZES = [...IMAGE_SIZES, ...DEVICE_SIZES].sort((a, b) => a - b);
export const DEFAULT_QUALITY = 75;

function getWidths(width: number | undefined, sizes: string | undefined): { widths: number[]; kind: "w" | "x" } {
  if (sizes) {
    const viewportWidthRe = /(^|\s)(1?\d?\d)vw/g;
    const percentSizes: number[] = [];
    for (let match; (match = viewportWidthRe.exec(sizes)); match) {
      percentSizes.push(Number.parseInt(match[2], 10));
    }
    if (percentSizes.length) {
      const smallestRatio = Math.min(...percentSizes) * 0.01;
      return { widths: ALL_SIZES.filter((size) => size >= DEVICE_SIZES[0] * smallestRatio), kind: "w" };
    }
    return { widths: ALL_SIZES, kind: "w" };
  }
  if (typeof width !== "number") {
    return { widths: DEVICE_SIZES, kind: "w" };
  }
  const widths = [
    ...new Set(
      [width, width * 2].map((w) => ALL_SIZES.find((size) => size >= w) || ALL_SIZES[ALL_SIZES.length - 1]),
    ),
  ];
  return { widths, kind: "x" };
}

export function optimizedImageUrl(src: string, width: number, quality = DEFAULT_QUALITY) {
  return `/_image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

export function imageSrcSet({
  src,
  width,
  sizes,
  quality,
}: {
  src: string;
  width?: number;
  sizes?: string;
  quality?: number;
}) {
  const { widths, kind } = getWidths(width, sizes);
  const last = widths.length - 1;
  return {
    srcSet: widths
      .map((w, i) => `${optimizedImageUrl(src, w, quality)} ${kind === "w" ? w : i + 1}${kind}`)
      .join(", "),
    src: optimizedImageUrl(src, widths[last], quality),
  };
}
