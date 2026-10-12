import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/appConfig";

/**
 * « Se connecter avec CBC » : navigation complète vers le serveur, qui gère tout
 * l'aller-retour avec CBC puis revient sur `next` avec la session ouverte.
 */
export function CbcAuthButton({ next, disabled = false }: { next: string; disabled?: boolean }) {
  const href = `/api/auth/cbc/start?${new URLSearchParams({ suivant: next })}`;
  const label = `Continuer avec ${appConfig.cbcName || "CBC"}`;

  return (
    <Button
      asChild
      variant="outline"
      className="h-11 w-full rounded-xl border-gris bg-white text-navy shadow-none hover:bg-[#F8FAFC]"
    >
      <a
        href={href}
        aria-disabled={disabled || undefined}
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
        className={disabled ? "pointer-events-none opacity-50" : undefined}
      >
        <span
          aria-hidden
          className="flex h-5 min-w-5 items-center justify-center rounded bg-navy px-1 text-[10px] font-bold leading-none text-white"
        >
          CBC
        </span>
        {label}
      </a>
    </Button>
  );
}
