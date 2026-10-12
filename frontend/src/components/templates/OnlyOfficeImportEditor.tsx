import dynamic from "@/platform/dynamic";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ensureImportFile } from "@/lib/importPreviewStore";
import { fetchImportEditorConfig, uploadImportFile } from "@/services/importCv";
import { useCvStore } from "@/store/cvStore";
import { cn } from "@/lib/utils";

const LOAD_TIMEOUT_MS = 90_000;

const DocumentEditor = dynamic(
  () => import("@onlyoffice/document-editor-react").then((module) => module.DocumentEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[842px] items-center justify-center bg-white text-sm text-navy/45">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Ouverture de l&apos;éditeur Word…
      </div>
    ),
  },
);

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export function OnlyOfficeImportEditor({
  cvId,
  className,
  onReady,
  onContentChange,
  onUnavailable,
}: {
  cvId: string;
  className?: string;
  onReady?: () => void;
  onContentChange?: () => void;
  onUnavailable?: () => void;
}) {
  const [documentServerUrl, setDocumentServerUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Initialisation…");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      setStatus("Synchronisation du CV…");

      try {
        await withTimeout(
          useCvStore.getState().flush(cvId),
          15_000,
          "Synchronisation du CV trop longue.",
        );
        if (cancelled) return;

        setStatus("Envoi du fichier…");
        const localFile = await ensureImportFile(cvId);
        if (localFile) {
          await withTimeout(
            uploadImportFile(cvId, localFile),
            60_000,
            "Envoi du fichier trop long.",
          );
        }
        if (cancelled) return;

        setStatus("Connexion à OnlyOffice…");
        const response = await withTimeout(
          fetchImportEditorConfig(cvId),
          15_000,
          "OnlyOffice ne répond pas.",
        );
        if (cancelled) return;

        if (!response.enabled || !response.ready || !response.documentServerUrl || !response.config) {
          onUnavailable?.();
          throw new Error(
            response.enabled
              ? "Document pas encore disponible sur le serveur. Réimportez votre CV via /analyse."
              : "Éditeur Word avancé non configuré.",
          );
        }

        setStatus("Ouverture du document…");
        setDocumentServerUrl(response.documentServerUrl);
        setConfig(response.config);
        onReady?.();
      } catch (reason) {
        if (!cancelled) {
          onUnavailable?.();
          setError(reason instanceof Error ? reason.message : "Impossible de charger l'éditeur Word.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const watchdog = window.setTimeout(() => {
      if (!cancelled) {
        onUnavailable?.();
        setError("OnlyOffice met trop de temps à démarrer.");
        setLoading(false);
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
    };
  }, [cvId, onUnavailable]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex min-h-[842px] flex-col items-center justify-center gap-2 bg-white text-sm text-navy/45",
          className,
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        <p>{status}</p>
        <p className="text-xs text-navy/35">La conversion PDF → Word peut prendre 30–60 s la première fois.</p>
      </div>
    );
  }

  if ((error || !documentServerUrl || !config) && onUnavailable) {
    return null;
  }

  if (error || !documentServerUrl || !config) {
    return (
      <div
        className={cn(
          "flex min-h-[842px] items-center justify-center bg-white p-8 text-center text-sm text-navy/55",
          className,
        )}
      >
        {error ?? "Éditeur Word indisponible."}
      </div>
    );
  }

  return (
    <div className={cn("min-h-[842px] w-full bg-white", className)} style={{ height: "842px" }}>
      <DocumentEditor
        id={`onlyoffice-import-${cvId}`}
        documentServerUrl={documentServerUrl}
        config={config}
        events_onDocumentReady={() => onContentChange?.()}
        onLoadComponentError={(_code, description) => {
          onUnavailable?.();
          setError(description || "OnlyOffice n'a pas pu démarrer.");
        }}
      />
    </div>
  );
}
