import { useEffect, useState, type ComponentType } from "react";
import type { CvData } from "@/lib/cvTypes";
import {
  getLoadedCvTemplate,
  preloadCvTemplate,
  resolveCvTemplateId,
  type CvPaperProps,
} from "@/lib/cvTemplateLoaders";
import { cn } from "@/lib/utils";

export function CvPaper({ cv, className }: { cv: CvData; className?: string }) {
  const templateId = resolveCvTemplateId(cv.templateId);
  const [Renderer, setRenderer] = useState<ComponentType<CvPaperProps> | null>(
    () => getLoadedCvTemplate(templateId),
  );

  useEffect(() => {
    const cached = getLoadedCvTemplate(templateId);
    if (cached) {
      setRenderer(() => cached);
      return;
    }

    setRenderer(null);
    let cancelled = false;
    void preloadCvTemplate(templateId).then((component) => {
      if (!cancelled) setRenderer(() => component);
    });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  if (!Renderer) {
    return <div className={cn("bg-white", className)} aria-hidden />;
  }

  return (
    <div key={templateId} className="contents">
      <Renderer cv={cv} className={className} />
    </div>
  );
}
