"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { AuthSession } from "@/types/api";
import type { AuthUser, Company } from "@/types/models";

/**
 * Global authenticated session state.
 *
 * Responsible only for storing auth/session data.
 * API requests, session hydration, and socket lifecycle
 * should stay outside the Zustand store.
 */
type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  company: Company | null;

  hasHydrated: boolean;

  setHasHydrated: (value: boolean) => void;

  setSession: (session: AuthSession) => void;

  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      company: null,

      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      setSession: ({ accessToken, user, company }) =>
        set({
          accessToken,
          user,
          company,
        }),

      clearSession: () =>
        set({
          accessToken: null,
          user: null,
          company: null,
        }),
    }),
    {
      name: "omnicore-auth",

      storage: createJSONStorage(() => localStorage),

      // Persist only long-lived auth session data.
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        company: state.company,
      }),

      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
