import type { ImplementerRole } from "@prisma/client";
import {
  TicketCategory as PrismaTicketCategory,
  TicketPriorityLevel as PrismaTicketPriorityLevel,
  TicketStatus as PrismaTicketStatus,
} from "@prisma/client";
import { z } from "zod";
import { stringValidation } from "#/lib/utils";

export const TicketCategoryEnum = z.enum(PrismaTicketCategory);
export const TicketStatusEnum = z.enum(PrismaTicketStatus);
export const TicketPriorityLevelEnum = z.enum(PrismaTicketPriorityLevel);

export const CreateTicketSchema = z.object({
  subject: stringValidation("Subject is required"),
  description: stringValidation("Description is required"),
  category: TicketCategoryEnum,
  priority: TicketPriorityLevelEnum.default("MEDIUM"),
});

export type TicketCategory = z.infer<typeof TicketCategoryEnum>;
export type TicketStatus = z.infer<typeof TicketStatusEnum>;
export type TicketPriorityLevel = z.infer<typeof TicketPriorityLevelEnum>;

export type EscalationInitiatorRole = Extract<
  ImplementerRole,
  "FELLOW" | "SUPERVISOR" | "HUB_COORDINATOR" | "CLINICAL_LEAD"
>;

export const ESCALATION_INITIATOR_ROLES: EscalationInitiatorRole[] = [
  "FELLOW",
  "SUPERVISOR",
  "HUB_COORDINATOR",
  "CLINICAL_LEAD",
];

export function isEscalationInitiatorRole(role: ImplementerRole): role is EscalationInitiatorRole {
  return ESCALATION_INITIATOR_ROLES.includes(role as EscalationInitiatorRole);
}

export type EscalationRecipientRole = Extract<
  ImplementerRole,
  "SUPERVISOR" | "HUB_COORDINATOR" | "ADMIN" | "CLINICAL_LEAD"
>;

export const ESCALATION_RECIPIENT_ROLES: EscalationRecipientRole[] = [
  "SUPERVISOR",
  "HUB_COORDINATOR",
  "ADMIN",
  "CLINICAL_LEAD",
];

export type ReassignmentInitiatorRole = Extract<
  ImplementerRole,
  "HUB_COORDINATOR" | "ADMIN" | "CLINICAL_LEAD"
>;

export const REASSIGNMENT_INITIATOR_ROLES: ReassignmentInitiatorRole[] = [
  "HUB_COORDINATOR",
  "ADMIN",
  "CLINICAL_LEAD",
];

export type FetchEscalationRecipientHandler = (
  userId: string,
  implementerId: string,
) => Promise<string>;

export const ESCALATION_RECIPIENT_FROM_CATEGORY: Record<TicketCategory, EscalationRecipientRole> = {
  TECH: "HUB_COORDINATOR",
  RESEARCH: "HUB_COORDINATOR",
  OPERATIONS: "HUB_COORDINATOR",
  CARE: "HUB_COORDINATOR",
  CLINICAL: "CLINICAL_LEAD",
};

export const ESCALATION_RECIPIENT_FROM_INITIATOR: Record<
  EscalationInitiatorRole,
  (category?: TicketCategory) => EscalationRecipientRole
> = {
  FELLOW: (): EscalationRecipientRole => "SUPERVISOR",
  SUPERVISOR: (category?: TicketCategory): EscalationRecipientRole =>
    category ? ESCALATION_RECIPIENT_FROM_CATEGORY[category] : "HUB_COORDINATOR",
  HUB_COORDINATOR: (): EscalationRecipientRole => "ADMIN",
  CLINICAL_LEAD: (): EscalationRecipientRole => "ADMIN",
};

export interface CreateTicketPayload {
  createdById: string;
  subject: string;
  description: string;
  priority?: TicketPriorityLevel;
  category: TicketCategory;
}

export type CreateTicketInput = Omit<CreateTicketPayload, "createdById">;

export interface CreateTicketEscalationPayload {
  ticketId: string;
  escalatedById: string;
  escalatedToId: string;
  escalationReason: string;
}

export interface TicketFilters {
  status?: TicketStatus;
  page?: number;
  limit?: number;
}

export interface FullTicket {
  id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriorityLevel;
  createdAt: Date;
  currentTier: ImplementerRole | null;
}

export type FullTicketPendingTier = Omit<FullTicket, "currentTier"> & {
  currentRecipientId: string | null;
};
export interface TicketEscalation {
  id: string;
  ticketId: string;
  escalatedById: string;
  escalatedToId: string;
  escalationReason: string;
  createdAt: Date;
  escalatedByName: string;
  escalatedToName: string;
  escalatedByRole: EscalationInitiatorRole;
  escalatedToRole: EscalationRecipientRole;
}

export interface TicketEscalationStatus {
  canEscalate: boolean;
  canReassign: boolean;
  canResolve: boolean;
  hasReassignment: boolean;
  hasResolution: boolean;
}

export interface TicketResolution {
  id: string;
  ticketId: string;
  resolvedById: string;
  resolvedByRole: string | null;
  resolutionReason: string;
  createdAt: Date;
}

export type UserRoleNameMap = Map<string, { role: ImplementerRole; name: string | null } | null>;

export const ROLE_NAME_CONFIG: { role: ImplementerRole; table: string; column: string }[] = [
  { role: "FELLOW", table: "fellows", column: "fellow_name" },
  { role: "SUPERVISOR", table: "supervisors", column: "supervisor_name" },
  { role: "HUB_COORDINATOR", table: "hub_coordinators", column: "coordinator_name" },
  { role: "CLINICAL_LEAD", table: "clinical_leads", column: "clinical_lead_name" },
  { role: "CLINICAL_TEAM", table: "clinical_teams", column: "name" },
  { role: "OPERATIONS", table: "ops_users", column: "name" },
  { role: "ADMIN", table: "admin_users", column: "name" },
];

export const REASSIGNMENT_REASON_MAX_LENGTH = 1000;

export const CreateTicketReassignmentSchema = z.object({
  ticketId: stringValidation("Ticket is required"),
  reassignedTo: stringValidation("A recipient is required"),
  reassignmentReason: stringValidation("Reassignment Reason is required").max(
    REASSIGNMENT_REASON_MAX_LENGTH,
    `Reassignment reason must be at most ${REASSIGNMENT_REASON_MAX_LENGTH} characters`,
  ),
});

export interface BaseTicketReassignment {
  ticketId: string;
  reassignedFrom: string;
  reassignedTo: string;
  reassignmentReason: string;
  escalationId: string;
}
export type CreateTicketReassignmentPayload = BaseTicketReassignment;
export type CreateTicketReassignmentInput = Omit<
  CreateTicketReassignmentPayload,
  "reassignedFrom" | "escalationId"
>;

export interface FullTicketReassignment extends BaseTicketReassignment {
  id: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reassignedFromName: string;
  reassignedToName: string;
  reassignedFromRole: ReassignmentInitiatorRole | null;
  reassignedToRole: ReassignmentInitiatorRole | null;
}
