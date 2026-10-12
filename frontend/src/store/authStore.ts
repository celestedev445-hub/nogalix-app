import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar?: string | null;
  role?: "user" | "admin" | string;
  is_admin?: boolean;
  has_google?: boolean;
  has_password?: boolean;
  plan_expires_at?: string | null;
  notifyEmail?: boolean;
  notifyJobs?: boolean;
  notifyAnalysis?: boolean;
  [key: string]: unknown;
};

type AuthState = {
  hydrated: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  setHydrated: (value: boolean) => void;
  setAuthenticated: (value: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hydrated: false,
      authenticated: false,
      user: null,
      setHydrated: (hydrated) => set({ hydrated }),
      setAuthenticated: (authenticated) => set({ authenticated }),
      setUser: (user) => set({ user, authenticated: Boolean(user) }),
      reset: () => set({ authenticated: false, user: null }),
    }),
    {
      name: "nogalix-auth",
      skipHydration: true,
      partialize: (state) => ({
        authenticated: state.authenticated,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
