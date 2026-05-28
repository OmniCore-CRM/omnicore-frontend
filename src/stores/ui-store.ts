"use client";

import { create } from "zustand";

type UiState = {
  sidebarCollapsed: boolean;
  globalSearch: string;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setGlobalSearch: (q: string) => void;
};

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: false,
  globalSearch: "",
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setGlobalSearch: (q) => set({ globalSearch: q }),
}));
