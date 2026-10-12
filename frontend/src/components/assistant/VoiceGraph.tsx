import { cn } from "@/lib/utils";

const BARS = [
  { peak: 0.42, dur: "1.15s", delay: "0s" },
  { peak: 0.68, dur: "0.92s", delay: "0.08s" },
  { peak: 0.9, dur: "0.78s", delay: "0.04s" },
  { peak: 0.55, dur: "1.05s", delay: "0.14s" },
  { peak: 1, dur: "0.7s", delay: "0.02s" },
  { peak: 0.72, dur: "0.88s", delay: "0.18s" },
  { peak: 0.38, dur: "1.2s", delay: "0.1s" },
  { peak: 0.84, dur: "0.74s", delay: "0.06s" },
  { peak: 0.96, dur: "0.82s", delay: "0.16s" },
  { peak: 0.5, dur: "1.08s", delay: "0.12s" },
  { peak: 0.78, dur: "0.66s", delay: "0s" },
  { peak: 0.62, dur: "0.94s", delay: "0.2s" },
  { peak: 0.92, dur: "0.76s", delay: "0.09s" },
  { peak: 0.44, dur: "1.12s", delay: "0.05s" },
  { peak: 0.86, dur: "0.8s", delay: "0.15s" },
  { peak: 0.58, dur: "0.98s", delay: "0.03s" },
  { peak: 1, dur: "0.72s", delay: "0.11s" },
  { peak: 0.7, dur: "0.86s", delay: "0.07s" },
  { peak: 0.48, dur: "1.16s", delay: "0.13s" },
  { peak: 0.8, dur: "0.9s", delay: "0.01s" },
  { peak: 0.64, dur: "1s", delay: "0.17s" },
  { peak: 0.94, dur: "0.68s", delay: "0.19s" },
  { peak: 0.52, dur: "1.1s", delay: "0.04s" },
  { peak: 0.76, dur: "0.84s", delay: "0.08s" },
] as const;

type VoiceGraphProps = {
  active: boolean;
  size?: "md" | "lg";
  className?: string;
};

export function VoiceGraph({ active, size = "md", className }: VoiceGraphProps) {
  const tall = size === "lg";

  return (
    <div
      className={cn(
        "noga-voice-graph flex items-center justify-center",
        tall ? "h-16 gap-[3px]" : "h-10 gap-[2px]",
        className,
      )}
      data-active={active ? "true" : "false"}
      aria-hidden
    >
      {BARS.map((bar, index) => (
        <span
          key={index}
          className="noga-voice-bar block origin-center rounded-full bg-principale"
          style={{
            width: tall ? 3 : 2.5,
            height: tall ? 56 : 36,
            ["--noga-peak" as string]: String(bar.peak),
            ["--noga-dur" as string]: bar.dur,
            animationDelay: bar.delay,
          }}
        />
      ))}
    </div>
  );
}
