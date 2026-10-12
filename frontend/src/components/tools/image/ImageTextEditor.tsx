import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  Italic,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ScanText,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  FONT_LABELS,
  eraseKey,
  isDirty,
  layerFromLine,
  newLayer,
  renderComposite,
  renderErasedBase,
  resetLayer,
  type TextLayer,
} from "@/lib/imageTextRender";
import { readImageLayout, type ImageFontFamily, type ImageTextAlign } from "@/services/imageText";
import { uploadDocument } from "@/services/documents";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type SaveFormat = "png" | "jpg" | "webp" | "pdf";
type SaveTarget = "device" | "documents";

const SAVE_FORMATS: { id: SaveFormat; label: string; hint: string; mime: string }[] = [
  { id: "png", label: "PNG", hint: "Qualité maximale, sans perte", mime: "image/png" },
  { id: "jpg", label: "JPG", hint: "Plus léger, idéal pour partager", mime: "image/jpeg" },
  { id: "webp", label: "WebP", hint: "Très léger, pour le web", mime: "image/webp" },
  { id: "pdf", label: "PDF", hint: "Document à imprimer ou envoyer", mime: "application/pdf" },
];
const FORMAT_KEY = "nogalix:image-save-format";

function readStoredFormat(): SaveFormat {
  try {
    const value = window.localStorage.getItem(FORMAT_KEY);
    if (value && SAVE_FORMATS.some((f) => f.id === value)) return value as SaveFormat;
  } catch {
    /* stockage indisponible */
  }
  return "png";
}

function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality = 0.92) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export impossible."))), mime, quality),
  );
}

/** Image finale dans le format choisi (fond blanc pour les formats sans transparence). */
async function exportImage(source: HTMLCanvasElement, format: SaveFormat): Promise<Blob> {
  if (format === "png") return canvasBlob(source, "image/png");
  const flat = document.createElement("canvas");
  flat.width = source.width;
  flat.height = source.height;
  const ctx = flat.getContext("2d");
  if (!ctx) throw new Error("Export impossible.");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(source, 0, 0);
  if (format === "jpg") return canvasBlob(flat, "image/jpeg", 0.95);
  if (format === "webp") return canvasBlob(flat, "image/webp", 0.92);
  const { jsPDF } = await import("jspdf");
  const { width, height } = flat;
  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
    compress: true,
  });
  pdf.addImage(flat.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, width, height);
  return pdf.output("blob");
}

type Drag = {
  id: string;
  kind: "move" | "resize";
  startX: number;
  startY: number;
  rect: DOMRect;
  origin: Pick<TextLayer, "x" | "y" | "w" | "h">;
};

export function ImageTextEditor({
  image,
  width,
  height,
  analysisBlob,
  fileName,
  active,
}: {
  image: HTMLImageElement;
  width: number;
  height: number;
  analysisBlob: Blob;
  fileName: string;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const historyRef = useRef<TextLayer[][]>([]);
  const lastPushRef = useRef(0);
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [showBoxes, setShowBoxes] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [historySize, setHistorySize] = useState(0);
  const authenticated = useAuthStore((s) => s.authenticated);
  const [saveFormat, setSaveFormat] = useState<SaveFormat>("png");
  const [saveTarget, setSaveTarget] = useState<SaveTarget>("device");
  const [saving, setSaving] = useState(false);

  useEffect(() => setSaveFormat(readStoredFormat()), []);

  function chooseFormat(format: SaveFormat) {
    setSaveFormat(format);
    try {
      window.localStorage.setItem(FORMAT_KEY, format);
    } catch {
      /* stockage indisponible */
    }
  }

  const selected = layers.find((l) => l.id === selectedId) ?? null;
  const changedCount = layers.filter(isDirty).length;

  const analyze = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const lines = await readImageLayout(analysisBlob);
      setLayers(lines.map(layerFromLine));
      historyRef.current = [];
      setHistorySize(0);
      setSelectedId(null);
      setStatus("ready");
      if (lines.length === 0) {
        toast({ title: "Aucun texte détecté", description: "Vous pouvez tout de même ajouter du texte." });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyse impossible.");
      setStatus("error");
    }
  }, [analysisBlob]);

  useEffect(() => {
    if (active && status === "idle") void analyze();
  }, [active, status, analyze]);

  /* Historique : un instantané par série de modifications rapprochées. */
  const pushHistory = useCallback((snapshot: TextLayer[], force = false) => {
    const now = Date.now();
    if (!force && now - lastPushRef.current < 800) return;
    lastPushRef.current = now;
    historyRef.current = [...historyRef.current.slice(-49), snapshot];
    setHistorySize(historyRef.current.length);
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<TextLayer>, options?: { force?: boolean }) => {
      setLayers((current) => {
        pushHistory(current, options?.force);
        return current.map((l) => (l.id === id ? { ...l, ...patch } : l));
      });
    },
    [pushHistory],
  );

  function undo() {
    const previous = historyRef.current.pop();
    setHistorySize(historyRef.current.length);
    if (previous) setLayers(previous);
  }

  function addLayer() {
    const layer = newLayer();
    setLayers((current) => {
      pushHistory(current, true);
      return [...current, layer];
    });
    setSelectedId(layer.id);
    window.setTimeout(() => textRef.current?.select(), 30);
  }

  function removeLayer(layer: TextLayer) {
    if (layer.source) {
      update(layer.id, { removed: true }, { force: true });
    } else {
      setLayers((current) => {
        pushHistory(current, true);
        return current.filter((l) => l.id !== layer.id);
      });
      setSelectedId(null);
    }
  }

  function resetAll() {
    setLayers((current) => {
      pushHistory(current, true);
      return current.filter((l) => l.source).map(resetLayer);
    });
    setSelectedId(null);
  }

  /* Rendu : fond effacé mis en cache, texte redessiné à chaque modification. */
  const key = eraseKey(layers);
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const base = useMemo(
    () => (typeof document === "undefined" ? null : renderErasedBase(image, width, height, layersRef.current)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [image, width, height, key],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !base) return;
    const frame = requestAnimationFrame(() => {
      if (comparing) {
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
      } else {
        renderComposite(canvas, base, layers);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [base, layers, comparing, image, width, height]);

  /* Glisser / redimensionner les cadres. */
  function startDrag(event: ReactPointerEvent, layer: TextLayer, kind: Drag["kind"]) {
    if (!stageRef.current) return;
    event.stopPropagation();
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setSelectedId(layer.id);
    pushHistory(layers, true);
    dragRef.current = {
      id: layer.id,
      kind,
      startX: event.clientX,
      startY: event.clientY,
      rect: stageRef.current.getBoundingClientRect(),
      origin: { x: layer.x, y: layer.y, w: layer.w, h: layer.h },
    };
  }

  function onDragMove(event: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.rect.width;
    const dy = (event.clientY - drag.startY) / drag.rect.height;
    const o = drag.origin;
    const patch =
      drag.kind === "move"
        ? { x: clamp01(Math.min(o.x + dx, 1 - o.w)), y: clamp01(Math.min(o.y + dy, 1 - o.h)) }
        : { w: Math.max(0.02, Math.min(o.w + dx, 1 - o.x)), h: Math.max(0.01, Math.min(o.h + dy, 1 - o.y)) };
    setLayers((current) => current.map((l) => (l.id === drag.id ? { ...l, ...patch } : l)));
  }

  function endDrag() {
    dragRef.current = null;
  }

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      const typing = (event.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !typing) {
        event.preventDefault();
        undo();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && !typing && selected) {
        event.preventDefault();
        removeLayer(selected);
      }
      if (event.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function save() {
    if (!base || saving) return;
    setSaving(true);
    const format = SAVE_FORMATS.find((f) => f.id === saveFormat) ?? SAVE_FORMATS[0];
    const stem = fileName.replace(/\.[^.]+$/, "") || "image";
    const name = `${stem}-modifie.${format.id}`;
    try {
      const canvas = document.createElement("canvas");
      renderComposite(canvas, base, layers);
      const blob = await exportImage(canvas, format.id);
      if (saveTarget === "documents" && authenticated) {
        await uploadDocument(new File([blob], name, { type: format.mime }), {
          kind: "export",
          title: `Image modifiée · ${stem}`,
        });
        toast({ title: "Enregistrée dans Mes documents", description: name, variant: "success" });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast({ title: "Image sauvegardée", description: name, variant: "success" });
      }
    } catch (err) {
      toast({
        title: "Sauvegarde impossible",
        description: err instanceof Error ? err.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // Ctrl+S : sauvegarde dans le format choisi.
  useEffect(() => {
    if (!active) return;
    function onSaveKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onSaveKey);
    return () => window.removeEventListener("keydown", onSaveKey);
  });

  const visibleLayers = layers.filter((l) => !l.removed);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className={cn("min-w-0 rounded-xl bg-white p-3 sm:p-4", cardShadow)}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" className="h-9 rounded-xl" onClick={addLayer} disabled={status === "loading"}>
            <Plus className="h-4 w-4" />
            Ajouter un texte
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
            onClick={undo}
            disabled={historySize === 0}
          >
            <Undo2 className="h-4 w-4" />
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
            onPointerDown={() => setComparing(true)}
            onPointerUp={() => setComparing(false)}
            onPointerLeave={() => setComparing(false)}
            disabled={changedCount === 0}
            title="Maintenir pour voir l'original"
          >
            <Eye className="h-4 w-4" />
            Original
          </Button>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-navy/60">
            <input
              type="checkbox"
              className="accent-principale"
              checked={showBoxes}
              onChange={(e) => setShowBoxes(e.target.checked)}
            />
            Cadres
          </label>
        </div>

        <div className="relative flex min-h-[16rem] items-center justify-center overflow-hidden rounded-lg bg-[#ECEFF4] p-2">
          <div
            ref={stageRef}
            className="relative w-fit max-w-full touch-none select-none"
            onPointerDown={() => setSelectedId(null)}
            onPointerMove={onDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <canvas ref={canvasRef} className="block h-auto max-h-[72vh] max-w-full" aria-label="Aperçu de l'image modifiée" />
            {!comparing && status === "ready"
              ? visibleLayers.map((layer) => {
                  const isSelected = layer.id === selectedId;
                  return (
                    <div
                      key={layer.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Texte : ${layer.text}`}
                      onPointerDown={(e) => startDrag(e, layer, "move")}
                      onDoubleClick={() => textRef.current?.focus()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setSelectedId(layer.id);
                          window.setTimeout(() => textRef.current?.focus(), 0);
                        }
                      }}
                      className={cn(
                        "absolute cursor-move rounded-[3px] outline-none transition-colors",
                        isSelected
                          ? "ring-2 ring-principale ring-offset-1"
                          : showBoxes
                            ? isDirty(layer)
                              ? "ring-1 ring-succes/80 hover:ring-2"
                              : "ring-1 ring-principale/50 hover:bg-principale/10 hover:ring-2"
                            : "hover:ring-1 hover:ring-principale/60",
                      )}
                      style={{
                        left: `${layer.x * 100}%`,
                        top: `${layer.y * 100}%`,
                        width: `${layer.w * 100}%`,
                        height: `${layer.h * 100}%`,
                        transform: layer.angle ? `rotate(${layer.angle}deg)` : undefined,
                      }}
                    >
                      {isSelected ? (
                        <span
                          onPointerDown={(e) => startDrag(e, layer, "resize")}
                          className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border-2 border-white bg-principale shadow"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  );
                })
              : null}
          </div>

          {status === "loading" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 text-sm font-medium text-navy backdrop-blur-[2px]">
              <ScanText className="h-7 w-7 animate-pulse text-principale" />
              Lecture du texte de l&apos;image…
              <span className="text-xs font-normal text-navy/50">Environ 10 à 40 secondes</span>
            </div>
          ) : null}
        </div>

        {status === "error" ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>{error}</span>
            <Button type="button" size="sm" variant="secondary" className="h-8 rounded-lg" onClick={() => void analyze()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Réessayer
            </Button>
          </div>
        ) : null}

        {status === "ready" ? (
          <p className="mt-3 text-xs text-navy/50">
            {layers.filter((l) => l.source).length} ligne(s) détectée(s) · {changedCount} modifiée(s). Cliquez un cadre, glissez
            pour le déplacer.
          </p>
        ) : null}

        <div className="mt-4 rounded-xl border border-gris bg-[#F8FAFC] p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-3 sm:flex sm:flex-wrap sm:items-end sm:gap-5 sm:space-y-0">
              <div className="min-w-0">
                <p id="save-format-label" className="mb-1.5 text-xs font-semibold text-navy/60">
                  Format
                </p>
                <div role="radiogroup" aria-labelledby="save-format-label" className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gris">
                  {SAVE_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={saveFormat === f.id}
                      title={f.hint}
                      onClick={() => chooseFormat(f.id)}
                      className={cn(
                        "min-w-[3.5rem] flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                        saveFormat === f.id ? "bg-principale text-white shadow-sm" : "text-navy/60 hover:bg-indigo-clair",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {authenticated ? (
                <div className="min-w-0">
                  <p id="save-target-label" className="mb-1.5 text-xs font-semibold text-navy/60">
                    Où
                  </p>
                  <div role="radiogroup" aria-labelledby="save-target-label" className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gris">
                    {(
                      [
                        { id: "device", label: "Mon appareil" },
                        { id: "documents", label: "Mes documents" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={saveTarget === t.id}
                        onClick={() => setSaveTarget(t.id)}
                        className={cn(
                          "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                          saveTarget === t.id ? "bg-principale text-white shadow-sm" : "text-navy/60 hover:bg-indigo-clair",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              className="h-11 w-full rounded-xl px-6 lg:w-auto"
              onClick={() => void save()}
              disabled={!base || saving || status === "loading"}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder en {SAVE_FORMATS.find((f) => f.id === saveFormat)?.label}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-navy/45">
            {SAVE_FORMATS.find((f) => f.id === saveFormat)?.hint} · {width} × {height} px
            {authenticated && saveTarget === "documents" ? " · rangé dans Mes documents" : " · téléchargé sur votre appareil"}
            <span className="hidden sm:inline"> · Ctrl+S</span>
          </p>
        </div>
      </div>

      <aside className={cn("min-w-0 rounded-xl bg-white p-4", cardShadow)}>
        {selected ? (
          <LayerPanel
            layer={selected}
            textRef={textRef}
            onChange={(patch, force) => update(selected.id, patch, { force })}
            onReset={() => update(selected.id, resetLayer(selected), { force: true })}
            onRemove={() => removeLayer(selected)}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-navy">Textes de l&apos;image</h2>
              {changedCount > 0 ? (
                <button type="button" onClick={resetAll} className="text-xs font-medium text-principale hover:underline">
                  Tout rétablir
                </button>
              ) : null}
            </div>
            {status === "loading" ? (
              <div className="flex items-center gap-2 py-6 text-sm text-navy/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours…
              </div>
            ) : layers.length === 0 ? (
              <p className="py-4 text-sm text-navy/50">
                {status === "ready" ? "Aucun texte détecté. Ajoutez-en un avec le bouton ci-contre." : "—"}
              </p>
            ) : (
              <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {layers.map((layer) => (
                  <li key={layer.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-gris px-2 py-1.5",
                        layer.removed && "opacity-50",
                        isDirty(layer) && !layer.removed && "border-succes/50 bg-succes/5",
                      )}
                    >
                      <input
                        value={layer.text}
                        disabled={layer.removed}
                        onChange={(e) => update(layer.id, { text: e.target.value })}
                        onFocus={() => pushHistory(layers, true)}
                        className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none"
                        aria-label="Texte"
                      />
                      {layer.removed ? (
                        <button
                          type="button"
                          onClick={() => update(layer.id, { removed: false }, { force: true })}
                          className="shrink-0 text-[11px] font-medium text-principale"
                        >
                          Rétablir
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedId(layer.id)}
                          className="shrink-0 text-[11px] font-medium text-principale"
                        >
                          Style
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] leading-relaxed text-navy/45">
              Le texte d&apos;origine est effacé et le fond reconstruit autour. Sur un fond uni le résultat est net ; sur
              une photo très texturée, une légère trace peut rester.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function LayerPanel({
  layer,
  textRef,
  onChange,
  onReset,
  onRemove,
  onClose,
}: {
  layer: TextLayer;
  textRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (patch: Partial<TextLayer>, force?: boolean) => void;
  onReset: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const toggle = "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors";
  const on = "border-principale bg-indigo-clair text-principale";
  const off = "border-gris text-navy/60 hover:bg-indigo-clair/50";
  const aligns: { id: ImageTextAlign; icon: typeof AlignLeft; label: string }[] = [
    { id: "left", icon: AlignLeft, label: "Aligner à gauche" },
    { id: "center", icon: AlignCenter, label: "Centrer" },
    { id: "right", icon: AlignRight, label: "Aligner à droite" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-navy">{layer.source ? "Texte détecté" : "Nouveau texte"}</h2>
        <button type="button" onClick={onClose} className="text-xs font-medium text-principale hover:underline">
          Tous les textes
        </button>
      </div>

      {layer.removed ? (
        <div className="rounded-lg bg-indigo-clair/60 p-3 text-sm text-navy/70">
          Ce texte est effacé de l&apos;image.
          <Button type="button" size="sm" className="mt-2 h-8 w-full rounded-lg" onClick={() => onChange({ removed: false }, true)}>
            Le remettre
          </Button>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-navy/60">Texte</span>
            <textarea
              ref={textRef}
              value={layer.text}
              rows={2}
              onChange={(e) => onChange({ text: e.target.value.replace(/\n/g, " ") })}
              className="w-full resize-none rounded-lg border border-gris px-3 py-2 text-sm text-navy outline-none focus:border-principale focus:ring-2 focus:ring-principale/20"
            />
          </label>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-navy/60">Police</span>
              <select
                value={layer.font}
                onChange={(e) => onChange({ font: e.target.value as ImageFontFamily }, true)}
                className="h-9 w-full rounded-lg border border-gris bg-white px-2 text-sm text-navy outline-none focus:border-principale"
              >
                {(Object.keys(FONT_LABELS) as ImageFontFamily[]).map((font) => (
                  <option key={font} value={font}>
                    {FONT_LABELS[font]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-navy/60">Couleur</span>
              <input
                type="color"
                value={layer.color}
                onChange={(e) => onChange({ color: e.target.value.toUpperCase() })}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gris bg-white p-1"
                aria-label="Couleur du texte"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className={cn(toggle, layer.bold ? on : off)}
              onClick={() => onChange({ bold: !layer.bold }, true)}
              aria-pressed={layer.bold}
              aria-label="Gras"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(toggle, layer.italic ? on : off)}
              onClick={() => onChange({ italic: !layer.italic }, true)}
              aria-pressed={layer.italic}
              aria-label="Italique"
            >
              <Italic className="h-4 w-4" />
            </button>
            <span className="mx-1 h-6 w-px bg-gris" aria-hidden />
            {aligns.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  className={cn(toggle, layer.align === a.id ? on : off)}
                  onClick={() => onChange({ align: a.id }, true)}
                  aria-pressed={layer.align === a.id}
                  aria-label={a.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-medium text-navy/60">
              Taille <span className="tabular-nums">{Math.round(layer.scale * 100)} %</span>
            </span>
            <input
              type="range"
              min={40}
              max={250}
              step={5}
              value={Math.round(layer.scale * 100)}
              onChange={(e) => onChange({ scale: Number(e.target.value) / 100 })}
              className="w-full accent-principale"
            />
          </label>

          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-medium text-navy/60">
              Rotation <span className="tabular-nums">{layer.angle}°</span>
            </span>
            <input
              type="range"
              min={-45}
              max={45}
              step={0.5}
              value={layer.angle}
              onChange={(e) => onChange({ angle: Number(e.target.value) })}
              className="w-full accent-principale"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-navy/70">
            <input
              type="checkbox"
              className="accent-principale"
              checked={layer.fit}
              onChange={(e) => onChange({ fit: e.target.checked }, true)}
            />
            Réduire si le texte dépasse le cadre
          </label>
        </>
      )}

      <div className="flex gap-2 border-t border-gris pt-3">
        {layer.source ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 flex-1 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
            onClick={onReset}
            disabled={!isDirty(layer)}
          >
            <RotateCcw className="h-4 w-4" />
            Rétablir
          </Button>
        ) : null}
        {!layer.removed ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 flex-1 rounded-xl bg-red-50 text-red-600 shadow-none hover:bg-red-100"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
            {layer.source ? "Effacer" : "Supprimer"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
