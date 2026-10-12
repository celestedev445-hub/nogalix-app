import Image from "@/platform/image";
import Link from "@/platform/link";
import { appConfig } from "@/lib/appConfig";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  height = 36,
  href = "/",
}: {
  className?: string;
  height?: number;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center", className)}
      aria-label={appConfig.name}
    >
      <Image
        src={appConfig.logoSrc}
        alt={appConfig.name}
        width={height * 4}
        height={height}
        className="h-9 w-auto object-contain"
        priority
      />
    </Link>
  );
}
