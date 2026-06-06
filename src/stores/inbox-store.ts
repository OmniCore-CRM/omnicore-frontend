"use client";

import { create } from "zustand";
import type { ConversationStatus } from "@/types/models";

type InboxState = {
  selectedConversationId: string | null;
  inboxFilter: "all" | "WEBSITE" | "WHATSAPP" | "EMAIL";
  inboxStatusFilter: "all" | ConversationStatus;
  inboxSearch: string;
  setSelectedConversationId: (id: string | null) => void;
  setInboxFilter: (f: InboxState["inboxFilter"]) => void;
  setInboxStatusFilter: (f: InboxState["inboxStatusFilter"]) => void;
  setInboxSearch: (q: string) => void;
};

export const useInboxStore = create<InboxState>((set) => ({
  selectedConversationId: null,
  inboxFilter: "all",
  inboxStatusFilter: "all",
  inboxSearch: "",
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setInboxFilter: (inboxFilter) => set({ inboxFilter }),
  setInboxStatusFilter: (inboxStatusFilter) => set({ inboxStatusFilter }),
  setInboxSearch: (inboxSearch) => set({ inboxSearch }),
}));
