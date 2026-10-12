import { useEffect, useState } from "react";
import Image from "@/platform/image";
import { motion } from "framer-motion";
import type { HomeHighlight } from "@/lib/homeHighlights";
import { useSafeReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type HeroSlide = { kind: "image"; src: string } | { kind: "highlight"; item: HomeHighlight };

export const HERO_IMAGE_SLIDES: HeroSlide[] = [
  { kind: "image", src: "/images/caroussel 0.png" },
  { kind: "image", src: "/images/caroussel 1.png" },
  { kind: "image", src: "/images/caroussel 2.png" },
];

// Le prisme a toujours 3 faces : seule la face de devant est visible, les deux autres
// (à ±120°, dos tourné) reçoivent la diapositive précédente ou suivante. On peut donc
// faire défiler autant de diapositives qu'on veut avec la même rotation.
const FACE_COUNT = 3;
const FACE_ANGLE = 360 / FACE_COUNT;

function mod(value: number, size: number) {
  return ((value % size) + size) % size;
}

/** Diapositive affichée par une face : celle des tours turn-1, turn ou turn+1 qui tombe sur cette face. */
function slideIndexForFace(face: number, turn: number, count: number) {
  const offset = mod(face - turn + 1, FACE_COUNT) - 1;
  return mod(turn + offset, count);
}

function HighlightSlide({ item, priority }: { item: HomeHighlight; priority?: boolean }) {
  return (
    // La face avant du prisme est rapprochée (≈ ×1,2) : la carte est dimensionnée en conséquence.
    <div className="flex h-full items-center justify-center">
      <article
        className={cn(
          "group relative flex min-h-[10.5rem] w-[83%] max-w-[24rem] overflow-hidden rounded-2xl lg:min-h-[12.25rem] lg:w-[82%] lg:max-w-[27.5rem] xl:w-[92%]",
          // Verre sombre : on voit le fond du hero à travers, aucun aplat blanc.
          "border border-white/15 bg-gradient-to-br from-white/[0.14] via-white/[0.06] to-principale/[0.12]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_50px_-18px_rgba(58,131,247,0.55)]",
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-principale/35 blur-3xl"
        />
        <div className="relative w-[54%] shrink-0 self-stretch overflow-hidden">
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 18rem, 50vw"
            className="object-contain object-center drop-shadow-[0_10px_18px_rgba(10,8,40,0.45)] transition-transform duration-300 ease-brand group-hover:scale-[1.07] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            priority={priority}
          />
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-4 lg:gap-1.5 lg:px-5 transition-transform duration-200 ease-brand group-hover:-translate-y-1 sm:px-4 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
          <h3 className="font-display text-sm font-bold tracking-tight text-white transition-colors duration-200 ease-brand group-hover:text-amber-100 sm:text-base lg:text-lg motion-reduce:transition-none">
            {item.title}
          </h3>
          <p className="text-left text-xs leading-relaxed text-white/70 sm:text-sm lg:text-[0.95rem]">{item.text}</p>
        </div>
      </article>
    </div>
  );
}

function SlideContent({ slide, priority }: { slide: HeroSlide; priority?: boolean }) {
  if (slide.kind === "highlight") return <HighlightSlide item={slide.item} priority={priority} />;
  return (
    <Image
      src={slide.src}
      alt=""
      fill
      sizes="(min-width: 1024px) 30rem, 80vw"
      className="object-contain object-center"
      priority={priority}
    />
  );
}

export function HeroCarousel({
  slides = HERO_IMAGE_SLIDES,
  className,
}: {
  slides?: HeroSlide[];
  className?: string;
}) {
  const reduce = useSafeReducedMotion();
  const [turn, setTurn] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Mouvement réduit : les illustrations seules restent fixes ; avec des cartes, elles défilent en fondu.
  const animated = !reduce || slides.some((slide) => slide.kind === "highlight");

  useEffect(() => {
    if (!animated || hoverPaused || pageHidden) return;
    const timer = window.setInterval(() => {
      setTurn((current) => current + 1);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [animated, hoverPaused, pageHidden]);

  // Deux prismes superposés qui tournent ensemble : les illustrations en fondu « écran »
  // sur le fond du hero, les cartes sans fondu pour garder leurs vraies couleurs.
  const layers = (["image", "highlight"] as const).filter((kind) =>
    slides.some((slide) => slide.kind === kind),
  );

  function layerContent(slide: HeroSlide, kind: HeroSlide["kind"], priority: boolean) {
    return slide.kind === kind ? <SlideContent slide={slide} priority={priority} /> : null;
  }

  return (
    <div
      className={cn("relative mx-auto h-[15.5rem] w-full max-w-[30rem] xl:h-[16.75rem]", className)}
      aria-hidden
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      {layers.map((kind) => (
        <div key={kind} className={cn("absolute inset-0", kind === "image" && "mix-blend-screen")}>
          {reduce ? (
            <motion.div
              key={mod(turn, slides.length)}
              className="absolute inset-0"
              initial={turn === 0 ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {layerContent(slides[mod(turn, slides.length)], kind, turn === 0)}
            </motion.div>
          ) : (
            <div className="absolute inset-0 [perspective:1100px]">
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: -turn * FACE_ANGLE }}
                transition={{ type: "spring", duration: 0.78, bounce: 0 }}
              >
                {Array.from({ length: FACE_COUNT }, (_, face) => {
                  const index = slideIndexForFace(face, turn, slides.length);
                  return (
                    <div
                      key={face}
                      className="absolute inset-0 [backface-visibility:hidden]"
                      style={{
                        transform: `rotateY(${face * FACE_ANGLE}deg) translateZ(11.5rem)`,
                      }}
                    >
                      {layerContent(slides[index], kind, index === 0)}
                    </div>
                  );
                })}
              </motion.div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
