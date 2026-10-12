import { create } from "zustand";

type InterfaceState = {
  assistantOpen: boolean;
  assistantMuted: boolean;
  mobileNavOpen: boolean;
  /** CV en édition vocale dans l'éditeur saisie (sans changer de page). */
  cvVoiceCvId: string | null;
  /** Incrémenté pour déclencher l'écoute dans l'assistant. */
  assistantListenTick: number;
  setAssistantOpen: (value: boolean) => void;
  setAssistantMuted: (value: boolean) => void;
  setMobileNavOpen: (value: boolean) => void;
  setCvVoiceCvId: (cvId: string | null) => void;
  requestAssistantListen: () => void;
  activateCvVoice: (cvId: string) => void;
};

export const useInterfaceStore = create<InterfaceState>((set) => ({
  assistantOpen: false,
  assistantMuted: false,
  mobileNavOpen: false,
  cvVoiceCvId: null,
  assistantListenTick: 0,
  setAssistantOpen: (assistantOpen) => {
    if (!assistantOpen) {
      set({ assistantOpen: false, cvVoiceCvId: null });
      return;
    }
    set({ assistantOpen: true });
  },
  setAssistantMuted: (assistantMuted) => set({ assistantMuted }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setCvVoiceCvId: (cvVoiceCvId) => {
    if (cvVoiceCvId) {
      set({ cvVoiceCvId, assistantOpen: true });
      return;
    }
    set({ cvVoiceCvId: null });
  },
  requestAssistantListen: () =>
    set((state) => ({ assistantListenTick: state.assistantListenTick + 1 })),
  activateCvVoice: (cvId) =>
    set((state) => ({
      cvVoiceCvId: cvId,
      assistantOpen: true,
      assistantListenTick: state.assistantListenTick + 1,
    })),
}));
