import { CvPaper } from "@/components/templates/CvPaper";
import type { CvData } from "@/lib/cvTypes";
import { cn } from "@/lib/utils";

const PAPER_WIDTH = 320;
const SCALE = 0.46;

export function CvThumbnail({
  cv,
  className,
}: {
  cv: CvData;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-36 overflow-hidden rounded-xl bg-gradient-brand-soft sm:h-40",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute top-3 rounded-md bg-white shadow-[0_14px_36px_rgba(15,23,42,0.14)]"
        style={{
          left: "50%",
          width: PAPER_WIDTH,
          transform: `translateX(-50%) scale(${SCALE})`,
          transformOrigin: "top center",
        }}
      >
        <CvPaper cv={cv} className="min-h-[510px] w-[320px] rounded-md shadow-none" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#EEF2FF] to-transparent" />
    </div>
  );
}
