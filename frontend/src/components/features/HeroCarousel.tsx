import { useEffect, useState } from "react";
import Image from "@/platform/image";
import { motion } from "framer-motion";
import { useSafeReducedMotion } from "@/lib/motion";

const HERO_SLIDES = [
  "/images/caroussel 0.png",
  "/images/caroussel 1.png",
  "/images/caroussel 2.png",
] as const;

const SLIDE_COUNT = HERO_SLIDES.length;
const SLIDE_ANGLE = 360 / SLIDE_COUNT;

export function HeroCarousel() {
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

  useEffect(() => {
    if (reduce || hoverPaused || pageHidden) return;
    const timer = window.setInterval(() => {
      setTurn((current) => current + 1);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [hoverPaused, pageHidden, reduce]);

  return (
    <div
      className="relative mx-auto h-[15.5rem] w-full max-w-[30rem] mix-blend-screen xl:h-[16.75rem]"
      aria-hidden
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      {reduce ? (
        <Image
          src={HERO_SLIDES[0]}
          alt=""
          fill
          sizes="(min-width: 1024px) 30rem, 80vw"
          className="object-contain object-center"
          priority
        />
      ) : (
        <div className="absolute inset-0 [perspective:1100px]">
          <motion.div
            className="relative h-full w-full [transform-style:preserve-3d]"
            animate={{ rotateY: -turn * SLIDE_ANGLE }}
            transition={{ type: "spring", duration: 0.78, bounce: 0 }}
          >
            {HERO_SLIDES.map((src, i) => (
              <div
                key={src}
                className="absolute inset-0 [backface-visibility:hidden]"
                style={{
                  transform: `rotateY(${i * SLIDE_ANGLE}deg) translateZ(11.5rem)`,
                }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30rem, 80vw"
                  className="object-contain object-center"
                  priority={i === 0}
                />
              </div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
