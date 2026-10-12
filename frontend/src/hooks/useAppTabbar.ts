import { useEffect } from "react";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

export type AppTabbarBp = "md" | "lg" | "xl";

/** Publishes `--app-tabbar-offset` on <html> so docks / toasts clear the tab bar. */
export function useAppTabbar(visible: boolean, breakpoint: AppTabbarBp = "xl") {
  const keyboardOpen = useKeyboardOpen();
  const shown = visible && !keyboardOpen;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("has-app-tabbar", shown);
    if (shown) root.dataset.tabbarBp = breakpoint;
    else delete root.dataset.tabbarBp;
    return () => {
      root.classList.remove("has-app-tabbar");
      delete root.dataset.tabbarBp;
    };
  }, [shown, breakpoint]);

  return { shown, keyboardOpen };
}
