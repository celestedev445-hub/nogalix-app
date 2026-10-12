import { useReducedMotion } from "framer-motion";
import { useHydrated } from "@/hooks/use-hydrated";

export const motionEase = [0.16, 1, 0.3, 1] as const;

export const enterUp = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: 0.22, ease: motionEase },
};

export const reducedMotion = {
  initial: { opacity: 1, y: 0, filter: "none" },
  animate: { opacity: 1, y: 0, filter: "none" },
  exit: { opacity: 1 },
  transition: { duration: 0 },
};

/** Same on server and first client paint; real preference after hydrate. */
export function useSafeReducedMotion() {
  const mounted = useHydrated();
  const reduce = useReducedMotion();
  return !mounted || Boolean(reduce);
}
