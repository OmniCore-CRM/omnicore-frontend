"use client";

import { create } from "zustand";

type InboxState = {
  selectedConversationId: string | null;
  inboxFilter: "all" | "WEBSITE" | "WHATSAPP" | "EMAIL";
  inboxSearch: string;
  setSelectedConversationId: (id: string | null) => void;
  setInboxFilter: (f: InboxState["inboxFilter"]) => void;
  setInboxSearch: (q: string) => void;
};

export const useInboxStore = create<InboxState>((set) => ({
  selectedConversationId: null,
  inboxFilter: "all",
  inboxSearch: "",
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setInboxFilter: (inboxFilter) => set({ inboxFilter }),
  setInboxSearch: (inboxSearch) => set({ inboxSearch }),
}));
