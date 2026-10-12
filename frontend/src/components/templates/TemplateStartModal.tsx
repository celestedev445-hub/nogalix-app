import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CvTemplateThumb } from "@/components/templates/CvTemplateThumb";
import { previewCvForTemplate } from "@/lib/templatePreviews";
import { templatesCatalog } from "@/lib/templatesCatalog";

export function TemplateStartModal({
  open,
  templateId,
  saving,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  templateId: string | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const selected = templatesCatalog.find((item) => item.id === templateId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Utiliser ce modèle ?</DialogTitle>
          <DialogDescription>
            {selected
              ? `${selected.name} sera utilisé pour votre nouveau CV.`
              : "Confirmez pour créer un CV avec le modèle sélectionné."}
          </DialogDescription>
        </DialogHeader>
        {templateId ? (
          <div className="overflow-hidden rounded-xl bg-[#F8FAFC] p-3">
            <CvTemplateThumb cv={previewCvForTemplate(templateId)} />
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={saving || !templateId}
            aria-busy={saving}
            onClick={onConfirm}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {saving ? "Création…" : "Utiliser ce modèle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
