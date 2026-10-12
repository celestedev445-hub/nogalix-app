import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { parseAdminDate, type AdminUser, type AdminUserStatus } from "@/lib/demoAdmin";
import { useAdminStore } from "@/store/adminStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

type Filter = "tous" | AdminUserStatus;

function ago(value: string | null) {
  const date = parseAdminDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true, locale: fr }) : "—";
}

function PlanExpiry({ value }: { value: string | null }) {
  const date = parseAdminDate(value);
  if (!date) return <p className="text-xs text-navy/40">Sans échéance</p>;
  const expired = isPast(date);
  return (
    <p className={cn("text-xs", expired ? "text-red-600" : "text-navy/50")}>
      {expired ? "Expiré le " : "Jusqu'au "}
      {format(date, "d MMM yyyy", { locale: fr })}
    </p>
  );
}

export function AdminUsersView() {
  const users = useAdminStore((s) => s.users);
  const meta = useAdminStore((s) => s.usersMeta);
  const loading = useAdminStore((s) => s.usersLoading);
  const error = useAdminStore((s) => s.usersError);
  const initialFilters = useAdminStore((s) => s.usersFilters);
  const loadUsers = useAdminStore((s) => s.loadUsers);

  function changePage(options: { page?: number; perPage?: number }) {
    void loadUsers(undefined, options);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const setUserStatus = useAdminStore((s) => s.setUserStatus);
  const setUserRole = useAdminStore((s) => s.setUserRole);
  const assignUserPlan = useAdminStore((s) => s.assignUserPlan);
  const removeUser = useAdminStore((s) => s.removeUser);
  const plans = useAdminStore((s) => s.plans);
  const plansLoading = useAdminStore((s) => s.plansLoading);
  const loadPlans = useAdminStore((s) => s.loadPlans);
  const currentUserId = useAuthStore((s) => (s.user?.id != null ? String(s.user.id) : null));

  const [query, setQuery] = useState(initialFilters.q);
  const [filter, setFilter] = useState<Filter>(initialFilters.status ?? "tous");
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (plans.length === 0) void loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const status = filter === "tous" ? undefined : filter;
    if (firstRun.current) {
      firstRun.current = false;
      void loadUsers({ q: query, status });
      return;
    }
    const timer = window.setTimeout(() => {
      void loadUsers({ q: query, status });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function changeFilter(next: Filter) {
    setFilter(next);
    void loadUsers({ q: query, status: next === "tous" ? undefined : next });
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "tous", label: "Tous" },
    { id: "active", label: "Actifs" },
    { id: "disabled", label: "Désactivés" },
  ];

  async function runAction(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const ok = await removeUser(toDelete.id);
    setDeleting(false);
    if (ok) setToDelete(null);
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-principale">Administration</p>
          <h1 className="mt-1 font-display text-2xl font-bold title-logo sm:text-3xl">
            Utilisateurs
          </h1>
          <p className="mt-1 text-sm text-navy/65">
            Comptes inscrits sur Nogalix : statut, rôle et plan d&apos;abonnement.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-10 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
          disabled={loading}
          onClick={() => void loadUsers()}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      <section className={cn("min-w-0 rounded-xl bg-white p-5", cardShadow)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un nom, un e-mail…"
              aria-label="Rechercher un utilisateur"
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

        <p className="mt-4 text-sm text-navy/50">
          {meta.total} utilisateur{meta.total > 1 ? "s" : ""}
        </p>

        {loading && users.length === 0 ? (
          <div className="flex justify-center py-10">
            <BrandLoader size={48} label="Chargement des utilisateurs" />
          </div>
        ) : error && users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <p className="text-sm text-navy/60">{error}</p>
            <Button type="button" className="h-9 rounded-xl" onClick={() => void loadUsers()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <div className={cn("mt-3 overflow-x-auto transition-opacity", loading && "opacity-60")}>
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gris text-xs uppercase tracking-wide text-navy/45">
                  <th className="pb-3 pr-3 font-medium">Membre</th>
                  <th className="pb-3 pr-3 font-medium">Plan</th>
                  <th className="pb-3 pr-3 font-medium">CV</th>
                  <th className="pb-3 pr-3 font-medium">Statut</th>
                  <th className="pb-3 pr-3 font-medium">Dernière activité</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = currentUserId === user.id;
                  const busy = busyId === user.id;
                  return (
                    <tr key={user.id} className="border-b border-gris/70 align-top last:border-0">
                      <td className="py-3.5 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-navy">{user.name}</p>
                          {user.role === "admin" ? (
                            <Badge
                              variant="secondary"
                              className="rounded-full bg-indigo/15 text-indigo hover:bg-indigo/15"
                            >
                              Admin
                            </Badge>
                          ) : null}
                          {isSelf ? (
                            <Badge variant="outline" className="rounded-full border-gris text-navy/50">
                              Vous
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-navy/50">
                          {user.email}
                          {user.hasGoogle ? " · Google" : ""}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <Select
                          value={user.planId != null ? String(user.planId) : ""}
                          disabled={busy || (plansLoading && plans.length === 0)}
                          onValueChange={(value) => {
                            const planId = Number(value);
                            if (!planId || planId === user.planId) return;
                            void runAction(user.id, () => assignUserPlan(user.id, planId));
                          }}
                        >
                          <SelectTrigger
                            className="h-9 w-40 rounded-xl border-gris bg-white text-sm"
                            aria-label={`Plan de ${user.name}`}
                          >
                            <SelectValue placeholder={user.plan || "Choisir un plan"} />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.length === 0 && user.planId != null ? (
                              <SelectItem value={String(user.planId)}>
                                {user.plan || "Plan actuel"}
                              </SelectItem>
                            ) : null}
                            {plans.map((plan) => (
                              <SelectItem key={plan.id} value={String(plan.id)}>
                                {plan.name}
                                {!plan.is_active ? " (inactif)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-1">
                          {user.planSlug === "gratuit" && !user.planExpiresAt ? (
                            <p className="text-xs text-navy/40">Offre gratuite</p>
                          ) : (
                            <PlanExpiry value={user.planExpiresAt} />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pr-3 text-navy/80">{user.cvCount}</td>
                      <td className="py-3.5 pr-3">
                        <Badge
                          variant={user.status === "active" ? "success" : "warning"}
                          className="rounded-full"
                        >
                          {user.status === "active" ? "Actif" : "Désactivé"}
                        </Badge>
                      </td>
                      <td className="py-3.5 pr-3 text-navy/55">
                        <p>{ago(user.lastSeenAt)}</p>
                        <p className="text-[11px] text-navy/40">Inscrit {ago(user.createdAt)}</p>
                      </td>
                      <td className="py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl"
                              disabled={busy}
                              aria-label={`Actions pour ${user.name}`}
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.status === "active" ? (
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() =>
                                  void runAction(user.id, () => setUserStatus(user.id, "disabled"))
                                }
                              >
                                <UserX className="h-4 w-4" />
                                Désactiver
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  void runAction(user.id, () => setUserStatus(user.id, "active"))
                                }
                              >
                                <UserCheck className="h-4 w-4" />
                                Réactiver
                              </DropdownMenuItem>
                            )}
                            {user.role === "admin" ? (
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() =>
                                  void runAction(user.id, () => setUserRole(user.id, "user"))
                                }
                              >
                                <ShieldOff className="h-4 w-4" />
                                Retirer le rôle admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  void runAction(user.id, () => setUserRole(user.id, "admin"))
                                }
                              >
                                <ShieldCheck className="h-4 w-4" />
                                Nommer administrateur
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={isSelf}
                              onClick={() => setToDelete(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {users.length === 0 ? (
              <p className="py-8 text-center text-sm text-navy/50">Aucun utilisateur trouvé.</p>
            ) : null}
          </div>
        )}
        <AdminPagination
          meta={meta}
          itemLabel={["utilisateur", "utilisateurs"]}
          disabled={loading}
          onPage={(page) => changePage({ page })}
          onPerPage={(perPage) => changePage({ perPage })}
        />
      </section>

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `${toDelete.name} sera retiré, ainsi que ses CV associés. Cette action est définitive.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
