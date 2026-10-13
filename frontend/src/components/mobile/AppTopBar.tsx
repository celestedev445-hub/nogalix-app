import type { ReactNode } from "react";
import { BrandLogo } from "@/components/vitrine/BrandLogo";
import { cn } from "@/lib/utils";

export function AppTopBar({
  title,
  leading,
  trailing,
  className,
}: {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-gris/70 bg-[#F9FBFF]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md",
        className,
      )}
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <div className="flex min-w-[2.75rem] shrink-0 items-center justify-start">
          {leading ?? <BrandLogo height={28} className="[&_img]:h-7" />}
        </div>
        <h1 className="min-w-0 flex-1 truncate text-center font-display text-[15px] font-bold text-navy">
          {title}
        </h1>
        <div className="flex min-w-[2.75rem] shrink-0 items-center justify-end gap-0.5">
          {trailing}
        </div>
      </div>
    </header>
  );
}
