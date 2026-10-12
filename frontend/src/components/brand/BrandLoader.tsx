import { useId } from "react";
import { appConfig } from "@/lib/appConfig";
import { cn } from "@/lib/utils";

const N_PATH = "M16 51L19 13L51 51L54 13";

type BrandLoaderProps = {
  size?: number;
  label?: string;
  fullPage?: boolean;
  className?: string;
};

export function BrandLoader({
  size = 64,
  label = "Chargement",
  fullPage = false,
  className,
}: BrandLoaderProps) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `noga-n-${uid}`;
  const name = appConfig.shortName || appConfig.name;

  const mark = (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("inline-flex flex-col items-center gap-3", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 68 64"
        fill="none"
        aria-hidden="true"
        className="brand-loader"
      >
        <defs>
          <linearGradient id={gradientId} x1="8" y1="8" x2="60" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="38%" stopColor="#3A83F7" />
            <stop offset="72%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#C026D3" />
          </linearGradient>
        </defs>
        <path
          d={N_PATH}
          stroke={`url(#${gradientId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="brand-loader-ghost"
        />
        <path
          d={N_PATH}
          pathLength={1}
          stroke={`url(#${gradientId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="brand-loader-trace"
        />
      </svg>
      <span className="font-display text-center text-xl font-semibold text-navy">
        {label}
      </span>
      <span className="sr-only">
        {name}
      </span>
    </span>
  );

  if (!fullPage) return mark;

  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center py-16">{mark}</div>
  );
}
