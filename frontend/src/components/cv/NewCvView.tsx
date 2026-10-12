import { useEffect } from "react";
import { useSearchParams } from "@/platform/navigation";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { BackButton } from "@/components/ui/BackButton";

export function NewCvView() {
  const params = useSearchParams();

  useEffect(() => {
    void import("@/components/cv/CvEditorView");
  }, []);

  return (
    <div className="relative space-y-6">
      <div className="flex flex-wrap items-start gap-2">
        <BackButton fallbackHref="/cv" className="mt-0.5" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold title-logo sm:text-3xl">Choisissez un modèle</h1>
          <p className="mt-1 text-sm text-navy/65">
            Sélectionnez la mise en page, puis confirmez pour l’utiliser.
          </p>
        </div>
      </div>

      <TemplateGallery
        confirmStart
        hideHeading
        initialTemplateId={params.get("modele")}
      />
    </div>
  );
}
