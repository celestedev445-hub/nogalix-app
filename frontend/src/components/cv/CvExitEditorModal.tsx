import { CheckCircle2, FilePenLine, Loader2, Undo2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CvExitAction } from "@/hooks/useCvEditorExitGuard";
import type { CvEntryOrigin } from "@/lib/cvEditorSession";
import { cn } from "@/lib/utils";

const defaultChoices: {
  id: CvExitAction;
  title: string;
  description: string;
  icon: typeof CheckCircle2;
  buttonClass: string;
}[] = [
  {
    id: "finalize",
    title: "Édition terminée",
    description: "Enregistre votre CV et retourne à Mes CV.",
    icon: CheckCircle2,
    buttonClass: "bg-principale text-white hover:bg-principale/90",
  },
  {
    id: "draft",
    title: "Enregistrer en brouillon",
    description: "Enregistre vos modifications en brouillon et retourne à Mes CV.",
    icon: FilePenLine,
    buttonClass: "bg-indigo-clair text-principale hover:bg-indigo-clair/80",
  },
  {
    id: "discard",
    title: "Quitter sans enregistrer",
    description: "Abandonne les changements de cette session et retourne à Mes CV.",
    icon: Undo2,
    buttonClass: "border-gris bg-white text-navy hover:bg-[#F8FAFC]",
  },
];

function choicesForOrigin(entryOrigin: CvEntryOrigin | null | undefined) {
  if (entryOrigin !== "analyse") return defaultChoices;

  return [
    {
      id: "finalize" as const,
      title: "Enregistrer le CV",
      description: "Sauvegarde votre CV puis retourne à l'analyse.",
      icon: CheckCircle2,
      buttonClass: "bg-principale text-white hover:bg-principale/90",
    },
    {
      id: "discard" as const,
      title: "Retourner à l'analyse",
      description: "Quitte sans enregistrer de brouillon. Les changements non sauvegardés seront perdus.",
      icon: Undo2,
      buttonClass: "border-gris bg-white text-navy hover:bg-[#F8FAFC]",
    },
  ];
}

export function CvExitEditorModal({
  open,
  acting,
  entryOrigin,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  acting: CvExitAction | null;
  entryOrigin?: CvEntryOrigin | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (action: CvExitAction) => void;
}) {
  const choices = choicesForOrigin(entryOrigin);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-gris p-0">
        <DialogHeader className="space-y-2 px-6 pt-6 text-left">
          <DialogTitle className="font-display text-xl font-bold text-navy">
            {entryOrigin === "analyse" ? "Quitter l'édition du CV ?" : "Quitter l'édition ?"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-navy/65">
            {entryOrigin === "analyse"
              ? "Choisissez si vous souhaitez enregistrer votre CV ou revenir à l'analyse sans créer de brouillon."
              : "Vous avez des modifications en cours. Choisissez comment les traiter avant de quitter l'éditeur."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 px-6 py-2">
          {choices.map((choice) => {
            const Icon = choice.icon;
            const pending = acting === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={Boolean(acting)}
                onClick={() => onConfirm(choice.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border border-gris p-4 text-left transition-colors",
                  "hover:border-principale/30 hover:bg-[#F8FAFC]",
                  acting && !pending && "opacity-60",
                )}
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-clair text-principale">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-navy">{choice.title}</span>
                  <span className="mt-0.5 block text-sm text-navy/60">{choice.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter className="border-t border-gris px-6 py-4 sm:justify-start">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-navy/70 hover:bg-indigo-clair hover:text-principale"
            disabled={Boolean(acting)}
            onClick={() => onOpenChange(false)}
          >
            Continuer l&apos;édition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
