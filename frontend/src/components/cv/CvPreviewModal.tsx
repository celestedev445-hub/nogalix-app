import { CvPaper } from "@/components/templates/CvPaper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CvData } from "@/lib/cvTypes";
import { IMPORT_ORIGINAL_TEMPLATE_ID } from "@/lib/importedCv";
import { fullName } from "@/components/templates/shared";

export function CvPreviewModal({
  open,
  onOpenChange,
  cv,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cv: CvData;
}) {
  const isImportedOriginal = cv.templateId === IMPORT_ORIGINAL_TEMPLATE_ID;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,900px)] max-w-[min(96vw,860px)] flex-col gap-0 overflow-hidden rounded-2xl border-gris p-0">
        <div className="border-b border-gris px-5 py-4">
          <DialogTitle className="font-display text-lg font-extrabold text-navy">
            {isImportedOriginal ? "Aperçu du fichier importé" : "Aperçu du CV"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-navy/60">
            {fullName(cv)} · {cv.title}
          </DialogDescription>
        </div>

        <div
          className={
            isImportedOriginal
              ? "min-h-0 flex-1 overflow-auto bg-white"
              : "min-h-0 flex-1 overflow-auto bg-[#E8EDF5] p-4 sm:p-6"
          }
        >
          <div className={isImportedOriginal ? "h-full w-full" : "mx-auto w-full max-w-[794px]"}>
            <CvPaper
              cv={cv}
              className={
                isImportedOriginal
                  ? "min-h-[842px]"
                  : "rounded-md shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
