import { useEffect, useState } from "react";

/** True when the software keyboard shrinks the visual viewport (iOS / Android). */
export function useKeyboardOpen(thresholdPx = 96) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const sync = () => {
      setOpen(window.innerHeight - viewport.height > thresholdPx);
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, [thresholdPx]);

  return open;
}
