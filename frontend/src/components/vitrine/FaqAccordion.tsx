import { useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function FaqAccordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState(0);

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const active = open === index;
        return (
          <div key={item.q} className={cn("rounded-2xl bg-white", cardShadow)}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left sm:px-5"
              aria-expanded={active}
              onClick={() => setOpen(active ? -1 : index)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-clair text-principale">
                  <CircleHelp className="h-4 w-4" />
                </span>
                <span className="font-medium leading-snug text-navy">{item.q}</span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-navy/40 transition-transform duration-200 ease-brand motion-reduce:transition-none",
                  active && "rotate-180",
                )}
              />
            </button>
            {active ? (
              <p className="px-4 pb-4 pl-[3.75rem] text-sm leading-relaxed text-navy/65 sm:px-5 sm:pl-[4.25rem]">
                {item.a}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
