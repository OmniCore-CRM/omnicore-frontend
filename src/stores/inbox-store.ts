"use client";

import { create } from "zustand";
import type { ConversationStatus } from "@/types/models";

type InboxState = {
  selectedConversationId: string | null;
  inboxFilter: "all" | "WEBSITE" | "WHATSAPP" | "EMAIL";
  inboxStatusFilter: "all" | ConversationStatus;
  inboxTeamFilter: string;
  inboxTagFilter: string;
  inboxSearch: string;
  setSelectedConversationId: (id: string | null) => void;
  setInboxFilter: (f: InboxState["inboxFilter"]) => void;
  setInboxStatusFilter: (f: InboxState["inboxStatusFilter"]) => void;
  setInboxTeamFilter: (id: string) => void;
  setInboxTagFilter: (id: string) => void;
  setInboxSearch: (q: string) => void;
};

export const useInboxStore = create<InboxState>((set) => ({
  selectedConversationId: null,
  inboxFilter: "all",
  inboxStatusFilter: "all",
  inboxTeamFilter: "",
  inboxTagFilter: "",
  inboxSearch: "",
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setInboxFilter: (inboxFilter) => set({ inboxFilter }),
  setInboxStatusFilter: (inboxStatusFilter) => set({ inboxStatusFilter }),
  setInboxTeamFilter: (inboxTeamFilter) => set({ inboxTeamFilter }),
  setInboxTagFilter: (inboxTagFilter) => set({ inboxTagFilter }),
  setInboxSearch: (inboxSearch) => set({ inboxSearch }),
}));
