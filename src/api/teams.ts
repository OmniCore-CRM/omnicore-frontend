import { apiFetch } from "./client";
import type { Conversation, Team, Ticket } from "@/types/models";

export const listTeams = (token: string) =>
  apiFetch<Team[]>("/teams", { token, cache: "no-store" });

export const createTeam = (
  token: string,
  body: { name: string; description?: string },
) => apiFetch<Team>("/teams", { method: "POST", token, body });

export const updateTeam = (
  token: string,
  id: string,
  body: { name?: string; description?: string | null },
) => apiFetch<Team>(`/teams/${id}`, { method: "PATCH", token, body });

export const deleteTeam = (token: string, id: string) =>
  apiFetch<{ id: string }>(`/teams/${id}`, { method: "DELETE", token });

export const addTeamMember = (token: string, id: string, userId: string) =>
  apiFetch<Team>(`/teams/${id}/members`, {
    method: "POST",
    token,
    body: { userId },
  });

export const removeTeamMember = (token: string, id: string, userId: string) =>
  apiFetch<Team>(`/teams/${id}/members/${userId}`, {
    method: "DELETE",
    token,
  });

export const assignTicketTeam = (
  token: string,
  ticketId: string,
  teamId: string | null,
) =>
  apiFetch<Ticket>(`/tickets/${ticketId}/team`, {
    method: "POST",
    token,
    body: { teamId },
  });

export const assignConversationTeam = (
  token: string,
  conversationId: string,
  teamId: string | null,
) =>
  apiFetch<Conversation>(`/conversations/${conversationId}/team`, {
    method: "POST",
    token,
    body: { teamId },
  });
