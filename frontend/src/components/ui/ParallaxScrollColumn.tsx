import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSafeReducedMotion } from "@/lib/motion";

type ParallaxTone = "nav" | "form" | "preview";

type ParallaxScrollColumnProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Amplitude du décalage (0.04 à 0.16). Chaque colonne a la sienne. */
  depth?: number;
  tone?: ParallaxTone;
  /** Décale aussi le contenu (aperçu CV). Jamais sur un formulaire. */
  shiftContent?: boolean;
};

const TONE_WASH: Record<ParallaxTone, string> = {
  nav: "from-indigo-clair/55 via-transparent to-transparent",
  form: "from-[#F8FAFC] via-transparent to-indigo-clair/25",
  preview: "from-indigo-clair/35 via-transparent to-principale/10",
};

export function ParallaxScrollColumn({
  children,
  className,
  contentClassName,
  depth = 0.08,
  tone = "form",
  shiftContent = false,
}: ParallaxScrollColumnProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const reduce = useSafeReducedMotion();
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || reduce) return;
    let frame = 0;
    const update = () => {
      setShift(Math.min(node.scrollTop * depth, 32));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", onScroll);
    };
  }, [depth, reduce]);

  return (
    <div className={cn("relative isolate min-h-0 overflow-hidden", className)}>
      {!reduce ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-0 h-[130%] bg-gradient-to-b will-change-transform",
            TONE_WASH[tone],
          )}
          style={{ transform: `translate3d(0, ${-shift}px, 0)` }}
        />
      ) : null}
      <div
        ref={scrollerRef}
          className="nogalix-scrollbar relative z-[1] h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]"
      >
        <div
          className={cn(contentClassName)}
          style={
            !reduce && shiftContent
              ? { transform: `translate3d(0, ${shift * 0.35}px, 0)` }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
