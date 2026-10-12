import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "@/platform/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  MessageSquare,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { enterUp, reducedMotion, useSafeReducedMotion } from "@/lib/motion";
import { formatFcfa, parseAdminDate, type AdminActivityPoint } from "@/lib/demoAdmin";
import { useAdminStore } from "@/store/adminStore";
import { useAuthStore } from "@/store/authStore";
import { PaymentStatusBadge } from "@/components/admin/AdminPaymentsView";
import { cn } from "@/lib/utils";

/** Charte Nogalix : bleu principal dominant, indigo et vert succès en accents. */
const BLUE = "#3A83F7";
const INDIGO = "#4338CA";
const GREEN = "#10B981";
const AMBER = "#F59E0B";
const PALETTE = [BLUE, INDIGO, GREEN, AMBER, "#EC4899", "#64748B"];

type Period = "week" | "month" | "semester";
type Metric = "users" | "cvs" | "revenue";

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "7 derniers jours" },
  { id: "month", label: "30 derniers jours" },
  { id: "semester", label: "6 derniers mois" },
];

const METRICS: { id: Metric; label: string }[] = [
  { id: "users", label: "Inscrits" },
  { id: "cvs", label: "CV" },
  { id: "revenue", label: "Revenus" },
];

function SoftCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-black/[0.03] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardTitle({
  title,
  subtitle,
  href,
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-navy">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-navy/45">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {href ? (
          <Link
            href={href}
            aria-label={title}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/5 text-navy/40 transition hover:border-principale/30 hover:text-principale"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function metricValue(point: AdminActivityPoint, metric: Metric) {
  return metric === "users" ? point.users : metric === "cvs" ? point.cvs : point.revenue;
}

function formatMetric(value: number, metric: Metric) {
  return metric === "revenue" ? formatFcfa(value) : value.toLocaleString("fr-FR");
}

function Donut({ parts }: { parts: { value: number; color: string }[] }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#F1F3F5" strokeWidth="16" />
      {total > 0
        ? parts.map((part, i) => {
            const len = (part.value / total) * c;
            const el = (
              <circle
                key={i}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={part.color}
                strokeWidth="16"
                strokeDasharray={`${Math.max(len - 1.5, 0)} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })
        : null}
    </svg>
  );
}

export function AdminHomeView() {
  const reduce = useSafeReducedMotion();
  const motionProps = reduce ? reducedMotion : enterUp;
  const user = useAuthStore((s) => s.user);
  const stats = useAdminStore((s) => s.stats);
  const statsLoading = useAdminStore((s) => s.statsLoading);
  const statsError = useAdminStore((s) => s.statsError);
  const loadStats = useAdminStore((s) => s.loadStats);
  const recentPayments = useAdminStore((s) => s.recentPayments);
  const recentPaymentsLoading = useAdminStore((s) => s.recentPaymentsLoading);
  const recentPaymentsError = useAdminStore((s) => s.recentPaymentsError);
  const loadRecentPayments = useAdminStore((s) => s.loadRecentPayments);
  const [period, setPeriod] = useState<Period>("week");
  const [metric, setMetric] = useState<Metric>("users");

  useEffect(() => {
    void loadStats();
    void loadRecentPayments();
  }, [loadStats, loadRecentPayments]);

  function reloadAll() {
    void loadStats();
    void loadRecentPayments();
  }

  const firstName =
    (user?.first_name || user?.name || "").trim().split(/\s+/)[0] || "Admin";

  const series = useMemo(() => stats?.activity?.[period] ?? [], [stats, period]);

  const chart = useMemo(() => {
    const values = series.map((p) => metricValue(p, metric));
    const max = Math.max(...values, 0);
    const total = values.reduce((sum, v) => sum + v, 0);
    const peakIndex = max > 0 ? values.lastIndexOf(max) : -1;
    return {
      values,
      max,
      peakIndex,
      total,
      peak: peakIndex >= 0 ? `${formatMetric(max, metric)} · ${series[peakIndex].label}` : "—",
      average: values.length ? formatMetric(Math.round(total / values.length), metric) : "—",
    };
  }, [series, metric]);

  const periodPayments = useMemo(
    () => series.reduce((sum, p) => sum + p.payments, 0),
    [series],
  );

  const plans = useMemo(() => {
    const list = stats?.plans ?? [];
    const total = list.reduce((sum, p) => sum + p.users, 0);
    return list.map((p, i) => ({
      ...p,
      color: PALETTE[i % PALETTE.length],
      pct: total > 0 ? Math.round((p.users / total) * 100) : 0,
    }));
  }, [stats]);

  const topPaidPlan = useMemo(() => {
    const paid = plans.filter((p) => !/gratuit|free/i.test(p.name));
    return [...paid].sort((a, b) => b.users - a.users)[0];
  }, [plans]);

  const volumes = stats
    ? [
        { name: "Comptes", value: stats.usersTotal, color: BLUE },
        { name: "Actifs", value: stats.usersActive, color: INDIGO },
        { name: "Nouveaux", value: stats.usersNew30d, color: GREEN },
        { name: "CV", value: stats.cvsTotal, color: BLUE },
        { name: "Payants", value: stats.plansPaid, color: INDIGO },
        { name: "Messages", value: stats.messagesTotal, color: AMBER },
      ]
    : [];
  const volumesMax = Math.max(...volumes.map((v) => v.value), 1);

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "";

  return (
    <div className="min-w-0 space-y-5 overflow-x-clip">
      <motion.header
        {...motionProps}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <h1 className="font-display text-[1.6rem] font-semibold tracking-tight text-navy md:text-[2rem]">
            Bienvenue, {firstName}
          </h1>
          <p className="mt-0.5 text-sm text-navy/55">
            Comptes, CV, paiements et messages de Nogalix en un coup d&apos;œil.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm text-navy/70 shadow-sm transition hover:bg-indigo-clair/50"
              >
                <CalendarDays className="h-4 w-4 text-navy/40" />
                {periodLabel}
                <ChevronDown className="h-3.5 w-3.5 text-navy/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11rem] rounded-xl">
              {PERIODS.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className={cn(
                    "rounded-lg",
                    period === item.id && "bg-indigo-clair font-semibold text-principale",
                  )}
                  onSelect={() => setPeriod(item.id)}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-full border border-black/10 bg-white px-4 text-navy shadow-sm hover:bg-indigo-clair/50"
            disabled={statsLoading}
            onClick={reloadAll}
          >
            <RefreshCw className={cn("h-4 w-4", statsLoading && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </motion.header>

      {!stats && statsLoading ? (
        <SoftCard className="flex justify-center p-10">
          <BrandLoader size={56} label="Chargement des statistiques" />
        </SoftCard>
      ) : null}

      {!stats && statsError && !statsLoading ? (
        <SoftCard className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-navy">Impossible de charger les statistiques</p>
            <p className="mt-1 text-sm text-navy/55">{statsError}</p>
          </div>
          <Button type="button" className="h-10 rounded-xl" onClick={reloadAll}>
            Réessayer
          </Button>
        </SoftCard>
      ) : null}

      {stats ? (
        <motion.div
          {...motionProps}
          className={cn(
            "grid gap-4",
            "grid-cols-1 md:grid-cols-2",
            "xl:[grid-template-columns:minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]",
            "xl:[grid-template-areas:'hero_act_plans'_'pay_pay_msg'_'pay_pay_vol']",
          )}
        >
          {/* Revenus */}
          <SoftCard className="flex flex-col xl:[grid-area:hero]">
            <CardTitle title="Revenus" subtitle="Paiements Mobile Money encaissés." href="/admin/paiements" />
            <div className="relative overflow-hidden rounded-2xl text-white shadow-[0_10px_24px_-8px_rgba(67,56,202,0.45)]">
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(145deg, ${INDIGO} 0%, ${BLUE} 60%, #60A5FA 100%)` }}
                aria-hidden
              />
              <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/15 blur-2xl" aria-hidden />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.14]"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
                aria-hidden
              />
              <div className="relative flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <span className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-white/80">
                    Nogalix
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/65">
                      30 derniers jours
                    </p>
                    <p className="truncate text-xl font-bold tabular-nums">{formatFcfa(stats.revenue30d)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/65">Total</p>
                    <p className="mt-0.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[0.8125rem] font-semibold tabular-nums">
                      {formatFcfa(stats.revenueTotal)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 border-t border-white/15 pt-2">
                  <div className="min-w-0">
                    <p className="text-[0.5625rem] font-medium uppercase tracking-[0.1em] text-white/55">
                      Abonnés payants
                    </p>
                    <p className="text-[0.8125rem] font-semibold tabular-nums">
                      {stats.plansPaid.toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="min-w-0 border-l border-white/15 pl-2.5">
                    <p className="text-[0.5625rem] font-medium uppercase tracking-[0.1em] text-white/55">
                      Paiements · période
                    </p>
                    <p className="text-[0.8125rem] font-semibold tabular-nums">
                      {periodPayments.toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-1 flex-col justify-end border-t border-black/[0.04] pt-3">
              <p className="text-sm font-semibold text-navy">Top plan payant</p>
              <p className="mt-0.5 text-[11px] text-navy/45">Le plus souscrit par les membres.</p>
              {topPaidPlan ? (
                <>
                  <div className="mt-2.5 flex items-baseline justify-between gap-2">
                    <p className="truncate text-base font-semibold text-navy">{topPaidPlan.name}</p>
                    <span className="rounded-full bg-principale px-2 py-0.5 text-[11px] font-semibold text-white">
                      {topPaidPlan.pct} %
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs tabular-nums text-navy/55">
                    {topPaidPlan.users} membre{topPaidPlan.users > 1 ? "s" : ""}
                  </p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#F1F3F5]">
                    <div className="h-full rounded-full bg-indigo" style={{ width: `${topPaidPlan.pct}%` }} />
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-navy/50">Aucun plan payant pour le moment.</p>
              )}
            </div>
          </SoftCard>

          {/* Activité */}
          <SoftCard className="flex flex-col xl:[grid-area:act]">
            <CardTitle
              title="Activité"
              subtitle={periodLabel}
              action={
                <div className="flex rounded-full bg-[#F1F3F5] p-1 text-xs font-semibold">
                  {METRICS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMetric(item.id)}
                      aria-pressed={metric === item.id}
                      className={cn(
                        "rounded-full px-3 py-1.5 transition",
                        metric === item.id ? "bg-principale text-white shadow-sm" : "text-navy/55",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              }
            />
            {series.length === 0 ? (
              <p className="py-12 text-center text-sm text-navy/45">Aucune donnée d&apos;activité.</p>
            ) : (
              <div className="relative flex h-48 items-end gap-2 border-b border-dashed border-gris pt-8 sm:gap-3">
                {chart.values.map((value, i) => {
                  const pct = chart.max > 0 ? (value / chart.max) * 100 : 0;
                  const peak = i === chart.peakIndex;
                  return (
                    <div key={series[i].label + i} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                      {peak ? (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-principale px-2 py-0.5 text-[10px] font-semibold text-white shadow-md">
                          {formatMetric(value, metric)}
                        </span>
                      ) : null}
                      <div
                        title={`${series[i].label} · ${formatMetric(value, metric)}`}
                        className={cn(
                          "mx-auto w-full max-w-[42px] rounded-xl transition-[height] duration-500",
                          peak ? "bg-principale" : "bg-indigo-clair group-hover:bg-principale/40",
                        )}
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {series.length > 0 ? (
              <div className="mt-2 flex gap-2 sm:gap-3">
                {series.map((p, i) => (
                  <span key={p.label + i} className="min-w-0 flex-1 truncate text-center text-[11px] font-medium text-navy/40">
                    {p.label}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
              {[
                { label: "Total", value: formatMetric(chart.total, metric), bg: "#EEF2FF", accent: BLUE },
                { label: "Pic", value: chart.peak, bg: "#EEF0FF", accent: INDIGO },
                { label: "Moyenne", value: chart.average, bg: "#ECFDF5", accent: GREEN },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-2xl px-2.5 py-2.5" style={{ backgroundColor: item.bg }}>
                  <p className="text-[11px] font-semibold" style={{ color: item.accent }}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-navy">{item.value}</p>
                </div>
              ))}
            </div>
          </SoftCard>

          {/* Répartition par plan */}
          <SoftCard className="flex flex-col xl:[grid-area:plans]">
            <CardTitle title="Répartition" subtitle="Membres par plan." href="/admin/plans" />
            {plans.length === 0 ? (
              <p className="text-sm text-navy/50">Aucun plan configuré.</p>
            ) : (
              <>
                <div className="relative mx-auto h-36 w-36">
                  <Donut parts={plans.map((p) => ({ value: p.users, color: p.color }))} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold tabular-nums text-navy">
                      {stats.usersTotal.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-[11px] text-navy/45">membres</span>
                  </div>
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {plans.map((p) => (
                    <li key={p.name} className="min-w-0 rounded-2xl bg-[#F6F7FB] px-2.5 py-2">
                      <p className="flex items-center gap-1.5 text-navy/50">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="truncate">{p.name} · {p.pct} %</span>
                      </p>
                      <p className="mt-0.5 font-semibold tabular-nums text-navy">
                        {p.users.toLocaleString("fr-FR")}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
              <Link
                href="/admin/utilisateurs"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-principale px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              >
                Membres
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/admin/plans"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-navy transition hover:bg-indigo-clair/50"
              >
                Plans
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </SoftCard>

          {/* Derniers paiements */}
          <SoftCard className="md:col-span-2 xl:col-span-1 xl:[grid-area:pay]">
            <CardTitle
              title="Derniers paiements"
              subtitle="Transactions MeSomb les plus récentes."
              action={
                <Link
                  href="/admin/paiements"
                  className="inline-flex items-center gap-1 rounded-full border border-principale/20 bg-indigo-clair px-3 py-1.5 text-xs font-semibold text-principale transition hover:bg-principale hover:text-white"
                >
                  Voir tous
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {recentPaymentsLoading && recentPayments.length === 0 ? (
              <div className="flex justify-center py-8">
                <BrandLoader size={40} label="Chargement des paiements" />
              </div>
            ) : recentPaymentsError && recentPayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-navy/50">
                Paiements indisponibles : {recentPaymentsError}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] text-navy/40">
                      <th className="pb-3 pr-3 font-medium">Membre</th>
                      <th className="pb-3 pr-3 font-medium">Plan</th>
                      <th className="pb-3 pr-3 font-medium">Date</th>
                      <th className="pb-3 pr-3 font-medium">Statut</th>
                      <th className="pb-3 text-right font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-navy/45">
                          Aucun paiement pour le moment.
                        </td>
                      </tr>
                    ) : (
                      recentPayments.map((payment, index) => {
                        const date = parseAdminDate(payment.paid_at || payment.created_at);
                        const who = payment.user?.name || payment.user?.email || "Utilisateur supprimé";
                        const accent = PALETTE[index % 3];
                        return (
                          <tr key={payment.id} className="border-t border-black/[0.04] transition-colors hover:bg-indigo-clair/40">
                            <td className="py-3 pr-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarFallback
                                    className="text-[10px] font-semibold text-white"
                                    style={{ backgroundColor: accent }}
                                  >
                                    {who.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="max-w-[12rem] truncate font-medium text-navy">{who}</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap py-3 pr-3 text-navy/55">
                              {payment.plan_name || payment.plan_slug || "Plan"} · {payment.months} mois
                            </td>
                            <td className="whitespace-nowrap py-3 pr-3 text-navy/55">
                              {date ? format(date, "d MMM, HH:mm", { locale: fr }) : "—"}
                            </td>
                            <td className="py-3 pr-3">
                              <PaymentStatusBadge status={payment.status} />
                            </td>
                            <td className="whitespace-nowrap py-3 text-right font-semibold tabular-nums text-navy">
                              {formatFcfa(payment.amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </SoftCard>

          {/* Messages */}
          <SoftCard className="xl:[grid-area:msg]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold text-navy">Messages à traiter</h2>
                <p className="mt-0.5 text-xs text-navy/45">Formulaire de contact.</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <p className="text-2xl font-semibold tabular-nums text-navy">
                    {stats.messagesNew.toLocaleString("fr-FR")}
                  </p>
                  <span className="rounded-full bg-principale px-2 py-0.5 text-[11px] font-semibold text-white">
                    non lu{stats.messagesNew > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1F3F5]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${stats.messagesTotal ? Math.round((stats.messagesNew / stats.messagesTotal) * 100) : 0}%`,
                      backgroundColor: AMBER,
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-navy/45">
                  sur {stats.messagesTotal.toLocaleString("fr-FR")} message{stats.messagesTotal > 1 ? "s" : ""}
                </p>
              </div>
              <Link
                href="/admin/messages"
                aria-label="Boîte de réception"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-principale text-white transition hover:brightness-95"
              >
                <MessageSquare className="h-4 w-4" />
              </Link>
            </div>
          </SoftCard>

          {/* Volumes */}
          <SoftCard className="xl:[grid-area:vol]">
            <CardTitle title="Volumes plateforme" subtitle={`CV complétés à ${stats.cvsAvgCompletion} % en moyenne.`} />
            <div className="flex h-32 items-end gap-2">
              {volumes.map((v) => (
                <div key={v.name} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-semibold tabular-nums text-navy">
                    {v.value.toLocaleString("fr-FR")}
                  </span>
                  <div
                    className="w-full max-w-[28px] rounded-lg"
                    style={{ height: `${Math.max((v.value / volumesMax) * 85, 4)}%`, backgroundColor: v.color }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              {volumes.map((v) => (
                <span key={v.name} className="min-w-0 flex-1 truncate text-center text-[10px] text-navy/45">
                  {v.name}
                </span>
              ))}
            </div>
          </SoftCard>
        </motion.div>
      ) : null}
    </div>
  );
}
