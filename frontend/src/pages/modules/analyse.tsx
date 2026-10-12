import { Suspense } from "react";
import dynamic from "@/platform/dynamic";
import { BrandLoader } from "@/components/brand/BrandLoader";

const AnalyseView = dynamic(
  () => import("@/components/cv/AnalyseView").then((m) => m.AnalyseView),
  { loading: () => <BrandLoader fullPage size={72} label="Chargement de l'analyse" /> },
);

export default function AnalysePage() {
  return (
    <Suspense fallback={<BrandLoader fullPage size={72} label="Chargement de l'analyse" />}>
      <AnalyseView />
    </Suspense>
  );
}
