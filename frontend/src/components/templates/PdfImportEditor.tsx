import { useState } from "react";
import { FileText, Eye, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConvertedPdfEditor } from "@/components/templates/ConvertedPdfEditor";
import { cn } from "@/lib/utils";

function OriginalPdfPreview({ blobUrl, className }: { blobUrl: string; className?: string }) {
  return (
    <iframe
      src={blobUrl}
      title="CV importé"
      className={cn("block min-h-[842px] w-full border-0 bg-white", className)}
    />
  );
}

export function PdfImportEditor({
  cvId,
  file,
  blobUrl,
  className,
  onContentChange,
  onChooseTemplate,
}: {
  cvId: string;
  file: File;
  blobUrl: string;
  className?: string;
  onContentChange?: () => void;
  onChooseTemplate?: () => void;
}) {
  const [editing, setEditing] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-gris/70 bg-[#F8FAFC] px-4 py-2">
        <Button
          type="button"
          size="sm"
          variant={!editing ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => setEditing(false)}
        >
          <Eye className="h-4 w-4" />
          PDF original
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editing ? "default" : "outline"}
          className="rounded-xl"
          disabled={renderFailed}
          onClick={() => setEditing(true)}
        >
          <FileText className="h-4 w-4" />
          Éditer le contenu
        </Button>
        {onChooseTemplate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={onChooseTemplate}
          >
            <LayoutTemplate className="h-4 w-4" />
            Choisir un modèle
          </Button>
        ) : null}
        <p className="text-xs text-navy/55">
          {editing
            ? "Cliquez un texte pour l’éditer : Entrée va à la ligne, la saisie revient à la marge."
            : "Aperçu fidèle de votre fichier. Cliquez sur « Éditer le contenu » pour reconstruire un document éditable."}
        </p>
      </div>

      {hint ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">{hint}</p>
      ) : null}

      {!editing || renderFailed ? (
        <div className="mx-auto max-w-[920px]">
          <OriginalPdfPreview blobUrl={blobUrl} />
        </div>
      ) : (
        <div className="bg-[#ECEFF4] p-3">
          <ConvertedPdfEditor
            cvId={cvId}
            file={file}
            onContentChange={onContentChange}
            onError={(message) => {
              setHint(message);
              if (!/texte sélectionnable/i.test(message)) {
                setRenderFailed(true);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
