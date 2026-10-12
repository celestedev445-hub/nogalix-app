import { useEffect, useRef } from "react";
import { handleSessionExpired } from "@/lib/sessionExpired";
import { useAuthStore } from "@/store/authStore";

const IDLE_MS = 1000 * 60 * 45;
const SCROLL_THROTTLE_MS = 30_000;

export function SessionTimeout() {
  const authenticated = useAuthStore((s) => s.authenticated);
  const timer = useRef<number | null>(null);
  const lastScrollReset = useRef(0);

  useEffect(() => {
    if (!authenticated) return;

    const reset = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        void handleSessionExpired("Inactivité prolongée. Reconnectez-vous.");
      }, IDLE_MS);
    };

    const onScroll = () => {
      const now = Date.now();
      if (now - lastScrollReset.current < SCROLL_THROTTLE_MS) return;
      lastScrollReset.current = now;
      reset();
    };

    const events = ["click", "keydown", "touchstart", "scroll"] as const;
    events.forEach((event) => window.addEventListener(event, event === "scroll" ? onScroll : reset, { passive: true }));
    reset();
    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, event === "scroll" ? onScroll : reset),
      );
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [authenticated]);

  return null;
}
