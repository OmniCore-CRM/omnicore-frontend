"use client";

import { create } from "zustand";

import type { AuthSession } from "@/types/api";
import type { AuthUser, Company } from "@/types/models";

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  company: Company | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  company: null,
  hasHydrated: false,
  setHasHydrated: (value) => set({ hasHydrated: value }),
  setSession: ({ accessToken, user, company }) =>
    set({ accessToken, user, company }),
  clearSession: () =>
    set({ accessToken: null, user: null, company: null }),
}));
