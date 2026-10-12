import dynamic from "@/platform/dynamic";
import { BrandLoader } from "@/components/brand/BrandLoader";

const CvEditorView = dynamic(
  () => import("@/components/cv/CvEditorView").then((m) => m.CvEditorView),
  { loading: () => <BrandLoader fullPage size={72} label="Chargement de votre CV" /> },
);

export default function CvEditorPage() {
  return <CvEditorView />;
}
