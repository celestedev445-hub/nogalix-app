import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { BrandLoader } from "@/components/brand/BrandLoader";
import { parseAdminDate, resolveTemplateName, type AdminCv } from "@/lib/demoAdmin";
import { useAdminStore } from "@/store/adminStore";
import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

function ago(value: string | null) {
  const date = parseAdminDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true, locale: fr }) : "—";
}

export function AdminCvsView() {
  const cvs = useAdminStore((s) => s.cvs);
  const meta = useAdminStore((s) => s.cvsMeta);
  const loading = useAdminStore((s) => s.cvsLoading);
  const error = useAdminStore((s) => s.cvsError);
  const initialFilters = useAdminStore((s) => s.cvsFilters);
  const loadCvs = useAdminStore((s) => s.loadCvs);

  function changePage(options: { page?: number; perPage?: number }) {
    void loadCvs(undefined, options);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const removeCv = useAdminStore((s) => s.removeCv);
  const [query, setQuery] = useState(initialFilters.q);
  const [toDelete, setToDelete] = useState<AdminCv | null>(null);
  const [deleting, setDeleting] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      void loadCvs({ q: query });
      return;
    }
    const timer = window.setTimeout(() => {
      void loadCvs({ q: query });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const ok = await removeCv(toDelete.id);
    setDeleting(false);
    if (ok) setToDelete(null);
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-principale">Administration</p>
          <h1 className="mt-1 font-display text-2xl font-bold title-logo sm:text-3xl">CV</h1>
          <p className="mt-1 text-sm text-navy/65">Tous les CV créés sur la plateforme.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-10 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
          disabled={loading}
          onClick={() => void loadCvs()}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      <section className={cn("min-w-0 rounded-xl bg-white p-5", cardShadow)}>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un titre, un auteur…"
            aria-label="Rechercher un CV"
            className="h-10 rounded-xl border-gris pl-9"
          />
        </div>

        <p className="mt-4 text-sm text-navy/50">
          {meta.total} CV
        </p>

        {loading && cvs.length === 0 ? (
          <div className="flex justify-center py-10">
            <BrandLoader size={48} label="Chargement des CV" />
          </div>
        ) : error && cvs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <p className="text-sm text-navy/60">{error}</p>
            <Button type="button" className="h-9 rounded-xl" onClick={() => void loadCvs()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <div className={cn("mt-3 overflow-x-auto transition-opacity", loading && "opacity-60")}>
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gris text-xs uppercase tracking-wide text-navy/45">
                  <th className="pb-3 pr-3 font-medium">CV</th>
                  <th className="pb-3 pr-3 font-medium">Auteur</th>
                  <th className="pb-3 pr-3 font-medium">Modèle</th>
                  <th className="pb-3 pr-3 font-medium">Complétion</th>
                  <th className="pb-3 pr-3 font-medium">Modifié</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cvs.map((cv) => (
                  <tr key={cv.id} className="border-b border-gris/70 last:border-0">
                    <td className="py-3.5 pr-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-navy">{cv.title || "Sans titre"}</p>
                        {cv.principal ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-indigo/15 text-indigo hover:bg-indigo/15"
                          >
                            Principal
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3.5 pr-3">
                      <p className="text-navy/80">{cv.ownerName || "—"}</p>
                      <p className="text-xs text-navy/45">{cv.ownerEmail}</p>
                    </td>
                    <td className="py-3.5 pr-3 text-navy/80">
                      {resolveTemplateName(cv.templateId, cv.templateName)}
                    </td>
                    <td className="py-3.5 pr-3">
                      <div className="flex min-w-[8rem] items-center gap-2">
                        <Progress value={cv.completion} className="h-1.5 flex-1" />
                        <span className="w-8 text-right text-xs font-semibold text-principale">
                          {cv.completion}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-3 text-navy/55">{ago(cv.updatedAt)}</td>
                    <td className="py-3.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-navy/40 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Supprimer ${cv.title}`}
                        onClick={() => setToDelete(cv)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cvs.length === 0 ? (
              <p className="py-8 text-center text-sm text-navy/50">Aucun CV trouvé.</p>
            ) : null}
          </div>
        )}
        <AdminPagination
          meta={meta}
          itemLabel={["CV", "CV"]}
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
            <AlertDialogTitle>Supprimer ce CV ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `« ${toDelete.title} » de ${toDelete.ownerName} sera définitivement retiré.`
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
