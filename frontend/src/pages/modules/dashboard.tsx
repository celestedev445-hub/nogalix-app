import dynamic from "@/platform/dynamic";
import { BrandLoader } from "@/components/brand/BrandLoader";

const DashboardView = dynamic(
  () => import("@/components/cv/DashboardView").then((m) => m.DashboardView),
  { loading: () => <BrandLoader fullPage size={72} label="Chargement de votre espace" /> },
);

export default function DashboardPage() {
  return <DashboardView />;
}
