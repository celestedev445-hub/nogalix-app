import { useMemo, useState } from "react";
import Image from "@/platform/image";
import Link from "@/platform/link";
import {
  Briefcase,
  ChevronRight,
  FileText,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
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
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/store/authStore";
import { useCvStore } from "@/store/cvStore";
import { useInterfaceStore } from "@/store/interfaceStore";
import { enterUp, reducedMotion, useSafeReducedMotion } from "@/lib/motion";
import { ScoreRing } from "@/components/cv/ScoreRing";
import { CvCard, CvNewCard } from "@/components/cv/CvCard";
import { HeroCarousel } from "@/components/features/HeroCarousel";
import { PlanFeatureBadge, type PlanTierLabel } from "@/components/plan/PlanFeatureBadge";
import type { CvData } from "@/lib/cvTypes";
import { cn } from "@/lib/utils";

const INSPIRATION: {
  href: string;
  icon: typeof FileText;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  plan: PlanTierLabel;
  tone: string;
  iconClass: string;
}[] = [
  {
    href: "/modeles",
    icon: FileText,
    kicker: "Galerie",
    title: "Parcourir les modèles",
    text: "Mises en page prêtes à remplir, contenu conservé.",
    cta: "Voir les modèles",
    plan: "gratuit",
    tone: "from-[#EEF3FF] to-[#F8FAFC]",
    iconClass: "bg-white text-principale shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
  },
  {
    href: "/candidature",
    icon: Target,
    kicker: "Offre",
    title: "Candidature ciblée",
    text: "CV adapté, lettre et checklist à partir d'une offre.",
    cta: "Candidater",
    plan: "essai-ia",
    tone: "from-emerald-50/90 to-white",
    iconClass: "bg-emerald-50 text-succes",
  },
  {
    href: "/emploi",
    icon: Briefcase,
    kicker: "Matching",
    title: "Offres alignées à votre CV",
    text: "Postes en ligne, classés selon votre profil.",
    cta: "Explorer",
    plan: "premium",
    tone: "from-orange-50/90 to-white",
    iconClass: "bg-orange-50 text-orange-500",
  },
];

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

type InspirationItem = (typeof INSPIRATION)[number];

function InspirationCard({
  item,
  className,
}: {
  item: InspirationItem;
  className?: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex min-w-0 items-start gap-3 overflow-visible rounded-xl bg-gradient-to-br p-3.5",
        item.tone,
        "transition-transform duration-brand ease-brand hover:-translate-y-0.5 motion-reduce:transform-none",
        className,
      )}
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.iconClass)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy/40">
            {item.kicker}
          </span>
          <PlanFeatureBadge plan={item.plan} compact />
        </span>
        <span className="mt-0.5 block text-sm font-semibold text-navy">{item.title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-navy/55">{item.text}</span>
        <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-principale">
          {item.cta}
          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-brand ease-brand group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </span>
      </span>
    </Link>
  );
}

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const items = useCvStore((s) => s.items);
  const remove = useCvStore((s) => s.remove);
  const setAssistantOpen = useInterfaceStore((s) => s.setAssistantOpen);
  const reduce = useSafeReducedMotion();
  const [toDelete, setToDelete] = useState<CvData | null>(null);
  const recentCvs = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3),
    [items],
  );
  const firstName = user?.first_name || user?.name?.split(" ")[0] || "";
  const motionProps = reduce ? reducedMotion : enterUp;
  const principal = items.find((cv) => cv.principal) || items[0];
  const completion = principal?.completion ?? 0;
  const scoreLabel =
    completion >= 85 ? "Très bon" : completion >= 70 ? "Bon" : completion >= 40 ? "En cours" : "À compléter";
  const scoreCategories = principal
    ? [
        {
          id: "identite",
          label: "Identité",
          score: Math.min(
            100,
            (principal.identity.firstName && principal.identity.lastName ? 50 : 0) +
              (principal.identity.email ? 25 : 0) +
              (principal.identity.title ? 25 : 0),
          ),
        },
        {
          id: "experience",
          label: "Expérience",
          score: Math.min(100, principal.experiences.length * 35),
        },
        {
          id: "competences",
          label: "Compétences",
          score: Math.min(100, principal.skills.length * 20),
        },
      ]
    : [];

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <motion.section
        {...motionProps}
        className="relative min-w-0 overflow-hidden rounded-2xl bg-navy px-5 py-5 text-white sm:px-8 sm:py-6 md:px-10 md:py-7"
      >
        <Image
          src="/images/fondHero.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1580px) 1580px, 100vw"
          className="pointer-events-none select-none object-cover object-[72%_center]"
        />
        <div className="relative grid min-w-0 items-center gap-5 lg:grid-cols-2 lg:gap-4">
          <div className="relative z-10 min-w-0">
            <p className="text-sm text-amber-100/90">{firstName ? `Bonjour ${firstName}` : "Bonjour"} 👋</p>
            <h1 className="mt-3 font-display text-[1.4rem] font-bold leading-tight sm:text-[1.85rem] md:text-[2.05rem] lg:text-[2.2rem] lg:leading-[1.15]">
              Créez un CV qui fait la différence
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
              Importez, convertissez, traduisez ou candidatez depuis une offre.
              Tout est dans votre espace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 sm:mt-10">
              <Button
                asChild
                className="h-11 rounded-xl bg-principale px-5 shadow-brand hover:bg-principale/90"
              >
                <Link href="/cv/nouveau">
                  <Sparkles className="h-4 w-4" />
                  Créer mon CV
                </Link>
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl border border-principale bg-transparent px-5 text-white shadow-none hover:bg-principale/15 hover:text-white"
                onClick={() => setAssistantOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                Demander à l&apos;IA
              </Button>
            </div>
          </div>
          <div className="relative hidden min-w-0 lg:block">
            <HeroCarousel />
          </div>
        </div>
      </motion.section>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(16.5rem,20.5rem)]">
        <section className={cn("min-w-0 rounded-xl bg-white p-5", cardShadow)}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate font-display text-base font-semibold text-navy sm:text-lg">
              Continuez là où vous vous êtes arrêtés
            </h2>
            <Link
              href="/cv"
              className="inline-flex shrink-0 items-center text-sm font-medium text-principale"
            >
              Voir tout <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="cv-card-grid">
            {recentCvs.map((cv) => (
              <CvCard key={cv.id} cv={cv} onDelete={setToDelete} />
            ))}
            <CvNewCard />
          </div>
        </section>

        <aside className={cn("min-w-0 rounded-xl bg-white p-5", cardShadow)}>
          <p className="font-display text-base font-semibold text-navy">Complétion de votre CV</p>
          {principal ? (
            <>
              <p className="mt-1 truncate text-xs text-navy/55" title={principal.title}>
                {principal.title}
              </p>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center xl:flex-col 2xl:flex-row">
                <ScoreRing
                  value={completion}
                  size={108}
                  stroke={9}
                  trackClassName="text-gris"
                  barClassName="text-principale"
                >
                  <p className="font-display text-xl font-bold leading-none text-navy">{completion}</p>
                  <p className="text-[10px] text-navy/45">%</p>
                </ScoreRing>
                <div className="w-full min-w-0 flex-1">
                  <p
                    className={cn(
                      "mb-3 text-sm font-semibold",
                      completion >= 70 ? "text-succes" : completion >= 40 ? "text-principale" : "text-amber-600",
                    )}
                  >
                    {scoreLabel}
                  </p>
                  <ul className="space-y-2.5">
                    {scoreCategories.map((cat) => (
                      <li key={cat.id} className="min-w-0">
                        <div className="mb-1 flex justify-between gap-2 text-[11px] text-navy/70">
                          <span className="truncate">{cat.label}</span>
                          <span className="shrink-0 font-medium text-navy">{cat.score}</span>
                        </div>
                        <Progress value={cat.score} className="h-1.5 bg-gris" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button
                asChild
                variant="secondary"
                className="mt-5 h-11 w-full rounded-full bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
              >
                <Link href="/analyse">
                  <TrendingUp className="h-4 w-4" />
                  Lancer une analyse IA
                  <PlanFeatureBadge plan="essai-ia" compact className="ml-1" />
                </Link>
              </Button>
            </>
          ) : (
            <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4 text-center">
              <p className="text-sm text-navy/65">Créez un CV pour suivre sa complétion ici.</p>
              <Button asChild className="mt-4 h-10 rounded-xl">
                <Link href="/cv/nouveau">Créer mon CV</Link>
              </Button>
            </div>
          )}
        </aside>
      </div>

      <section className={cn("min-w-0 overflow-hidden rounded-xl bg-white p-5", cardShadow)}>
        <h2 className="mb-3 font-display text-base font-semibold text-navy sm:text-lg">
          Besoin d&apos;inspiration ?
        </h2>
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
          {INSPIRATION.map((item) => (
            <InspirationCard key={item.href} item={item} />
          ))}
        </div>
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
