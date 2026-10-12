import { useLayoutEffect, useRef, useState } from "react";
import { CvPaperEager } from "@/components/templates/CvPaperEager";
import { PAGE_H, PAGE_W } from "@/components/templates/shared";
import type { CvData } from "@/lib/cvTypes";
import { cn } from "@/lib/utils";

const VISIBLE_H = Math.round(PAGE_H * 0.8);

export function CvTemplateThumb({
  cv,
  className,
}: {
  cv: CvData;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / PAGE_W);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("rounded-lg bg-[#EEF1F6] p-1.5", className)}>
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-[3px] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.12)]"
        style={{ aspectRatio: `${PAGE_W} / ${VISIBLE_H}` }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            transform: `scale(${scale})`,
          }}
        >
          <CvPaperEager cv={cv} className="pointer-events-none h-full w-full" />
        </div>
      </div>
    </div>
  );
}
