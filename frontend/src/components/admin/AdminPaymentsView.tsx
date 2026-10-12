import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLoader } from "@/components/brand/BrandLoader";
import {
  formatFcfa,
  parseAdminDate,
  type AdminPaymentStatus,
} from "@/lib/demoAdmin";
import { useAdminStore } from "@/store/adminStore";
import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

type Filter = "tous" | AdminPaymentStatus;

const statusMeta: Record<AdminPaymentStatus, { label: string; className: string }> = {
  completed: { label: "Payé", className: "border-transparent bg-succes/15 text-succes" },
  pending: { label: "En attente", className: "border-transparent bg-amber-100 text-amber-800" },
  failed: { label: "Échoué", className: "border-transparent bg-red-50 text-red-600" },
  cancelled: { label: "Annulé", className: "border-transparent bg-gris text-navy/60" },
  expired: { label: "Expiré", className: "border-transparent bg-indigo-clair text-indigo" },
};

export function PaymentStatusBadge({ status }: { status: AdminPaymentStatus }) {
  const meta = statusMeta[status] ?? { label: status, className: "bg-gris text-navy/60" };
  return <Badge className={cn("rounded-full shadow-none", meta.className)}>{meta.label}</Badge>;
}

function formatDate(value: string | null) {
  const date = parseAdminDate(value);
  return date ? format(date, "d MMM yyyy, HH:mm", { locale: fr }) : "—";
}

function formatDay(value: string | null) {
  const date = parseAdminDate(value);
  return date ? format(date, "d MMM yyyy", { locale: fr }) : "—";
}

export function AdminPaymentsView() {
  const payments = useAdminStore((s) => s.payments);
  const meta = useAdminStore((s) => s.paymentsMeta);
  const loading = useAdminStore((s) => s.paymentsLoading);
  const error = useAdminStore((s) => s.paymentsError);
  const initialFilters = useAdminStore((s) => s.paymentsFilters);
  const loadPayments = useAdminStore((s) => s.loadPayments);

  function changePage(options: { page?: number; perPage?: number }) {
    void loadPayments(undefined, options);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const [query, setQuery] = useState(initialFilters.q);
  const [filter, setFilter] = useState<Filter>(initialFilters.status ?? "tous");
  const firstRun = useRef(true);

  useEffect(() => {
    const status = filter === "tous" ? undefined : filter;
    if (firstRun.current) {
      firstRun.current = false;
      void loadPayments({ q: query, status });
      return;
    }
    const timer = window.setTimeout(() => {
      void loadPayments({ q: query, status });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function changeFilter(next: Filter) {
    setFilter(next);
    void loadPayments({ q: query, status: next === "tous" ? undefined : next });
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "tous", label: "Tous" },
    { id: "completed", label: "Payés" },
    { id: "pending", label: "En attente" },
    { id: "failed", label: "Échoués" },
    { id: "cancelled", label: "Annulés" },
    { id: "expired", label: "Expirés" },
  ];

  const pageTotal = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-principale">Administration</p>
          <h1 className="mt-1 font-display text-2xl font-bold title-logo sm:text-3xl">
            Paiements
          </h1>
          <p className="mt-1 text-sm text-navy/65">
            Transactions Mobile Money (MTN, Orange) et carte bancaire pour les abonnements.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-10 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
          disabled={loading}
          onClick={() => void loadPayments()}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      <section className={cn("min-w-0 rounded-xl bg-white p-5", cardShadow)}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Référence, nom, e-mail, téléphone…"
              aria-label="Rechercher un paiement"
              className="h-10 rounded-xl border-gris pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeFilter(item.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  filter === item.id
                    ? "bg-indigo-clair text-principale"
                    : "text-navy/60 hover:bg-indigo-clair hover:text-principale",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-navy/50">
          <p>
            {meta.total} paiement{meta.total > 1 ? "s" : ""}
          </p>
          {pageTotal > 0 ? (
            <p>
              Encaissé (cette page) :{" "}
              <span className="font-semibold text-succes">{formatFcfa(pageTotal)}</span>
            </p>
          ) : null}
        </div>

        {loading && payments.length === 0 ? (
          <div className="flex justify-center py-10">
            <BrandLoader size={48} label="Chargement des paiements" />
          </div>
        ) : error && payments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <p className="text-sm text-navy/60">{error}</p>
            <Button type="button" className="h-9 rounded-xl" onClick={() => void loadPayments()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <div className={cn("mt-3 overflow-x-auto transition-opacity", loading && "opacity-60")}>
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gris text-xs uppercase tracking-wide text-navy/45">
                  <th className="pb-3 pr-3 font-medium">Référence</th>
                  <th className="pb-3 pr-3 font-medium">Membre</th>
                  <th className="pb-3 pr-3 font-medium">Plan</th>
                  <th className="pb-3 pr-3 font-medium">Montant</th>
                  <th className="pb-3 pr-3 font-medium">Opérateur</th>
                  <th className="pb-3 pr-3 font-medium">Statut</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gris/70 align-top last:border-0">
                    <td className="py-3.5 pr-3">
                      <p className="font-mono text-xs font-medium text-navy">{payment.reference}</p>
                      {payment.provider_reference ? (
                        <p className="mt-0.5 font-mono text-[11px] text-navy/40">
                          {payment.provider_reference}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3.5 pr-3">
                      <p className="font-medium text-navy">
                        {payment.user?.name || "Utilisateur supprimé"}
                      </p>
                      <p className="text-xs text-navy/50">{payment.user?.email || "—"}</p>
                    </td>
                    <td className="py-3.5 pr-3">
                      <p className="text-navy/80">
                        {payment.plan_name || payment.plan_slug || "—"}
                      </p>
                      <p className="text-xs text-navy/45">
                        {payment.months} mois
                        {payment.period_end ? ` · jusqu'au ${formatDay(payment.period_end)}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap py-3.5 pr-3 font-semibold text-navy">
                      {formatFcfa(payment.amount)}
                    </td>
                    <td className="py-3.5 pr-3">
                      <p className="text-navy/80">{payment.service || "—"}</p>
                      <p className="text-xs text-navy/45">{payment.phone || ""}</p>
                    </td>
                    <td className="py-3.5 pr-3">
                      <PaymentStatusBadge status={payment.status} />
                      {payment.failure_reason && payment.status !== "completed" ? (
                        <p className="mt-1 max-w-[12rem] text-[11px] text-navy/50">
                          {payment.failure_reason}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3.5 text-navy/55">
                      <p className="whitespace-nowrap">
                        {formatDate(payment.paid_at || payment.created_at)}
                      </p>
                      {payment.paid_at ? (
                        <p className="text-[11px] text-navy/40">
                          Créé le {formatDate(payment.created_at)}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-navy/50">Aucun paiement trouvé.</p>
            ) : null}
          </div>
        )}
        <AdminPagination
          meta={meta}
          itemLabel={["paiement", "paiements"]}
          disabled={loading}
          onPage={(page) => changePage({ page })}
          onPerPage={(perPage) => changePage({ perPage })}
        />
      </section>
    </div>
  );
}
