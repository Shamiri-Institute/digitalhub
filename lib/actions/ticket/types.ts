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

export type TicketQueryRole = "FELLOW" | "NON_FELLOW";

export type FetchTicketsHandler = (
  userId: string,
  implementerId: string,
  filters: TicketFilters,
) => Promise<FullTicket[]>;

export type FetchEscalationRecipientHandler = (
  userId: string,
  implementerId: string,
) => Promise<string | null>;

export type EscalationCount = 1 | 2 | 3;

export type FetchEscalationMappingHandler = (
  orderedEscalations: OrderedEscalation[],
  ticketCategory: TicketCategory,
) => Promise<TicketEscalation[]>;

export const ESCALATION_RECIPIENT_FROM_CATEGORY: Record<TicketCategory, EscalationRecipientRole> = {
  TECH: "HUB_COORDINATOR",
  RESEARCH: "HUB_COORDINATOR",
  OPERATIONS: "HUB_COORDINATOR",
  CARE: "ADMIN",
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

export const IMPLEMENTER_ROLE_TABLE_LOOKUP: Record<
  ImplementerRole,
  { role: ImplementerRole; table: string; nameColumn: string }
> = {
  SUPERVISOR: { role: "SUPERVISOR", table: "supervisors", nameColumn: "supervisor_name" },
  HUB_COORDINATOR: {
    role: "HUB_COORDINATOR",
    table: "hub_coordinators",
    nameColumn: "coordinator_name",
  },
  ADMIN: { role: "ADMIN", table: "admin_users", nameColumn: "name" },
  CLINICAL_LEAD: {
    role: "CLINICAL_LEAD",
    table: "clinical_leads",
    nameColumn: "clinical_lead_name",
  },
  FELLOW: { role: "FELLOW", table: "fellows", nameColumn: "fellow_name" },
  OPERATIONS: { role: "OPERATIONS", table: "ops_users", nameColumn: "name" },
  CLINICAL_TEAM: { role: "CLINICAL_TEAM", table: "clinical_teams", nameColumn: "name" },
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

export type FullTicketPayload = CreateTicketPayload &
  Omit<CreateTicketEscalationPayload, "ticketId" | "escalatedById">;

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

export interface TicketEscalation {
  id: string;
  ticketId: string;
  escalatedById: string;
  escalatedToId: string;
  escalationReason: string;
  escOrder?: number;
  createdAt: Date;
  escalatedByName: string | null;
  escalatedToName: string | null;
  escalatedByRole: EscalationInitiatorRole;
  escalatedToRole: EscalationRecipientRole;
}

export type OrderedEscalation = Omit<
  TicketEscalation,
  "escalatedByName" | "escalatedToName" | "escalatedByRole" | "escalatedToRole"
>;

export interface TicketEscalationStatus {
  canEscalate: boolean;
  isResolved: boolean;
  reason?: string;
}

export interface TicketResolution {
  id: string;
  ticketId: string;
  resolvedById: string;
  resolvedByRole: string | null;
  resolutionReason: string;
  createdAt: Date;
}

export interface TicketResolutionPayload {
  ticketId: string;
  resolvedById: string;
  resolutionReason: string;
}
