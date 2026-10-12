import { useRouter } from "@/platform/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBackTarget, getPreviousPath } from "@/lib/navigationHistory";
import { cn } from "@/lib/utils";

export function BackButton({
  fallbackHref = "/dashboard",
  label = "Retour",
  className,
  onNavigate,
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
  onNavigate?: (target: string) => void;
}) {
  const router = useRouter();

  function onClick() {
    const target = getBackTarget(fallbackHref);

    if (onNavigate) {
      onNavigate(target);
      return;
    }

    const previous = getPreviousPath();
    const current =
      typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "";

    if (previous && previous !== current) {
      router.push(previous);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={label || "Retour"}
      className={cn(
        "h-8 shrink-0 gap-1.5 rounded-xl px-2.5 text-navy/70 hover:bg-indigo-clair hover:text-principale",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label ? <span className="max-sm:sr-only">{label}</span> : null}
    </Button>
  );
}
