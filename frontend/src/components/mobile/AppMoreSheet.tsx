import Link from "@/platform/link";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type AppMoreItem = {
  href?: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  danger?: boolean;
};

export function AppMoreSheet({
  open,
  onOpenChange,
  title = "Plus",
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  items: AppMoreItem[];
}) {
  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-[1.5rem] border-gris px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gris" aria-hidden />
        <SheetHeader className="mb-3 text-left">
          <SheetTitle className="font-display text-base">{title}</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const className = cn(
              "flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#F8FAFC] px-2 py-3 text-center text-[11px] font-semibold",
              "touch-manipulation transition-transform duration-brand ease-brand active:scale-[0.97]",
              "motion-reduce:transition-none motion-reduce:active:scale-100",
              item.danger ? "text-destructive" : "text-navy",
            );
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => {
                    item.onClick?.();
                    onOpenChange(false);
                  }}
                  className={className}
                >
                  <Icon className={cn("h-5 w-5", item.danger ? "text-destructive" : "text-principale")} />
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                className={className}
                onClick={() => {
                  onOpenChange(false);
                  item.onClick?.();
                }}
              >
                <Icon className={cn("h-5 w-5", item.danger ? "text-destructive" : "text-principale")} />
                {item.label}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
