import Link from "@/platform/link";
import { usePathname } from "@/platform/navigation";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAppTabActive } from "@/lib/appNav";

export type AppTabItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string[];
};

export function AppTabBar({
  tabs,
  moreOpen,
  onMoreClick,
  className,
}: {
  tabs: AppTabItem[];
  moreOpen?: boolean;
  onMoreClick: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const moreActive =
    moreOpen ||
    tabs.every((tab) => !isAppTabActive(pathname, tab.href, tab.match));

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        "app-tabbar pointer-events-none fixed inset-x-0 bottom-0 z-40",
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto max-w-lg px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        <div className="flex items-stretch rounded-[1.35rem] border border-gris/80 bg-white/95 px-1 py-1 shadow-[0_-8px_28px_-12px_rgba(15,23,42,0.18)] backdrop-blur-md">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = !moreOpen && isAppTabActive(pathname, tab.href, tab.match);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold tracking-wide",
                  "touch-manipulation transition-[color,background-color,transform] duration-brand ease-brand",
                  "active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
                  active ? "bg-indigo-clair text-principale" : "text-navy/45",
                )}
              >
                <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={active ? 2.35 : 1.9} />
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-label="Plus"
            onClick={onMoreClick}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold tracking-wide",
              "touch-manipulation transition-[color,background-color,transform] duration-brand ease-brand",
              "active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
              moreActive ? "bg-indigo-clair text-principale" : "text-navy/45",
            )}
          >
            <MoreHorizontal className="h-[1.15rem] w-[1.15rem]" strokeWidth={moreActive ? 2.35 : 1.9} />
            <span>Plus</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
