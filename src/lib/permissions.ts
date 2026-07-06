import type { UserRole } from "@/types/models";

export const Permissions = {
  manageUsers: "manage_users",
  viewUsers: "view_users",
  manageRoles: "manage_roles",
  manageTeams: "manage_teams",
  assignWork: "assign_work",
  manageSettings: "manage_settings",
  manageWidget: "manage_widget",
  manageEmailChannels: "manage_email_channels",
  manageAssignmentRules: "manage_assignment_rules",
  manageSlaPolicies: "manage_sla_policies",
  viewAuditLogs: "view_audit_logs",
  viewAnalytics: "view_analytics",
  manageTags: "manage_tags",
  manageSavedReplies: "manage_saved_replies",
  operationalTicketActions: "operational_ticket_actions",
  operationalConversationActions: "operational_conversation_actions",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

const allPermissions = Object.values(Permissions) as Permission[];

const rolePermissions: Record<UserRole, readonly Permission[]> = {
  SUPER_ADMIN: allPermissions,
  OWNER: allPermissions,
  ADMIN: allPermissions,
  TEAM_LEAD: [
    Permissions.viewUsers,
    Permissions.manageTeams,
    Permissions.assignWork,
    Permissions.viewAnalytics,
    Permissions.manageTags,
    Permissions.manageSavedReplies,
    Permissions.operationalTicketActions,
    Permissions.operationalConversationActions,
  ],
  AGENT: [
    Permissions.assignWork,
    Permissions.viewAnalytics,
    Permissions.operationalTicketActions,
    Permissions.operationalConversationActions,
  ],
  VIEWER: [Permissions.viewAnalytics],
};

export const hasPermission = (
  role: UserRole | null | undefined,
  permission: Permission,
) => {
  if (!role) return false;
  return rolePermissions[role].includes(permission);
};

export const rolesWithPermission = (permission: Permission) =>
  (Object.keys(rolePermissions) as UserRole[]).filter((role) =>
    rolePermissions[role].includes(permission),
  );

export const roleLabel = (role: UserRole) => {
  if (role === "TEAM_LEAD") return "SUPERVISOR";
  return role.replace("_", " ");
};
