import { apiFetch } from "./client";
import type {
  AssignmentRule,
  AssignmentRuleConditionType,
  AssignmentRuleTargetType,
} from "@/types/models";

export type AssignmentRuleInput = {
  name: string;
  enabled: boolean;
  targetType: AssignmentRuleTargetType;
  conditionType: AssignmentRuleConditionType;
  conditionValue: string;
  teamId: string;
};

export const listAssignmentRules = (token: string) =>
  apiFetch<AssignmentRule[]>("/assignment-rules", {
    token,
    cache: "no-store",
  });

export const createAssignmentRule = (
  token: string,
  body: AssignmentRuleInput,
) =>
  apiFetch<AssignmentRule>("/assignment-rules", {
    method: "POST",
    token,
    body,
  });

export const updateAssignmentRule = (
  token: string,
  ruleId: string,
  body: Partial<AssignmentRuleInput>,
) =>
  apiFetch<AssignmentRule>(`/assignment-rules/${ruleId}`, {
    method: "PATCH",
    token,
    body,
  });

export const deleteAssignmentRule = (token: string, ruleId: string) =>
  apiFetch<AssignmentRule>(`/assignment-rules/${ruleId}`, {
    method: "DELETE",
    token,
  });
