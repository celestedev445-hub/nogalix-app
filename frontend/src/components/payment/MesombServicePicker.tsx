import { Check } from "lucide-react";
import {
  MESOMB_SERVICE_LABELS,
  MESOMB_SERVICE_STYLE,
  type MesombService,
} from "@/lib/mesombCountries";
import { cn } from "@/lib/utils";

export function MesombServicePicker({
  services,
  value,
  onChange,
}: {
  services: MesombService[];
  value: MesombService;
  onChange: (service: MesombService) => void;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-2.5 pt-1.5",
        services.length === 1 ? "grid-cols-1" : "grid-cols-2",
      )}
      role="listbox"
      aria-label="Opérateur Mobile Money"
    >
      {services.map((service) => {
        const style = MESOMB_SERVICE_STYLE[service];
        const selected = value === service;
        return (
          <button
            key={service}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(service)}
            className={cn(
              "relative flex min-w-0 items-center justify-center rounded-xl border-2 px-3 py-3 text-center",
              "transition-[border-color,box-shadow,background-color,transform,opacity] duration-150 ease-out",
              "active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none",
              selected
                ? cn(style.activeClass, "z-[1] shadow-md")
                : cn("border-gris bg-white opacity-75", style.hoverClass, "hover:opacity-100"),
            )}
          >
            <span
              className={cn(
                "truncate text-sm leading-tight",
                selected ? "font-semibold text-navy" : "font-medium text-navy/60",
              )}
            >
              {MESOMB_SERVICE_LABELS[service]}
            </span>
            {selected ? (
              <span
                className={cn(
                  "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full shadow-sm",
                  style.badgeClass,
                )}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
