import { create } from "zustand";

/** `unconfigured` : BFF sans API_URL (500) ; `unreachable` : backend injoignable ou en erreur. */
export type ApiIssue = "unconfigured" | "unreachable" | null;

type ConnectionState = {
  online: boolean;
  apiReachable: boolean;
  apiIssue: ApiIssue;
  setOnline: (value: boolean) => void;
  setApiReachable: (value: boolean, issue?: ApiIssue) => void;
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  apiReachable: true,
  apiIssue: null,
  setOnline: (online) => set({ online }),
  setApiReachable: (apiReachable, issue) =>
    set({ apiReachable, apiIssue: apiReachable ? null : (issue ?? "unreachable") }),
}));
