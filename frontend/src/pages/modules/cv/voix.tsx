import { CvVoiceRedirect } from "@/components/cv/CvVoiceRedirect";
import { useParams } from "@/platform/navigation";

export default function CvVoicePage() {
  const { id } = useParams<{ id: string }>();
  return <CvVoiceRedirect cvId={id} />;
}
