import Link from "@/platform/link";
import { useRouter } from "@/platform/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Keyboard, Mic, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/cv/ScoreRing";
import { CvThumbnail } from "@/components/cv/CvThumbnail";
import { CvStatusBadge } from "@/components/cv/CvStatusBadge";
import type { CvData } from "@/lib/cvTypes";
import { useAuthStore } from "@/store/authStore";
import { useInterfaceStore } from "@/store/interfaceStore";
import { canUseCapability } from "@/lib/planCapabilities";
import { PlanFeatureBadge } from "@/components/plan/PlanFeatureBadge";
import { toast } from "@/hooks/use-toast";
import { templatesCatalog } from "@/lib/templatesCatalog";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

function templateName(id: string) {
  return templatesCatalog.find((item) => item.id === id)?.name ?? "Modèle";
}

export function CvCard({
  cv,
  onDelete,
}: {
  cv: CvData;
  onDelete?: (cv: CvData) => void;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canVoice = canUseCapability(user, "assistant.voice");

  function openVoice() {
    if (!canVoice) {
      toast({
        title: "Édition vocale",
        description: "La voix consomme un essai IA. Passez Pro pour 30 actions par mois.",
      });
      router.push("/plans");
      return;
    }
    useInterfaceStore.getState().activateCvVoice(cv.id);
    router.push(`/cv/${cv.id}`);
  }

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-xl bg-[#F8FAFC] p-3",
        cardShadow,
        "transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none",
      )}
    >
      <Link href={`/cv/${cv.id}`} className="relative block overflow-hidden rounded-xl">
        <CvThumbnail cv={cv} />
        <div className="absolute left-2 top-2 z-10">
          <CvStatusBadge cv={cv} />
        </div>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col px-1 pb-1 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-navy" title={cv.title}>
                {cv.title}
              </p>
              {cv.principal ? (
                <span className="shrink-0 rounded-full bg-indigo/15 px-2 py-0.5 text-[10px] font-semibold text-indigo">
                  Principal
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-navy/50">
              {templateName(cv.templateId)} · modifié{" "}
              {formatDistanceToNow(new Date(cv.updatedAt), { addSuffix: true, locale: fr })}
            </p>
          </div>
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-navy/40 hover:bg-red-50 hover:text-red-600"
              aria-label={`Supprimer ${cv.title}`}
              onClick={() => onDelete(cv)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <ScoreRing value={cv.completion} size={40} stroke={4}>
              <span className="text-[9px] font-bold text-navy">{cv.completion}%</span>
            </ScoreRing>
            <span className="text-[11px] text-navy/55">Complété</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="h-8 rounded-xl bg-indigo-clair px-3 text-principale shadow-none hover:bg-indigo-clair/80"
            >
              <Link href={`/cv/${cv.id}`}>
                <Keyboard className="h-3.5 w-3.5" />
                Saisie
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 rounded-xl bg-indigo-clair px-3 text-principale shadow-none hover:bg-indigo-clair/80"
              onClick={openVoice}
            >
              <Mic className="h-3.5 w-3.5" />
              Voix
              <PlanFeatureBadge plan="essai-ia" compact className="ml-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CvNewCard({ className }: { className?: string }) {
  return (
    <Link
      href="/cv/nouveau"
      className={cn(
        "flex min-h-[14rem] min-w-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-principale/30 bg-[#F8FAFC] text-center text-navy/55 hover:border-principale/60 hover:text-principale",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-clair text-principale">
        <Plus className="h-6 w-6" />
      </span>
      <span className="mt-3 font-semibold text-navy">Nouveau CV</span>
      <span className="text-xs">Créer un CV vierge</span>
    </Link>
  );
}
