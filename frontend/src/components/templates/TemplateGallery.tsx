import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "@/platform/link";
import { useRouter } from "@/platform/navigation";
import { Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { templatesCatalog, templateFilters } from "@/lib/templatesCatalog";
import type { TemplateCategory } from "@/lib/cvTypes";
import { previewCvForTemplate } from "@/lib/templatePreviews";
import { CvTemplateThumb } from "@/components/templates/CvTemplateThumb";
import { TemplateStartModal } from "@/components/templates/TemplateStartModal";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { cn } from "@/lib/utils";
import { useInterfaceStore } from "@/store/interfaceStore";
import { useAuthStore } from "@/store/authStore";
import { canUseCapability } from "@/lib/planCapabilities";
import { toast } from "@/hooks/use-toast";
import { useCreateCvFromTemplate } from "@/hooks/useCreateCvFromTemplate";
import { useHydrated } from "@/hooks/use-hydrated";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function TemplateGallery({
  selectedId,
  onSelect,
  dark = false,
  hideHeading = false,
  toolbarEnd,
  confirmStart,
  initialTemplateId,
}: {
  selectedId?: string;
  onSelect?: (id: string) => void;
  dark?: boolean;
  hideHeading?: boolean;
  toolbarEnd?: ReactNode;
  confirmStart?: boolean;
  initialTemplateId?: string | null;
}) {
  const [filter, setFilter] = useState<TemplateCategory>("tous");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const setAssistantOpen = useInterfaceStore((s) => s.setAssistantOpen);
  const mounted = useHydrated();
  const user = useAuthStore((s) => s.user);
  const canPremium = mounted && canUseCapability(user, "templates.premium");
  const { saving, createCv } = useCreateCvFromTemplate();
  const startOnSelect = confirmStart ?? !onSelect;
  const activeId = pendingId ?? selectedId;
  const list = useMemo(
    () =>
      templatesCatalog.filter(
        (item) => filter === "tous" || (filter === "premium" ? item.premium : item.category === filter),
      ),
    [filter],
  );

  useEffect(() => {
    if (!startOnSelect || !initialTemplateId) return;
    if (!templatesCatalog.some((item) => item.id === initialTemplateId)) return;
    setPendingId(initialTemplateId);
    setModalOpen(true);
    // Deep link: open once when the gallery mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTemplate(id: string, premium?: boolean) {
    if (premium && !canPremium) {
      toast({
        title: "Modèle Pro / Premium",
        description: "Passez à Pro pour utiliser les modèles premium.",
      });
      router.push("/plans");
      return;
    }
    onSelect?.(id);
    if (startOnSelect) {
      setPendingId(id);
      setModalOpen(true);
    }
  }

  return (
    <div className={cn("space-y-6", dark && "text-white")}>
      {hideHeading ? null : (
        <div>
          <h1 className="font-display text-3xl font-bold title-logo">Modèles de CV</h1>
          <p className={cn("mt-1 max-w-2xl", dark ? "text-white/70" : "text-navy/65")}>
            Tous les modèles du dossier, fidèles aux maquettes. Changez de modèle à tout moment, votre
            contenu est conservé.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="scroll-row-mobile flex flex-wrap gap-2">
          {templateFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-xl px-4 py-1.5 text-sm font-semibold transition-transform duration-brand ease-brand active:scale-[0.97] motion-reduce:transition-none",
                filter === item.id
                  ? "bg-indigo-clair text-principale"
                  : dark
                    ? "bg-white/10 text-white/80"
                    : "text-navy/55 hover:bg-indigo-clair/70",
              )}
            >
              {item.id === "premium" ? (
                <span className="inline-flex items-center gap-1">
                  {item.label} <Crown className="h-3 w-3" />
                </span>
              ) : (
                item.label
              )}
            </button>
          ))}
        </div>
        {toolbarEnd ? <div className="flex flex-wrap items-center gap-2">{toolbarEnd}</div> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((template) => {
          const selected = activeId === template.id;
          const preview = previewCvForTemplate(template.id);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => !saving && selectTemplate(template.id, template.premium)}
              className={cn(
                "relative rounded-xl p-1.5 text-left transition-transform duration-brand ease-brand hover:-translate-y-0.5 motion-reduce:transform-none",
                dark ? "bg-white/5" : cn("bg-white", cardShadow),
                selected && "ring-2 ring-principale/40",
                template.premium && !canPremium && "opacity-80",
              )}
            >
              <CvTemplateThumb cv={preview} />
              <div className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
                <p className="truncate text-[13px] font-medium">{template.name}</p>
                {template.premium ? (
                  <Badge className="shrink-0 px-1.5 py-0 text-[10px]">
                    {canPremium ? "Pro" : "Verrouillé"}
                  </Badge>
                ) : null}
              </div>
              {selected ? (
                <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-principale text-white shadow-sm">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div
        className={cn(
          "flex flex-col items-start justify-between gap-3 rounded-xl p-5 md:flex-row md:items-center",
          dark ? "bg-white/10" : "bg-indigo-clair",
        )}
      >
        <p className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-indigo" />
          Besoin d&apos;aide pour choisir ? Demandez à l&apos;IA quel modèle vous correspond le mieux.
        </p>
        <div className="flex flex-wrap gap-2">
          {hideHeading ? null : (
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/cv/nouveau">Créer un CV</Link>
            </Button>
          )}
          <Button className="rounded-xl" onClick={() => setAssistantOpen(true)}>
            Demander à l&apos;IA
          </Button>
        </div>
      </div>
      {startOnSelect ? (
        <>
          {saving ? (
            <div
              className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-[#F9FBFF]/90 backdrop-blur-[2px]"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <BrandLoader size={72} label="Ouverture de l’éditeur…" />
              <p className="text-sm font-medium text-navy/70">Ouverture de l’éditeur…</p>
            </div>
          ) : null}
          <TemplateStartModal
            open={modalOpen}
            templateId={pendingId}
            saving={saving}
            onOpenChange={setModalOpen}
            onConfirm={() => {
              if (pendingId) void createCv(pendingId);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
