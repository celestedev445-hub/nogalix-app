import { useId } from "react";
import { cn } from "@/lib/utils";

type AssistantAvatarProps = {
  size?: number;
  className?: string;
  framed?: boolean;
};

export function AssistantAvatar({
  size = 56,
  className,
  framed = false,
}: AssistantAvatarProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `noga-clip-${uid}`;
  const bgId = `noga-bg-${uid}`;
  const skinId = `noga-skin-${uid}`;
  const hairId = `noga-hair-${uid}`;
  const blazerId = `noga-blazer-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bgId} x1="8" y1="6" x2="74" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D7E4FF" />
          <stop offset="55%" stopColor="#6B93F5" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient id={skinId} x1="30" y1="22" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D6A572" />
          <stop offset="50%" stopColor="#C0864A" />
          <stop offset="100%" stopColor="#A56A3C" />
        </linearGradient>
        <radialGradient id={hairId} cx="36" cy="22" r="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3F2C24" />
          <stop offset="55%" stopColor="#1A120E" />
          <stop offset="100%" stopColor="#0E0908" />
        </radialGradient>
        <linearGradient id={blazerId} x1="18" y1="56" x2="64" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#243044" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="40" cy="40" r="40" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect width="80" height="80" fill={`url(#${bgId})`} />

        <circle cx="17" cy="36" r="13" fill={`url(#${hairId})`} />
        <circle cx="63" cy="36" r="13" fill={`url(#${hairId})`} />
        <circle cx="22" cy="18" r="12" fill={`url(#${hairId})`} />
        <circle cx="58" cy="18" r="12" fill={`url(#${hairId})`} />
        <circle cx="40" cy="11" r="14" fill={`url(#${hairId})`} />
        <circle cx="13" cy="50" r="9.5" fill={`url(#${hairId})`} />
        <circle cx="67" cy="50" r="9.5" fill={`url(#${hairId})`} />
        <ellipse cx="40" cy="28" rx="27" ry="23" fill={`url(#${hairId})`} />
        <ellipse cx="30" cy="16" rx="8" ry="5" fill="#4A342C" opacity="0.45" />

        <ellipse cx="22" cy="43.5" rx="3.5" ry="5" fill="#B57445" />
        <ellipse cx="58" cy="43.5" rx="3.5" ry="5" fill="#B57445" />
        <ellipse cx="22" cy="44.2" rx="1.6" ry="2.3" fill="#8F5732" opacity="0.5" />
        <ellipse cx="58" cy="44.2" rx="1.6" ry="2.3" fill="#8F5732" opacity="0.5" />

        <ellipse cx="21" cy="51.2" rx="3.4" ry="5" stroke="#E8C36A" strokeWidth="1.7" />
        <ellipse cx="59" cy="51.2" rx="3.4" ry="5" stroke="#E8C36A" strokeWidth="1.7" />

        <path d="M34 54C34 60 35.5 64 40 64C44.5 64 46 60 46 54" fill={`url(#${skinId})`} />

        <ellipse cx="40" cy="40.5" rx="16.4" ry="18.8" fill={`url(#${skinId})`} />
        <ellipse cx="47.5" cy="37" rx="6.5" ry="8" fill="#E2B17C" opacity="0.32" />
        <ellipse cx="33" cy="47" rx="7" ry="9" fill="#A8663E" opacity="0.18" />

        <circle cx="27.5" cy="26.5" r="6.2" fill={`url(#${hairId})`} />
        <circle cx="35.5" cy="23.5" r="6.6" fill={`url(#${hairId})`} />
        <circle cx="44.5" cy="23.5" r="6.6" fill={`url(#${hairId})`} />
        <circle cx="52.5" cy="26.5" r="6.2" fill={`url(#${hairId})`} />
        <circle cx="40" cy="22" r="5.4" fill={`url(#${hairId})`} />

        <path
          d="M29.4 36.6C32.4 34.7 35.8 34.9 37.3 36.6"
          stroke="#2A1C16"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M42.7 36.6C44.2 34.9 47.6 34.7 50.6 36.6"
          stroke="#2A1C16"
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        <ellipse cx="33.5" cy="40.6" rx="2.55" ry="3" fill="#1A120E" />
        <ellipse cx="46.5" cy="40.6" rx="2.55" ry="3" fill="#1A120E" />
        <path d="M31 38.7C32.6 37.6 35.4 37.6 36.1 39.4C34.4 38.6 32.4 38.6 31 38.7Z" fill="#C0864A" />
        <path d="M43.9 39.4C44.6 37.6 47.4 37.6 49 38.7C47.6 38.6 45.6 38.6 43.9 39.4Z" fill="#C0864A" />
        <circle cx="34.3" cy="39.5" r="0.85" fill="white" />
        <circle cx="47.3" cy="39.5" r="0.85" fill="white" />

        <path d="M40 43.6C38.8 46.6 39 48.2 40 48.4C41 48.2 41.2 46.6 40 43.6Z" fill="#A8663E" />

        <ellipse cx="27.8" cy="47.4" rx="3.8" ry="2.1" fill="#E08A7A" opacity="0.4" />
        <ellipse cx="52.2" cy="47.4" rx="3.8" ry="2.1" fill="#E08A7A" opacity="0.4" />

        <path
          d="M34.2 50.6C37.4 54.4 42.6 54.4 45.8 50.6"
          stroke="#9A4336"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
        <path
          d="M35 50.5C37.6 53.4 42.4 53.4 45 50.5"
          stroke="#C45D50"
          strokeWidth="0.9"
          strokeLinecap="round"
        />

        <path
          d="M8 80C12 64.5 24.5 57.2 32.8 57.2L40 68.5L47.2 57.2C55.5 57.2 68 64.5 72 80H8Z"
          fill={`url(#${blazerId})`}
        />
        <path d="M32.8 57.2L22 80H12C14.5 70 24 60 32.8 57.2Z" fill="#0B1220" opacity="0.35" />
        <path d="M47.2 57.2L58 80H68C65.5 70 56 60 47.2 57.2Z" fill="#0B1220" opacity="0.2" />
        <path d="M33.2 57.2L40 71.5L46.8 57.2L40 62.5Z" fill="#F8FAFC" />
        <path d="M36 58L40 67L44 58L40 60.8Z" fill="#E2E8F0" />
      </g>

      {framed ? <circle cx="40" cy="40" r="38.3" stroke="white" strokeWidth="3.4" /> : null}
    </svg>
  );
}
