import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp, PencilLine, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ImageTextEditor } from "@/components/tools/image/ImageTextEditor";
import { ImageTextExtractor } from "@/components/tools/image/ImageTextExtractor";
import { cn } from "@/lib/utils";

const MAX_BYTES = 15 * 1024 * 1024;
/** Résolution de travail de l'éditeur (export à cette taille). */
const MAX_WORK_SIDE = 4096;
/** Image envoyée à l'IA : assez fine pour lire, assez légère pour partir vite. */
const MAX_ANALYSIS_SIDE = 2048;

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

type Loaded = {
  file: File;
  image: HTMLImageElement;
  width: number;
  height: number;
  analysisBlob: Blob;
  key: number;
};

type Tab = "edit" | "extract";

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = url;
  });
}

function toAnalysisBlob(img: HTMLImageElement, sourceType: string) {
  const ratio = Math.min(1, MAX_ANALYSIS_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");
  const jpeg = sourceType === "image/jpeg";
  if (jpeg) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Conversion impossible."))),
      jpeg ? "image/jpeg" : "image/png",
      0.92,
    ),
  );
}

export function ImageTextView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<Tab>("edit");
  const [visited, setVisited] = useState<Record<Tab, boolean>>({ edit: true, extract: false });

  const takeFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fichier non pris en charge", description: "Déposez une image (PNG, JPG, WebP…).", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Image trop lourde", description: "15 Mo maximum.", variant: "destructive" });
      return;
    }
    setPreparing(true);
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      const ratio = Math.min(1, MAX_WORK_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const analysisBlob = await toAnalysisBlob(img, file.type);
      setLoaded({
        file,
        image: img,
        width: Math.round(img.naturalWidth * ratio),
        height: Math.round(img.naturalHeight * ratio),
        analysisBlob,
        key: Date.now(),
      });
      setVisited({ edit: tab === "edit", extract: tab === "extract" });
    } catch (err) {
      toast({
        title: "Image illisible",
        description: err instanceof Error ? err.message : "Essayez un autre fichier.",
        variant: "destructive",
      });
    } finally {
      setPreparing(false);
    }
  }, [tab]);

  // Coller une image (Ctrl+V) n'importe où sur la page.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const item = [...(event.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) {
        event.preventDefault();
        void takeFile(new File([file], file.name || "image-collee.png", { type: file.type }));
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [takeFile]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  function switchTab(next: Tab) {
    setTab(next);
    setVisited((v) => ({ ...v, [next]: true }));
  }

  function clear() {
    setLoaded(null);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  const tabs: { id: Tab; label: string; hint: string; icon: typeof PencilLine }[] = [
    { id: "edit", label: "Modifier le texte", hint: "Remplacer, déplacer, effacer", icon: PencilLine },
    { id: "extract", label: "Extraire le texte", hint: "Mise en forme conservée", icon: ScanText },
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6">
      <div>
        <p className="text-sm font-medium text-principale">Outil gratuit · IA</p>
        <h1 className="mt-1 font-display text-2xl font-bold title-logo sm:text-3xl">Texte d&apos;une image</h1>
        <p className="mt-2 max-w-3xl text-sm text-navy/65">
          Modifiez le texte écrit sur une image (affiche, capture, visuel) en gardant le style, ou extrayez-le avec sa mise en
          forme : titres, gras, listes et tableaux, prêt à coller dans Word.
        </p>
      </div>

      <div className="flex rounded-xl bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:w-fit">
        {tabs.map((item) => {
          const Icon = item.icon;
          const activeTab = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTab(item.id)}
              aria-pressed={activeTab}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors sm:flex-none sm:px-4",
                activeTab ? "bg-indigo-clair text-principale" : "text-navy/65 hover:bg-indigo-clair/50",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{item.label}</span>
                <span className="block truncate text-[11px] font-normal text-navy/50">{item.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {loaded ? (
        <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3", cardShadow)}>
          <div className="flex min-w-0 items-center gap-3">
            <img src={loaded.image.src} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">{loaded.file.name}</p>
              <p className="text-xs text-navy/50">
                {loaded.image.naturalWidth} × {loaded.image.naturalHeight} px
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
              onClick={() => inputRef.current?.click()}
            >
              <ImageUp className="h-4 w-4" />
              Changer d&apos;image
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-9 rounded-xl text-navy/60" onClick={clear}>
              <X className="h-4 w-4" />
              Retirer
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void takeFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex h-[18rem] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gris bg-white px-4 text-center text-navy/55 transition-colors",
            cardShadow,
            dragging && "border-principale bg-indigo-clair/40",
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-clair text-principale">
            <ImageUp className="h-6 w-6" />
          </span>
          <span className="mt-3 font-semibold text-navy">{preparing ? "Préparation…" : "Déposez une image"}</span>
          <span className="text-xs">PNG, JPG ou WebP · 15 Mo max · ou collez-la avec Ctrl+V</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
        className="hidden"
        onChange={(e) => {
          void takeFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {loaded ? (
        <div key={loaded.key}>
          <div className={tab === "edit" ? "" : "hidden"}>
            {visited.edit ? (
              <ImageTextEditor
                image={loaded.image}
                width={loaded.width}
                height={loaded.height}
                analysisBlob={loaded.analysisBlob}
                fileName={loaded.file.name}
                active={tab === "edit"}
              />
            ) : null}
          </div>
          <div className={tab === "extract" ? "" : "hidden"}>
            {visited.extract ? (
              <ImageTextExtractor
                analysisBlob={loaded.analysisBlob}
                fileName={loaded.file.name}
                active={tab === "extract"}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="text-center text-[11px] text-navy/40">
        L&apos;image est envoyée à l&apos;IA uniquement pour lire le texte ; elle n&apos;est pas enregistrée sur nos serveurs.
      </p>
    </div>
  );
}
