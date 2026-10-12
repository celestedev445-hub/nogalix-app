import { useState } from "react";
import { Keyboard, Loader2, Mic, Lock } from "lucide-react";
import { useRouter } from "@/platform/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCvStore } from "@/store/cvStore";
import { useInterfaceStore } from "@/store/interfaceStore";
import { canUseCapability } from "@/lib/planCapabilities";
import { PlanFeatureBadge } from "@/components/plan/PlanFeatureBadge";
import { toast } from "@/hooks/use-toast";

export function CvModeSwitch({ cvId, className }: { cvId: string; className?: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const flush = useCvStore((s) => s.flush);
  const cvVoiceCvId = useInterfaceStore((s) => s.cvVoiceCvId);
  const setAssistantOpen = useInterfaceStore((s) => s.setAssistantOpen);
  const activateCvVoice = useInterfaceStore((s) => s.activateCvVoice);
  const canVoice = canUseCapability(user, "assistant.voice");
  const [pending, setPending] = useState(false);
  const mode = cvVoiceCvId === cvId ? "voix" : "saisie";

  async function switchMode(target: "saisie" | "voix") {
    if (pending || mode === target) return;
    setPending(true);
    try {
      await flush(cvId);
    } catch (error) {
      toast({
        title: "Synchronisation partielle",
        description:
          error instanceof Error
            ? error.message
            : "Le changement de mode continue avec vos dernières modifications en mémoire.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
      if (target === "voix") {
        activateCvVoice(cvId);
      } else {
        setAssistantOpen(false);
      }
    }
  }

  const tabClass = (active: boolean) =>
    cn(
      "header-cta-mirror inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
      active ? "bg-indigo-clair text-principale shadow-sm" : "text-navy/60 hover:text-principale",
      pending && "pointer-events-none opacity-70",
    );

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-gris bg-[#F8FAFC] p-0.5",
        className,
      )}
      role="group"
      aria-label="Mode d'édition du CV"
    >
      <button
        type="button"
        disabled={pending}
        className={tabClass(mode === "saisie")}
        aria-current={mode === "saisie" ? "page" : undefined}
        onClick={() => void switchMode("saisie")}
      >
        {pending && mode !== "saisie" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Keyboard className="h-3.5 w-3.5" />
        )}
        Saisie
      </button>
      {canVoice ? (
        <button
          type="button"
          disabled={pending}
          className={tabClass(mode === "voix")}
          aria-current={mode === "voix" ? "page" : undefined}
          onClick={() => void switchMode("voix")}
        >
          {pending && mode !== "voix" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
          Voix
          <PlanFeatureBadge plan="essai-ia" compact />
        </button>
      ) : (
        <button
          type="button"
          className="header-cta-mirror inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-navy/45 sm:text-sm"
          onClick={() => {
            toast({
              title: "Édition vocale",
              description: "La voix consomme un essai IA. Inclus aussi dans Pro et Premium.",
            });
            router.push("/plans");
          }}
        >
          <Lock className="h-3.5 w-3.5" />
          Voix
          <PlanFeatureBadge plan="essai-ia" compact />
        </button>
      )}
    </div>
  );
}
