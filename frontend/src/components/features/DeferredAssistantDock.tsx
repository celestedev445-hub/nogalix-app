import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "@/platform/navigation";
import { useInterfaceStore } from "@/store/interfaceStore";

function shouldSkipAssistant(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function getAssistantHost() {
  const existing = document.getElementById("noga-assistant-root");
  if (existing) return existing;
  const host = document.createElement("div");
  host.id = "noga-assistant-root";
  document.body.appendChild(host);
  return host;
}

export function DeferredAssistantDock() {
  const pathname = usePathname() || "/";
  const cvVoiceCvId = useInterfaceStore((s) => s.cvVoiceCvId);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [Dock, setDock] = useState<ComponentType | null>(null);

  useEffect(() => {
    setHost(getAssistantHost());
  }, []);

  useEffect(() => {
    if (shouldSkipAssistant(pathname) || !host) {
      setDock(null);
      return;
    }

    let cancelled = false;
    const load = () => {
      void import("@/components/assistant/AssistantDock").then((mod) => {
        if (!cancelled) setDock(() => mod.AssistantDock);
      });
    };

    if (cvVoiceCvId) {
      load();
      return () => {
        cancelled = true;
      };
    }

    const id = window.setTimeout(load, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [pathname, cvVoiceCvId, host]);

  // Toujours `null` dans l'arbre de ClientRoot : le dock est porté hors du
  // contenu page, pour éviter insertBefore/removeChild après une recosiliation.
  if (!host || !Dock || shouldSkipAssistant(pathname)) return null;
  return createPortal(<Dock />, host);
}
