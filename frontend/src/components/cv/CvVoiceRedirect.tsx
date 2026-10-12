import { useEffect } from "react";
import { useRouter } from "@/platform/navigation";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { useInterfaceStore } from "@/store/interfaceStore";

export function CvVoiceRedirect({ cvId }: { cvId: string }) {
  const router = useRouter();

  useEffect(() => {
    useInterfaceStore.getState().activateCvVoice(cvId);
    router.replace(`/cv/${cvId}`);
  }, [cvId, router]);

  return <BrandLoader fullPage size={72} label="Ouverture de l'édition vocale" />;
}
