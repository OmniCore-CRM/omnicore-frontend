"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  listTeams,
  removeTeamMember,
  updateTeam,
} from "@/api/teams";
import { listUsers } from "@/api/users";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Permissions, hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ArrowLeft, MessageSquare, Plus, TicketIcon, Trash2, UsersRound } from "lucide-react";

export default function TeamsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("");
  const [deleteConfirmArmed, setDeleteConfirmArmed] = useState(false);
  const canManage = hasPermission(user?.role, Permissions.manageTeams);

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => listTeams(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => listUsers(token!),
    enabled: !!token,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });
  const teams = teamsQuery.data ?? [];
  const selected = teams.find((team) => team.id === selectedId) ?? null;

  const refresh = async () => qc.invalidateQueries({ queryKey: queryKeys.teams });
  const createMut = useMutation({
    mutationFn: () => createTeam(token!, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: async (team) => {
      toast.success("Team created");
      setCreating(false);
      setSelectedId(team.id);
      await refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not create team")),
  });
  const updateMut = useMutation({
    mutationFn: () => updateTeam(token!, selected!.id, { name: name.trim(), description: description.trim() || null }),
    onSuccess: async () => { toast.success("Team updated"); await refresh(); },
    onError: (error) => toast.error(getErrorMessage(error, "Could not update team")),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteTeam(token!, selected!.id),
    onSuccess: async () => { toast.success("Team deleted"); setSelectedId(null); await refresh(); },
    onError: (error) => toast.error(getErrorMessage(error, "Could not delete team")),
  });
  const addMemberMut = useMutation({
    mutationFn: async () => {
      const isAlreadyMember = selected?.members.some((member) => member.id === memberId);
      if (isAlreadyMember) {
        return { duplicate: true as const };
      }

      await addTeamMember(token!, selected!.id, memberId);
      return { duplicate: false as const };
    },
    onSuccess: async (result) => {
      if (result.duplicate) {
        toast.info("User is already a member of this team");
        return;
      }

      toast.success("Member added");
      setMemberId("");
      await refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not add member")),
  });
  const removeMemberMut = useMutation({
    mutationFn: (userId: string) => removeTeamMember(token!, selected!.id, userId),
    onSuccess: async () => { toast.success("Member removed"); await refresh(); },
    onError: (error) => toast.error(getErrorMessage(error, "Could not remove member")),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (creating) createMut.mutate();
    else if (selected) updateMut.mutate();
  };

  const selectedMemberIsExisting =
    Boolean(memberId) &&
    Boolean(selected?.members.some((member) => member.id === memberId));

  const saveBusy = createMut.isPending || updateMut.isPending;
  const removePendingUserId = removeMemberMut.isPending
    ? removeMemberMut.variables
    : null;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-oc-bg">
      <section className={cn("min-h-0 flex-1 overflow-y-auto p-3 md:p-4 xl:p-6", selectedId && "hidden lg:block")}>
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-oc-faint">Operations</p>
            <h1 className="mt-1.5 text-2xl font-semibold text-oc-text">Teams & Queues</h1>
            <p className="mt-2 text-sm text-oc-muted">Manage team membership and manual ownership across tickets and conversations.</p>
          </div>
          {canManage && <Button className="cursor-pointer disabled:cursor-not-allowed" onClick={() => { setCreating(true); setSelectedId(null); setName(""); setDescription(""); setDeleteConfirmArmed(false); }}><Plus className="h-4 w-4" />New team</Button>}
        </header>

        {teamsQuery.isLoading ? <Card className="p-6 text-sm text-oc-muted">Loading teams...</Card> : teams.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-oc-accent" />
            <h2 className="mt-4 text-lg font-semibold text-oc-text">No teams yet</h2>
            <p className="mt-2 text-sm text-oc-muted">Create a team to establish a manual support queue.</p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <button key={team.id} type="button" onClick={() => { setCreating(false); setSelectedId(team.id); setName(team.name); setDescription(team.description ?? ""); setDeleteConfirmArmed(false); }} className="cursor-pointer rounded-lg border border-oc-border bg-oc-panel p-4 text-left transition-colors hover:border-violet-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent">
                <div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-oc-text">{team.name}</h2><Badge tone="accent">{team.members.length} members</Badge></div>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-oc-muted">{team.description || "No description"}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <QueueMetric icon={<TicketIcon className="h-4 w-4" />} label="Open tickets" value={team.openTicketCount} />
                  <QueueMetric icon={<MessageSquare className="h-4 w-4" />} label="Open conversations" value={team.openConversationCount} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {(selected || creating) && (
        <aside className="min-h-0 w-full shrink-0 overflow-y-auto border-l border-oc-border bg-oc-bg-mid/70 lg:w-[380px]">
          <div className="flex min-h-14 items-center gap-3 border-b border-oc-border px-3.5">
            <Button variant="ghost" className="h-10 w-10 cursor-pointer px-0 disabled:cursor-not-allowed lg:hidden" onClick={() => { setSelectedId(null); setCreating(false); setDeleteConfirmArmed(false); }} aria-label="Back to teams"><ArrowLeft className="h-5 w-5" /></Button>
            <div><p className="font-semibold text-oc-text">{creating ? "Create team" : selected?.name}</p><p className="text-xs text-oc-muted">{creating ? "Start a manual queue" : "Team detail and membership"}</p></div>
          </div>
          <div className="space-y-3 p-3 md:p-4">
            <Card className="p-4">
              <form className="space-y-4" onSubmit={submit}>
                <label className="block text-sm font-medium text-oc-text">Name<Input value={name} onChange={(event) => setName(event.target.value)} className="mt-2" disabled={!canManage || saveBusy || deleteMut.isPending} /></label>
                <label className="block text-sm font-medium text-oc-text">Description<Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 min-h-24" disabled={!canManage || saveBusy || deleteMut.isPending} /></label>
                {canManage && <div className="flex flex-wrap justify-between gap-2"><Button type="submit" className="cursor-pointer disabled:cursor-not-allowed" disabled={!name.trim() || saveBusy || deleteMut.isPending}>{saveBusy ? (creating ? "Creating..." : "Saving...") : (creating ? "Create team" : "Save changes")}</Button>{selected && <Button type="button" variant={deleteConfirmArmed ? "danger" : "secondary"} className="cursor-pointer disabled:cursor-not-allowed" disabled={saveBusy || deleteMut.isPending} onClick={() => { if (!deleteConfirmArmed) { setDeleteConfirmArmed(true); toast.message("Click delete again to confirm"); return; } deleteMut.mutate(); }}>{deleteMut.isPending ? <><Trash2 className="h-4 w-4" />Deleting...</> : deleteConfirmArmed ? <><Trash2 className="h-4 w-4" />Confirm delete</> : <><Trash2 className="h-4 w-4" />Delete</>}</Button>}</div>}
              </form>
            </Card>
            {selected && <Card className="space-y-3 p-4">
              <div><h3 className="font-semibold text-oc-text">Queue overview</h3><p className="text-sm text-oc-muted">Manual ownership currently assigned to this team.</p></div>
              <div className="grid grid-cols-2 gap-3">
                <QueueMetric icon={<TicketIcon className="h-4 w-4" />} label={`${selected.ticketCount} total tickets`} value={selected.openTicketCount} />
                <QueueMetric icon={<MessageSquare className="h-4 w-4" />} label={`${selected.conversationCount} total conversations`} value={selected.openConversationCount} />
              </div>
            </Card>}
            {selected && <Card className="space-y-3 p-4">
              <div><h3 className="font-semibold text-oc-text">Members</h3><p className="text-sm text-oc-muted">People available in this team queue.</p></div>
              {canManage && <div className="flex flex-col gap-2 sm:flex-row"><select value={memberId} onChange={(event) => setMemberId(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-oc-border bg-oc-bg px-3 text-sm text-oc-text cursor-pointer disabled:cursor-not-allowed" disabled={addMemberMut.isPending || removeMemberMut.isPending}><option value="">Select user</option>{(usersQuery.data ?? []).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.displayName || `${candidate.firstName} ${candidate.lastName}`}</option>)}</select><Button type="button" className="cursor-pointer disabled:cursor-not-allowed" disabled={!memberId || addMemberMut.isPending || removeMemberMut.isPending} onClick={() => addMemberMut.mutate()}>{addMemberMut.isPending ? "Adding..." : selectedMemberIsExisting ? "Add again" : "Add"}</Button></div>}
              {canManage && selectedMemberIsExisting && <p className="text-xs text-oc-muted">Selected user is already in this team. Adding again is handled safely.</p>}
              <div className="space-y-2">{selected.members.length ? selected.members.map((member) => <div key={member.id} className="flex flex-col gap-3 rounded-lg border border-oc-border/60 bg-oc-bg/40 p-3 sm:flex-row sm:items-center"><Avatar name={member.displayName || member.email} size={36} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-oc-text">{member.displayName || `${member.firstName} ${member.lastName}`}</p><p className="truncate text-xs text-oc-muted">{member.role}</p></div>{canManage && <Button variant="ghost" size="sm" className="cursor-pointer justify-center disabled:cursor-not-allowed sm:justify-start" disabled={addMemberMut.isPending || removeMemberMut.isPending} onClick={() => removeMemberMut.mutate(member.id)}>{removePendingUserId === member.id ? "Removing..." : "Remove"}</Button>}</div>) : <p className="text-sm text-oc-muted">No members assigned.</p>}</div>
            </Card>}
          </div>
        </aside>
      )}
    </div>
  );
}

function QueueMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-lg border border-oc-border/60 bg-oc-bg/40 p-3"><div className="flex items-center gap-2 text-oc-muted">{icon}<span className="text-xs">{label}</span></div><p className="mt-2 text-xl font-semibold text-oc-text">{value}</p></div>;
}
