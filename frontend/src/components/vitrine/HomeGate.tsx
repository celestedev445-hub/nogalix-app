import dynamic from "@/platform/dynamic";
import { useEffect } from "react";
import { useRouter } from "@/platform/navigation";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { useAuthStore } from "@/store/authStore";

const LandingView = dynamic(
  () => import("@/components/vitrine/LandingView").then((m) => m.LandingView),
  { loading: () => <BrandLoader fullPage size={72} label="Chargement de l'accueil" /> },
);

export function HomeGate() {
  const router = useRouter();
  const authenticated = useAuthStore((s) => s.authenticated);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && authenticated) {
      router.replace("/dashboard");
    }
  }, [authenticated, hydrated, router]);

  return <LandingView />;
}
