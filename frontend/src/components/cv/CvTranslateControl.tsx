import { useMemo, useState } from "react";
import { ChevronsUpDown, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { applyTranslatedPayload, cvPayloadForTranslation, hasTranslatableContent } from "@/lib/applyCvTranslation";
import { cvLanguages, type CvLanguage } from "@/lib/phoneCountries";
import type { CvData } from "@/lib/cvTypes";
import { cn } from "@/lib/utils";
import { translateCv } from "@/services/cv";
import { PlanFeatureBadge } from "@/components/plan/PlanFeatureBadge";
import { useAuthStore } from "@/store/authStore";
import { aiTrialsHint, canUseAi, syncPlanCapabilities } from "@/lib/planCapabilities";
import { useRouter } from "@/platform/navigation";

export function CvTranslateControl({
  cv,
  disabled,
  onTranslated,
}: {
  cv: CvData;
  disabled?: boolean;
  onTranslated: (next: CvData) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<CvLanguage | null>(null);
  const [translating, setTranslating] = useState(false);
  const languages = useMemo(() => cvLanguages, []);

  function onSelectLanguage(language: CvLanguage) {
    if (!canUseAi(user)) {
      toast({
        title: "Quota IA atteint",
        description: aiTrialsHint(user) || "Passez à un plan supérieur pour traduire.",
        variant: "destructive",
      });
      router.push("/plans");
      return;
    }
    setOpen(false);
    if (!hasTranslatableContent(cv)) {
      toast({
        title: "Rien à traduire",
        description: "Remplissez d’abord le contenu du CV, ou appliquez un modèle.",
        variant: "destructive",
      });
      return;
    }
    setPending(language);
  }

  async function confirmTranslation() {
    if (!pending || translating) return;
    setTranslating(true);
    try {
      const result = await translateCv({
        languageCode: pending.code,
        languageName: pending.name,
        cv: cvPayloadForTranslation(cv),
      });
      onTranslated(applyTranslatedPayload(cv, result.payload));
      void syncPlanCapabilities();
      toast({
        title: "CV traduit",
        description: `Le contenu a été traduit en ${pending.name}.`,
        variant: "success",
      });
      setPending(null);
    } catch (error) {
      toast({
        title: "Traduction impossible",
        description:
          error instanceof Error ? error.message : "L’IA n’a pas pu traduire le CV. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setTranslating(false);
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || translating}
            className="rounded-xl border-gris bg-[#F8FAFC] shadow-none"
          >
            {translating ? <Loader2 className="animate-spin" /> : <Languages />}
            Traduire
            <PlanFeatureBadge plan="essai-ia" compact />
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[280px] p-0">
          <Command>
            <CommandInput placeholder="Rechercher une langue…" />
            <CommandList>
              <CommandEmpty>Aucune langue trouvée.</CommandEmpty>
              <CommandGroup heading="Langues">
                {languages.map((language) => (
                  <CommandItem
                    key={language.code}
                    value={`${language.name} ${language.code}`}
                    onSelect={() => onSelectLanguage(language)}
                  >
                    <span className="min-w-0 flex-1 truncate capitalize">{language.name}</span>
                    <span className="shrink-0 text-[11px] uppercase text-navy/45">{language.code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog
        open={Boolean(pending)}
        onOpenChange={(next) => {
          if (translating) return;
          if (!next) setPending(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-navy">
              Traduire le CV ?
            </DialogTitle>
            <DialogDescription className="text-sm text-navy/60">
              {pending
                ? `Tout le contenu éditable sera traduit en ${pending.name}, de façon cohérente (même vocabulaire, même ton). Les noms, e-mails, téléphones et liens restent inchangés.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              disabled={translating}
              onClick={() => setPending(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className={cn("rounded-xl")}
              disabled={translating}
              onClick={() => void confirmTranslation()}
            >
              {translating ? <Loader2 className="animate-spin" /> : <Languages />}
              {translating ? "Traduction…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
