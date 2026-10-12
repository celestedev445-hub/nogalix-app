import type { ReactNode } from "react";
import Link from "@/platform/link";
import {
  ArrowLeftRight,
  Briefcase,
  ImageUp,
  Languages,
  Pencil,
  ScanSearch,
  Target,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { productTools } from "@/lib/productTools";
import { motionEase, useSafeReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useHydrated } from "@/hooks/use-hydrated";

const ICONS: Record<string, LucideIcon> = {
  convert: ArrowLeftRight,
  import: Pencil,
  image: ImageUp,
  translate: Languages,
  candidature: Target,
  analyse: ScanSearch,
  emploi: Briefcase,
};

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

function toolHref(href: string, authenticated: boolean) {
  if (authenticated) return href;
  if (href === "/convertir" || href === "/editer" || href === "/image" || href === "/emploi") return href;
  return "/auth/signup";
}

function Reveal({
  children,
  delay = 0,
  enabled,
}: {
  children: ReactNode;
  delay?: number;
  enabled: boolean;
}) {
  if (!enabled) return children;
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.32, ease: motionEase, delay }}
    >
      {children}
    </motion.div>
  );
}

export function ProductToolsStrip({
  variant = "marketing",
}: {
  variant?: "marketing" | "compact";
}) {
  const mounted = useHydrated();
  const authenticated = useAuthStore((s) => s.authenticated) && mounted;
  const reduce = useSafeReducedMotion();
  const reveal = variant === "marketing" && !reduce;

  return (
    <ul
      className={cn(
        "grid min-w-0 gap-3",
        variant === "marketing"
          ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6 md:gap-4"
          : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
      )}
    >
      {productTools.map((tool, index) => {
        const Icon = ICONS[tool.id] ?? Pencil;
        const href = toolHref(tool.href, authenticated);
        return (
          <li key={tool.id} className="min-w-0">
            <Reveal delay={index * 0.04} enabled={reveal}>
              <Link
                href={href}
                className={cn(
                  "group flex h-full min-w-0 flex-col rounded-xl bg-white",
                  cardShadow,
                  "transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none",
                  variant === "marketing" ? "p-4 sm:p-5" : "p-3.5",
                )}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-clair text-principale">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold text-navy group-hover:text-principale">{tool.title}</p>
                <p
                  className={cn(
                    "mt-0.5 text-navy/65",
                    variant === "marketing" ? "text-sm leading-relaxed" : "text-xs leading-relaxed",
                  )}
                >
                  {tool.text}
                </p>
              </Link>
            </Reveal>
          </li>
        );
      })}
    </ul>
  );
}
