import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminListMeta } from "@/lib/demoAdmin";
import { ADMIN_PAGE_SIZES } from "@/store/adminStore";
import { cn } from "@/lib/utils";

/** Pages visibles : 1 … 4 5 6 … 12 (« null » = ellipse). */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

export function AdminPagination({
  meta,
  itemLabel,
  disabled,
  onPage,
  onPerPage,
  className,
}: {
  meta: AdminListMeta;
  /** Libellés singulier / pluriel : ["utilisateur", "utilisateurs"]. */
  itemLabel: [string, string];
  disabled?: boolean;
  onPage: (page: number) => void;
  onPerPage: (perPage: number) => void;
  className?: string;
}) {
  const { total, page, per_page: perPage } = meta;
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const navBtn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <div
      className={cn(
        "mt-4 flex flex-col gap-3 border-t border-gris pt-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-navy/55">
        <p className="tabular-nums">
          <span className="font-medium text-navy">
            {from.toLocaleString("fr-FR")}–{to.toLocaleString("fr-FR")}
          </span>{" "}
          sur {total.toLocaleString("fr-FR")} {total > 1 ? itemLabel[1] : itemLabel[0]}
        </p>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Par page</span>
          <Select
            value={String(perPage)}
            disabled={disabled}
            onValueChange={(value) => onPerPage(Number(value))}
          >
            <SelectTrigger className="h-9 w-[4.5rem] rounded-xl" aria-label="Lignes par page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalPages > 1 ? (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            className={cn(navBtn, "text-navy/70 hover:bg-indigo-clair hover:text-principale")}
            disabled={disabled || page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Précédent</span>
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1 text-sm text-navy/35" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => p !== page && onPage(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  navBtn,
                  "tabular-nums",
                  p === page
                    ? "bg-principale text-white shadow-sm"
                    : "text-navy/70 hover:bg-indigo-clair hover:text-principale",
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            className={cn(navBtn, "text-navy/70 hover:bg-indigo-clair hover:text-principale")}
            disabled={disabled || page >= totalPages}
            onClick={() => onPage(page + 1)}
            aria-label="Page suivante"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
