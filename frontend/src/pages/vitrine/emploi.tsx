import dynamic from "@/platform/dynamic";
import { BrandLoader } from "@/components/brand/BrandLoader";

const EmploiView = dynamic(
  () => import("@/components/cv/EmploiView").then((m) => m.EmploiView),
  { loading: () => <BrandLoader fullPage size={72} label="Chargement des offres" /> },
);

export default function EmploiPage() {
  return <EmploiView />;
}
