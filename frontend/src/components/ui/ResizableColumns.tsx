import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const HANDLE_PX = 6;

type ResizableColumnsProps = {
  start: ReactNode;
  end: ReactNode;
  className?: string;
  /** Ratio initial du panneau de gauche (0–1). */
  defaultRatio?: number;
  minStartPx?: number;
  minEndPx?: number;
  storageKey?: string;
  /** En dessous de ce breakpoint (px), les panneaux s'empilent sans poignée. */
  stackBelowPx?: number;
  /** Sur mobile, n'affiche que le panneau de gauche (aperçu via bouton dédié). */
  hideEndWhenStacked?: boolean;
  /** Hauteur du panneau gauche une fois empilé. */
  startSizeWhenStacked?: "flex" | "auto";
};

function readStoredRatio(key: string | undefined, fallback: number) {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? Number(raw) : NaN;
    if (Number.isFinite(value) && value > 0.15 && value < 0.85) return value;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function ResizableColumns({
  start,
  end,
  className,
  defaultRatio = 0.58,
  minStartPx = 280,
  minEndPx = 240,
  storageKey,
  stackBelowPx = 1280,
  hideEndWhenStacked = false,
  startSizeWhenStacked = "flex",
}: ResizableColumnsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(() => readStoredRatio(storageKey, defaultRatio));
  const [stacked, setStacked] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${stackBelowPx - 1}px)`);
    const sync = () => setStacked(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [stackBelowPx]);

  const updateRatio = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const maxStart = rect.width - minEndPx - HANDLE_PX;
      const next = Math.min(Math.max(clientX - rect.left, minStartPx), maxStart) / rect.width;
      setRatio(next);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(next));
        } catch {
          /* ignore */
        }
      }
    },
    [minEndPx, minStartPx, storageKey],
  );

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      updateRatio(event.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [updateRatio]);

  function onHandlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateRatio(event.clientX);
  }

  if (stacked) {
    if (hideEndWhenStacked) {
      return (
        <div className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{start}</div>
        </div>
      );
    }
    return (
      <div className={cn("flex min-h-0 flex-col gap-3 overflow-hidden", className)}>
        <div
          className={
            startSizeWhenStacked === "auto"
              ? "flex min-w-0 shrink-0 flex-col"
              : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          }
        >
          {start}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{end}</div>
      </div>
    );
  }

  const startPercent = `${ratio * 100}%`;

  return (
    <div
      ref={containerRef}
      className={cn("flex min-h-0 min-w-0 print:flex-col print:gap-4", className)}
    >
      <div
        className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden print:w-full print:!w-full"
        style={{ width: startPercent }}
      >
        {start}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner les colonnes"
        onPointerDown={onHandlePointerDown}
        className={cn(
          "relative z-10 mx-1 w-1.5 shrink-0 cursor-col-resize touch-none print:hidden",
          "before:absolute before:inset-y-3 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-gris",
          "after:absolute after:left-1/2 after:top-1/2 after:h-8 after:w-1 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-gris",
          "hover:after:bg-principale/50 active:after:bg-principale",
        )}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{end}</div>
    </div>
  );
}
