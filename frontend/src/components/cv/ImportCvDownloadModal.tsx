import type { CvData } from "@/lib/cvTypes";
import { DocumentDownloadModal } from "@/components/cv/DocumentDownloadModal";

export function ImportCvDownloadModal({
  open,
  onOpenChange,
  cv,
  captureRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cv: CvData;
  captureRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <DocumentDownloadModal
      variant="imported"
      open={open}
      onOpenChange={onOpenChange}
      cv={cv}
      captureRef={captureRef}
    />
  );
}
