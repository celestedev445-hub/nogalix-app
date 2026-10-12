import { useEffect } from "react";
import { useConnectionStore } from "@/store/connectionStore";
import { apiUrl } from "@/lib/apiUrl";

const PING_INTERVAL_MS = 120_000;

async function isUnconfigured(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return /non configur/i.test(payload?.message || "");
}

export function ConnectionGate() {
  const { setOnline, setApiReachable } = useConnectionStore();

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => {
      setOnline(false);
      setApiReachable(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    let intervalId: number | null = null;
    let cancelled = false;

    const ping = async () => {
      if (cancelled || document.hidden || !navigator.onLine) return;
      if (!apiUrl()) {
        setApiReachable(false, "unconfigured");
        return;
      }
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        const response = await fetch(apiUrl("health"), {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        window.clearTimeout(timeout);
        if (cancelled) return;
        if (response.ok) {
          setApiReachable(true);
          return;
        }
        // 500 « API backend non configurée » (API_URL absent) vs 502/503 backend injoignable.
        const issue = response.status === 500 && (await isUnconfigured(response)) ? "unconfigured" : "unreachable";
        setApiReachable(false, issue);
      } catch {
        if (!cancelled) setApiReachable(false);
      }
    };

    const start = () => {
      void ping();
      if (intervalId == null) {
        intervalId = window.setInterval(ping, PING_INTERVAL_MS);
      }
    };

    const deferHandle = window.setTimeout(start, 2500);

    const onVisibility = () => {
      if (!document.hidden) void ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(deferHandle);
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [setOnline, setApiReachable]);

  return null;
}
