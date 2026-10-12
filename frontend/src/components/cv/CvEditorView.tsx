import { useParams } from "@/platform/navigation";
import { CvWorkspace } from "@/components/cv/CvWorkspace";

export function CvEditorView() {
  const params = useParams<{ id: string }>();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <CvWorkspace cvId={params.id} />
    </div>
  );
}
