import type { ReactNode } from "react";
import { useHydrated } from "@/hooks/use-hydrated";

/** Renders children only after hydration so SSR HTML stays identical. */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const ready = useHydrated();
  if (!ready) return fallback;
  return children;
}
