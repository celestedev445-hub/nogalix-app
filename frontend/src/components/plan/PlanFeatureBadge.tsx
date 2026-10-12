import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PlanTierLabel = "gratuit" | "essai-ia" | "pro" | "premium";

const LABELS: Record<PlanTierLabel, string> = {
  gratuit: "Gratuit",
  "essai-ia": "Essai IA",
  pro: "Pro",
  premium: "Premium",
};

const TONES: Record<PlanTierLabel, { backgroundColor: string }> = {
  gratuit: { backgroundColor: "#059669" },
  "essai-ia": { backgroundColor: "#3A83F7" },
  pro: { backgroundColor: "#4338CA" },
  premium: { backgroundColor: "#EA580C" },
};

const FILL_STYLE = {
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  backgroundImage: "none",
  backgroundClip: "padding-box",
  WebkitBackgroundClip: "padding-box",
} as const;

export function PlanFeatureBadge({
  plan,
  className,
  compact,
}: {
  plan: PlanTierLabel;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      data-plan={plan}
      className={cn("plan-feature-badge", compact && "plan-feature-badge--compact", className)}
      style={{ ...TONES[plan], ...FILL_STYLE }}
    >
      <span className="plan-feature-badge__dot" aria-hidden />
      <span className="plan-feature-badge__label" style={FILL_STYLE}>
        {LABELS[plan]}
      </span>
    </span>
  );
}

export function PlanPageHeading({
  children,
  plan,
  className,
  titleClassName,
}: {
  children: ReactNode;
  plan: PlanTierLabel;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      <h1 className={cn("min-w-0 font-display text-2xl font-bold title-logo sm:text-3xl", titleClassName)}>
        {children}
      </h1>
      <PlanFeatureBadge plan={plan} />
    </div>
  );
}
