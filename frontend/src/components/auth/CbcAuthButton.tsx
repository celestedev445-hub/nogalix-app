import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { appConfig } from "@/lib/appConfig";

const CBC_FULL_NAME = "Contacts Business Center";

/**
 * « Se connecter avec CBC » : navigation complète vers le serveur, qui gère tout
 * l'aller-retour avec CBC puis revient sur `next` avec la session ouverte.
 */
export function CbcAuthButton({ next, disabled = false }: { next: string; disabled?: boolean }) {
  const href = `/api/auth/cbc/start?${new URLSearchParams({ suivant: next })}`;
  const shortName = appConfig.cbcName || "CBC";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant="outline"
          className="h-11 w-full rounded-xl border-gris bg-white text-navy shadow-none hover:bg-[#F8FAFC]"
        >
          <a
            href={href}
            aria-label={`Continuer avec ${CBC_FULL_NAME} (${shortName})`}
            aria-disabled={disabled || undefined}
            onClick={(event) => {
              if (disabled) event.preventDefault();
            }}
            className={disabled ? "pointer-events-none opacity-50" : undefined}
          >
            <img
              src="/images/partners/cbc-favicon.png"
              alt=""
              aria-hidden
              width={96}
              height={44}
              className="h-5 w-auto shrink-0"
            />
            Continuer avec {shortName}
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{CBC_FULL_NAME}</TooltipContent>
    </Tooltip>
  );
}
