import type { CvData } from "@/lib/cvTypes";
import { DocumentDownloadModal } from "@/components/cv/DocumentDownloadModal";

export function CvDownloadModal({
  open,
  onOpenChange,
  cv,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cv: CvData;
}) {
  return <DocumentDownloadModal variant="template" open={open} onOpenChange={onOpenChange} cv={cv} />;
}
