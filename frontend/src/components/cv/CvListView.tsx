import { useState } from "react";
import Link from "@/platform/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { CvCard, CvNewCard } from "@/components/cv/CvCard";
import type { CvData } from "@/lib/cvTypes";
import { useCvStore } from "@/store/cvStore";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function CvListView() {
  const items = useCvStore((s) => s.items);
  const loaded = useCvStore((s) => s.loaded);
  const remove = useCvStore((s) => s.remove);
  const duplicate = useCvStore((s) => s.duplicate);
  const [toDelete, setToDelete] = useState<CvData | null>(null);

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold title-logo sm:text-3xl">Mes CV</h1>
          <p className="mt-1 text-sm text-navy/65">
            Retrouvez vos CV et reprenez exactement là où vous vous êtes arrêtés.
          </p>
        </div>
        <Button asChild className="h-11 w-full rounded-xl bg-principale px-5 shadow-brand hover:bg-principale/90 sm:w-auto">
          <Link href="/cv/nouveau">
            <Plus className="h-4 w-4" />
            Nouveau CV
          </Link>
        </Button>
      </div>

      <section className={cn("min-w-0 rounded-xl bg-white p-5", cardShadow)}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-navy/55">
            {!loaded ? "Chargement…" : `${items.length} CV`}
          </p>
        </div>
        {!loaded ? (
          <div className="cv-card-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-xl bg-[#F8FAFC]"
                aria-hidden
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-[#F8FAFC] px-4 py-12 text-center">
            <p className="font-display text-lg font-semibold text-navy">Aucun CV pour l&apos;instant</p>
            <p className="mt-1 text-sm text-navy/55">
              Créez votre premier CV pour démarrer l&apos;édition, l&apos;analyse et les candidatures.
            </p>
            <Button asChild className="mt-5 h-11 rounded-xl">
              <Link href="/cv/nouveau">
                <Plus className="h-4 w-4" />
                Créer mon premier CV
              </Link>
            </Button>
          </div>
        ) : (
        <div className="cv-card-grid">
          {items.map((cv) => (
            <CvCard
                key={cv.id}
                cv={cv}
                onDelete={setToDelete}
                onDuplicate={(item) => void duplicate(item.id)}
              />
          ))}
          <CvNewCard />
        </div>
        )}
      </section>

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce CV ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `« ${toDelete.title} » sera définitivement retiré de votre espace.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!toDelete) return;
                void remove(toDelete.id);
                setToDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
