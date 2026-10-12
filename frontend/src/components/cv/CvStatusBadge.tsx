import { Badge } from "@/components/ui/badge";
import type { CvData, CvEditorStatus } from "@/lib/cvTypes";
import { cn } from "@/lib/utils";

export function resolveCvEditorStatus(cv: CvData): CvEditorStatus {
  return cv.editorStatus === "ready" ? "ready" : "draft";
}

export function CvStatusBadge({
  cv,
  className,
}: {
  cv: CvData;
  className?: string;
}) {
  const ready = resolveCvEditorStatus(cv) === "ready";

  return (
    <Badge
      variant={ready ? "success" : "warning"}
      className={cn(
        "rounded-full border-none px-2 py-0.5 text-[10px] font-semibold shadow-sm",
        ready ? "bg-succes/15 text-succes" : "bg-amber-100 text-amber-800",
        className,
      )}
    >
      {ready ? "Terminé" : "Brouillon"}
    </Badge>
  );
}
