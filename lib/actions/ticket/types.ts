import type { db, Transaction } from "#/db/client";
import type { AdminTeam, ImplementerRole, TicketEventKind } from "#/db/enums";
import {
  TicketCategory as TicketCategoryValues,
  TicketPriorityLevel as TicketPriorityLevelValues,
  TicketStatus as TicketStatusValues,
} from "#/db/enums";
import { z } from "zod";
import { stringValidation } from "#/lib/utils";

export const TicketCategoryEnum = z.enum(TicketCategoryValues);
export const TicketStatusEnum = z.enum(TicketStatusValues);
export const TicketPriorityLevelEnum = z.enum(TicketPriorityLevelValues);

export const CreateTicketSchema = z.object({
  subject: stringValidation("Subject is required"),
  description: stringValidation("Description is required"),
  category: TicketCategoryEnum,
  priority: TicketPriorityLevelEnum.default("MEDIUM"),
  assigneeId: stringValidation("Choose who should take it"),
});

export const ACTIVE_TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ESCALATED"];
export const RESOLVED_TICKET_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED"];

export const TicketReasonSchema = stringValidation("A reason is required");

export const ChangeTicketPrioritySchema = z.object({
  priority: TicketPriorityLevelEnum,
  reason: TicketReasonSchema,
});
export type ChangeTicketPriorityInput = z.infer<typeof ChangeTicketPrioritySchema>;

export type TicketCategory = z.infer<typeof TicketCategoryEnum>;
export type TicketStatus = z.infer<typeof TicketStatusEnum>;
export type TicketPriorityLevel = z.infer<typeof TicketPriorityLevelEnum>;

export type EscalationInitiatorRole = Extract<
  ImplementerRole,
  "FELLOW" | "SUPERVISOR" | "HUB_COORDINATOR" | "CLINICAL_LEAD" | "CLINICAL_TEAM" | "ADMIN"
>;

export const ESCALATION_INITIATOR_ROLES: EscalationInitiatorRole[] = [
  "FELLOW",
  "SUPERVISOR",
  "HUB_COORDINATOR",
  "CLINICAL_LEAD",
  "CLINICAL_TEAM",
  "ADMIN",
];

export function isEscalationInitiatorRole(role: ImplementerRole): role is EscalationInitiatorRole {
  return ESCALATION_INITIATOR_ROLES.includes(role as EscalationInitiatorRole);
}

export type EscalationRecipientRole = Extract<
  ImplementerRole,
  "SUPERVISOR" | "HUB_COORDINATOR" | "ADMIN" | "CLINICAL_LEAD" | "CLINICAL_TEAM"
>;

export const ESCALATION_RECIPIENT_ROLES: EscalationRecipientRole[] = [
  "SUPERVISOR",
  "HUB_COORDINATOR",
  "ADMIN",
  "CLINICAL_LEAD",
  "CLINICAL_TEAM",
];

export type ReassignmentInitiatorRole = Extract<
  ImplementerRole,
  "SUPERVISOR" | "HUB_COORDINATOR" | "ADMIN" | "CLINICAL_LEAD" | "CLINICAL_TEAM"
>;

export const REASSIGNMENT_INITIATOR_ROLES: ReassignmentInitiatorRole[] = [
  "SUPERVISOR",
  "HUB_COORDINATOR",
  "ADMIN",
  "CLINICAL_LEAD",
  "CLINICAL_TEAM",
];

/** Everyone who may receive a ticket from the initiator, the default recipient first. */
export type ListEscalationRecipientsHandler = (
  initiator: {
    userId: string;
    implementerId: string;
    role: EscalationInitiatorRole;
    recipientTeam: AdminTeam;
  },
  q?: Transaction | typeof db,
) => Promise<string[]>;

export const ADMIN_TEAM_FROM_CATEGORY: Record<TicketCategory, AdminTeam> = {
  TECH: "TECH",
  RESEARCH: "RESEARCH",
  OPERATIONS: "OPERATIONS",
  CARE: "CARE",
  CLINICAL: "CARE",
};

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
  CLINICAL_TEAM: (): EscalationRecipientRole => "ADMIN",
  ADMIN: (): EscalationRecipientRole => "ADMIN",
};

/** Who the initiator may also pick, after everyone the routing sends the ticket to by default. */
export const EXTRA_RECIPIENT_ROLES_FROM_INITIATOR: Partial<
  Record<EscalationInitiatorRole, EscalationRecipientRole[]>
> = {
  CLINICAL_LEAD: ["CLINICAL_TEAM"],
};

export interface CreateTicketPayload {
  createdById: string;
  subject: string;
  description: string;
  priority?: TicketPriorityLevel;
  category: TicketCategory;
}

export type CreateTicketInput = Omit<CreateTicketPayload, "createdById"> & { assigneeId: string };

/** Who a new ticket can go to, by category, for the caller. */
export type TicketAssignees = Record<TicketCategory, TicketPerson[]>;

export interface TicketFilters {
  status?: TicketStatus;
  page?: number;
  limit?: number;
}

/** A person on a ticket, named as they are in the ticket's implementer. */
export interface TicketPerson {
  userId: string;
  name: string | null;
  role: ImplementerRole | null;
  /** Set for an admin on a team. */
  team: AdminTeam | null;
}

export interface FullTicket {
  id: string;
  /** The ticket's number, which people quote instead of its id. */
  visibleId: number;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriorityLevel;
  createdAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdBy: TicketPerson;
  holder: TicketPerson;
}

export interface TicketEvent {
  id: string;
  kind: TicketEventKind;
  /** Null for what the system does on its own, such as closing a resolved ticket. */
  actor: TicketPerson | null;
  assignee: TicketPerson | null;
  fromValue: string | null;
  toValue: string | null;
  reason: string | null;
  createdAt: Date;
}

/** What the viewer may do to a ticket, so the page never offers an action that would be refused. */
export interface TicketActions {
  canStart: boolean;
  canChangePriority: boolean;
  canEscalate: boolean;
  canReassign: boolean;
  canResolve: boolean;
  canReopen: boolean;
  canCancel: boolean;
}

export interface TicketDetails {
  viewerId: string;
  /** Who the viewer may escalate or reopen to, the default first; empty when they can do neither. */
  recipients: TicketPerson[];
  /** Who the holder may hand the ticket to at their own tier; empty when they cannot reassign. */
  reassignRecipients: TicketPerson[];
  ticket: FullTicket;
  /** The tickets either side of this one in the list, newest first; only those the viewer holds when they hold this one. */
  previous: { id: string; visibleId: number } | null;
  next: { id: string; visibleId: number } | null;
  events: TicketEvent[];
  actions: TicketActions;
  /** When the creator's chance to reopen a resolved ticket ends, or null when it has none. */
  reopenableUntil: Date | null;
}

export type UserRoleNameMap = Map<
  string,
  { role: ImplementerRole; name: string | null; team: AdminTeam | null } | null
>;

export const ROLE_NAME_CONFIG: { role: ImplementerRole; table: string; column: string }[] = [
  { role: "FELLOW", table: "fellows", column: "fellow_name" },
  { role: "SUPERVISOR", table: "supervisors", column: "supervisor_name" },
  { role: "HUB_COORDINATOR", table: "hub_coordinators", column: "coordinator_name" },
  { role: "CLINICAL_LEAD", table: "clinical_leads", column: "clinical_lead_name" },
  { role: "CLINICAL_TEAM", table: "clinical_teams", column: "name" },
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

export type CreateTicketReassignmentInput = z.infer<typeof CreateTicketReassignmentSchema>;
