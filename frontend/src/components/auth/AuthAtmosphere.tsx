import { useEffect, useRef } from "react";

export function AuthAtmosphere() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      const { innerWidth: width, innerHeight: height } = window;
      if (!width || !height) return;
      targetX = (event.clientX / width) * 2 - 1;
      targetY = (event.clientY / height) * 2 - 1;
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      root.style.setProperty("--auth-mx", currentX.toFixed(4));
      root.style.setProperty("--auth-my", currentY.toFixed(4));
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="auth-atmosphere" aria-hidden>
      <div className="auth-atmosphere-track" style={{ "--auth-depth": "42px" } as React.CSSProperties}>
        <div className="auth-atmosphere-blob auth-atmosphere-blob-navy" />
      </div>
      <div className="auth-atmosphere-track" style={{ "--auth-depth": "-48px" } as React.CSSProperties}>
        <div className="auth-atmosphere-blob auth-atmosphere-blob-mid" />
      </div>
      <div className="auth-atmosphere-track" style={{ "--auth-depth": "56px" } as React.CSSProperties}>
        <div className="auth-atmosphere-blob auth-atmosphere-blob-mist" />
      </div>
      <div className="auth-atmosphere-track" style={{ "--auth-depth": "64px" } as React.CSSProperties}>
        <div className="auth-atmosphere-blob auth-atmosphere-blob-gold" />
      </div>
      <div className="auth-atmosphere-light" />
      <div className="auth-atmosphere-grain" />
      <div className="auth-atmosphere-vignette" />
    </div>
  );
}
