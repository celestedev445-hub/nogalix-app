import { useEffect } from "react";
import { initializeAuth } from "@/lib/initializeAuth";
import { useAuthStore } from "@/store/authStore";
import { CbcProGiftNotice } from "@/components/auth/CbcProGiftNotice";
import { Toaster } from "@/components/ui/toaster";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { ConnectionGate } from "@/components/features/ConnectionGate";
import { ConsoleBrand } from "@/components/features/ConsoleBrand";
import { DeferredAssistantDock } from "@/components/features/DeferredAssistantDock";
import { SessionTimeout } from "@/components/features/SessionTimeout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHydrated } from "@/hooks/use-hydrated";
import { installDomReconcileGuard } from "@/lib/domReconcileGuard";

installDomReconcileGuard();

function ClientOverlayItems() {
  return (
    <>
      <ConnectionGate />
      <SessionTimeout />
      <ConsoleBrand />
      <RegisterServiceWorker />
      <DeferredAssistantDock />
      <Toaster />
      <CbcProGiftNotice />
    </>
  );
}

function ClientOverlays() {
  const ready = useHydrated();
  return <div id="nogalix-overlays">{ready ? <ClientOverlayItems /> : null}</div>;
}

export function ClientRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void Promise.resolve(useAuthStore.persist.rehydrate()).finally(() => {
      void initializeAuth();
    });
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      {children}
      <ClientOverlays />
    </TooltipProvider>
  );
}
