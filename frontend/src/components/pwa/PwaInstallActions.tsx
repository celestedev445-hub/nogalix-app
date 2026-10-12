import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export function PwaInstallActions() {
  const { canInstall, install, installed } = usePwaInstall();
  if (installed || !canInstall) return null;
  return (
    <Button variant="outline" size="sm" onClick={() => void install()}>
      <Download />
      Installer l&apos;application
    </Button>
  );
}
