import type { ReactNode } from "react";
import Link from "@/platform/link";
import Image from "@/platform/image";
import {
  ArrowLeftRight,
  Check,
  LayoutTemplate,
  Mic,
  Sparkles,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CvTemplateThumb } from "@/components/templates/CvTemplateThumb";
import { appConfig } from "@/lib/appConfig";
import { previewCvForTemplate } from "@/lib/templatePreviews";
import { enterUp, motionEase, reducedMotion, useSafeReducedMotion } from "@/lib/motion";
import { templatesCatalog } from "@/lib/templatesCatalog";
import { HERO_IMAGE_SLIDES, HeroCarousel, type HeroSlide } from "@/components/features/HeroCarousel";
import { homeHighlights } from "@/lib/homeHighlights";
import { cn } from "@/lib/utils";

const card =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]";

const iconBox =
  "inline-flex items-center justify-center rounded-xl bg-indigo-clair text-principale";

const FEATURES: {
  icon: typeof LayoutTemplate;
  title: string;
  text: string;
}[] = [
  {
    icon: LayoutTemplate,
    title: "Éditeur live",
    text: "Deux colonnes : vous saisissez à gauche, le CV se dessine à droite. Identité, expériences et compétences s'affichent comme le verra le recruteur, sans attendre l'export.",
  },
  {
    icon: Mic,
    title: "Dictée vocale",
    text: `Parlez au micro : ${appConfig.assistantFirstName} écoute votre parcours et rédige le CV : résumé, missions, compétences. Vous relisez, ajustez, l'aperçu suit en direct.`,
  },
  {
    icon: Sparkles,
    title: "Agent IA et traduction",
    text: `Dans la bulle, ${appConfig.assistantFirstName} reformule, change le ton ou comble une section. Le bouton Traduire passe le CV dans une autre langue, sans toucher aux noms ni aux contacts.`,
  },
  {
    icon: Target,
    title: "Candidature ciblée",
    text: "Collez une offre : l'IA rédige le CV adapté, la lettre et une checklist. Plus de brouillon générique à retravailler à la main.",
  },
  {
    icon: ArrowLeftRight,
    title: "Convertir et importer",
    text: "PDF vers Word, Word vers PDF, ou import dans l'éditeur. Même reconstruction que dans votre espace, disponible aussi sans compte.",
  },
];

// Illustrations du hero entrecoupées des cartes : illustration, 2 cartes, illustration, 2 cartes…
const HERO_SLIDES: HeroSlide[] = HERO_IMAGE_SLIDES.flatMap((image, index) => [
  image,
  ...homeHighlights
    .slice(index * 2, index * 2 + 2)
    .map((item): HeroSlide => ({ kind: "highlight", item })),
]);

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useSafeReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.32, ease: motionEase, delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({
  kicker,
  title,
  action,
}: {
  kicker: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0 max-w-xl">
        <p className="text-sm font-medium text-principale">{kicker}</p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-navy md:text-[1.75rem] md:leading-snug">
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function LandingView() {
  const reduce = useSafeReducedMotion();
  const motionProps = reduce ? reducedMotion : enterUp;
  const assistant = appConfig.assistantFirstName;

  return (
    <div>
      <motion.section
        {...motionProps}
        className="relative overflow-hidden bg-navy text-white"
      >
        <Image
          src="/images/fondHero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none select-none object-cover object-[72%_center]"
        />
        <div className="site-inner relative grid min-w-0 items-center gap-5 pb-16 pt-28 md:pb-20 md:pt-32 lg:grid-cols-2 lg:gap-4">
          <div className="relative z-10 min-w-0">
            <p className="text-sm font-medium text-amber-100/90">
              Convertir · Importer · Traduire · Candidature IA
            </p>
            <h1 className="mt-3 font-display text-[1.85rem] font-bold leading-tight sm:text-4xl md:text-5xl">
              Le CV qui passe les filtres recruteurs
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/75 sm:text-lg">
              Choisissez un modèle, importez un fichier ou laissez {assistant} rédiger et
              traduire. Exportez en PDF ou Word. Analyse ATS et candidature ciblée incluses.
              Gratuit pour commencer, sans carte.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-11 w-full rounded-xl px-6 shadow-brand sm:w-auto">
                <Link href="/auth/signup">
                  <Sparkles />
                  Créer mon CV gratuitement
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="h-11 w-full rounded-xl border border-white/35 bg-transparent px-6 text-white shadow-none hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <Link href="/convertir">Convertir un fichier</Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
              {["Sans carte bancaire", "PDF ↔ Word sans compte", "Aperçu live"].map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-2 min-w-0 lg:mt-0">
            <HeroCarousel slides={HERO_SLIDES} />
            {/* Le carrousel est décoratif (aria-hidden) : le texte des cartes reste lisible ici. */}
            <ul className="sr-only">
              {homeHighlights.map((item) => (
                <li key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>

      <div className="relative z-10 -mt-7 rounded-t-[1.75rem] bg-[#F9FBFF] md:-mt-9 md:rounded-t-[2.25rem]">
        <div className="site-inner py-10 md:py-12">
          <section>
            <Reveal>
              <SectionHead kicker="L'espace candidat" title="Écrire, dicter, candidater" />
            </Reveal>
            <div className="mt-8 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
              <Reveal>
                <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <Image
                    src="/images/caroussel 0.png"
                    alt="Éditeur CV avec aperçu live"
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-contain object-center"
                  />
                </div>
              </Reveal>
              <ul className="space-y-1">
                {FEATURES.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title}>
                      <Reveal delay={index * 0.05}>
                        <article className="group flex items-start gap-4 rounded-xl px-2 py-3.5">
                          <span
                            className={cn(
                              iconBox,
                              "h-11 w-11 shrink-0 transition-transform duration-200 ease-brand group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 pt-0.5 transition-transform duration-200 ease-brand group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                            <h3 className="font-display text-base font-bold tracking-tight text-navy transition-colors duration-200 ease-brand group-hover:text-principale motion-reduce:transition-none">
                              {item.title}
                            </h3>
                            <p className="mt-0.5 text-sm leading-relaxed text-navy/65">{item.text}</p>
                          </div>
                        </article>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>

        <section className="bg-indigo-clair py-12 md:py-14">
          <div className="site-inner">
            <Reveal>
              <SectionHead
                kicker="Modèles"
                title="Prêts pour les recruteurs"
                action={
                  <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
                    <Link href="/modeles">Tous les modèles</Link>
                  </Button>
                }
              />
            </Reveal>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {templatesCatalog.slice(0, 5).map((template, index) => (
                <Reveal key={template.id} delay={index * 0.05}>
                  <Link href="/modeles" className={cn("flex flex-col p-1.5", card)}>
                    <CvTemplateThumb cv={previewCvForTemplate(template.id)} />
                    <p className="mt-1.5 truncate px-0.5 text-[13px] font-medium text-navy">{template.name}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div className="site-inner py-12 md:py-14">
          <Reveal>
            <section className="relative overflow-hidden rounded-2xl bg-navy text-white">
              <Image
                src="/images/fondHero.png"
                alt=""
                fill
                sizes="(min-width: 1280px) 72rem, 100vw"
                className="pointer-events-none select-none object-cover object-[72%_center]"
              />
              <div className="relative flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-8 md:py-9">
                <div className="min-w-0 max-w-lg">
                  <p className="text-sm font-medium text-amber-100/90">Gratuit · Sans carte · PDF ↔ Word</p>
                  <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight md:text-[1.75rem] md:leading-snug">
                    Créez, importez ou convertissez : prêt pour les recruteurs
                  </h2>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                  <Button asChild size="lg" className="h-11 w-full rounded-xl px-6 shadow-brand sm:w-auto">
                    <Link href="/auth/signup">
                      <Sparkles />
                      Créer mon CV
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    className="h-11 w-full rounded-xl border border-white/35 bg-transparent px-6 text-white shadow-none hover:bg-white/10 hover:text-white sm:w-auto"
                  >
                    <Link href="/modeles">Voir les modèles</Link>
                  </Button>
                </div>
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
