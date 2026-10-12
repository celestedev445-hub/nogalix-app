/**
 * <Image> : `srcset` responsive, optimisation (WebP redimensionné) servie par le serveur
 * Python sur `/_image`, préchargement des images prioritaires.
 */
import { forwardRef, type CSSProperties, type ImgHTMLAttributes } from "react";
import { preload } from "react-dom";
import { imageSrcSet } from "@/platform/imageSizes";

type StaticImageData = { src: string; width?: number; height?: number };

export type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height" | "loading"> & {
  src: string | StaticImageData;
  alt: string;
  width?: number | `${number}`;
  height?: number | `${number}`;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  loading?: "eager" | "lazy";
  unoptimized?: boolean;
  placeholder?: string;
  blurDataURL?: string;
};

function toNumber(value: number | `${number}` | undefined) {
  if (value === undefined) return undefined;
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  {
    src: rawSrc,
    alt,
    width: rawWidth,
    height: rawHeight,
    fill = false,
    sizes: rawSizes,
    quality,
    priority = false,
    loading,
    unoptimized = false,
    placeholder: _placeholder,
    blurDataURL: _blurDataURL,
    style,
    ...rest
  },
  ref,
) {
  const src = typeof rawSrc === "string" ? rawSrc : rawSrc.src;
  const width = toNumber(rawWidth ?? (typeof rawSrc === "object" ? rawSrc.width : undefined));
  const height = toNumber(rawHeight ?? (typeof rawSrc === "object" ? rawSrc.height : undefined));
  const sizes = fill && !rawSizes ? "100vw" : rawSizes;

  const skipOptimization =
    unoptimized ||
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    /^[a-z][a-z\d+\-.]*:/i.test(src) ||
    src.split("?", 1)[0].endsWith(".svg");

  const generated = skipOptimization ? null : imageSrcSet({ src, width, sizes, quality });
  const finalSrc = generated ? generated.src : src;
  const srcSet = generated?.srcSet;

  if (priority) {
    preload(finalSrc, {
      as: "image",
      fetchPriority: "high",
      ...(srcSet ? { imageSrcSet: srcSet, imageSizes: sizes } : {}),
    });
  }

  const imgStyle: CSSProperties = Object.assign(
    fill
      ? { position: "absolute", height: "100%", width: "100%", left: 0, top: 0, right: 0, bottom: 0 }
      : {},
    { color: "transparent" },
    style,
  );

  return (
    <img
      {...rest}
      ref={ref}
      alt={alt}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? undefined : loading || "lazy"}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      decoding="async"
      data-nimg={fill ? "fill" : "1"}
      style={imgStyle}
      sizes={sizes}
      srcSet={srcSet}
      src={finalSrc}
    />
  );
});

export default Image;
