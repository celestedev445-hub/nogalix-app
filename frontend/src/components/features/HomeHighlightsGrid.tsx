import type { ReactNode } from "react";
import Image from "@/platform/image";
import { motion } from "framer-motion";
import { homeHighlights } from "@/lib/homeHighlights";
import { motionEase, useSafeReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

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

export function HomeHighlightsGrid({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4",
        className,
      )}
    >
      {homeHighlights.map((item, index) => (
        <li key={item.title} className="min-w-0">
          <Reveal delay={index * 0.05} className="h-full">
            <article
              className={cn(
                "group flex h-full min-h-[9.5rem] overflow-hidden max-[400px]:flex-col md:min-h-[12rem]",
                "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
              )}
            >
              <div className="relative w-full shrink-0 self-stretch overflow-hidden max-[400px]:h-36 min-[400px]:w-[54%]">
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 640px) 28vw, 50vw"
                  className="object-contain object-center transition-transform duration-300 ease-brand group-hover:scale-[1.07] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-4 transition-transform duration-200 ease-brand group-hover:-translate-y-1 sm:px-4 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                <h3 className="font-display text-sm font-bold tracking-tight text-navy transition-colors duration-200 ease-brand group-hover:text-principale sm:text-base motion-reduce:transition-none">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-navy/65 sm:text-sm">{item.text}</p>
              </div>
            </article>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
