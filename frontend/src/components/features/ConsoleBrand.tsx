import { useEffect } from "react";
import { appConfig } from "@/lib/appConfig";

export function ConsoleBrand() {
  useEffect(() => {
    console.info(`%c${appConfig.name}`, "color:#3A83F7;font-weight:700;font-size:14px");
  }, []);
  return null;
}
