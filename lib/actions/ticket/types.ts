import type { ImplementerRole } from "@prisma/client";
import { z } from "zod";
import { stringValidation } from "#/lib/utils";

export const TicketCategoryEnum = z.enum(["TECH", "RESEARCH", "OPERATIONS", "CARE", "CLINICAL"]);
export const TicketStatusEnum = z.enum(["OPEN", "ESCALATED", "RESOLVED", "CANCELLED"]);
export const TicketPriorityLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const CreateTicketSchema = z.object({
  subject: stringValidation("Subject is required"),
  description: stringValidation("Description is required"),
  category: TicketCategoryEnum,
  priority: TicketPriorityLevelEnum.default("MEDIUM"),
});

export type TicketCategory = z.infer<typeof TicketCategoryEnum>;
export type TicketStatus = z.infer<typeof TicketStatusEnum>;
export type TicketPriorityLevel = z.infer<typeof TicketPriorityLevelEnum>;

export const CATEGORY_ROLE_MAP: Record<TicketCategory, ImplementerRole> = {
  TECH: "HUB_COORDINATOR", // Data Lead
  RESEARCH: "HUB_COORDINATOR", // Data Lead
  OPERATIONS: "HUB_COORDINATOR", // OPS lead
  CARE: "ADMIN",
  CLINICAL: "CLINICAL_LEAD",
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

export type TicketHandler = (
  userId: string,
  implementerId: string,
  filters: TicketFilters,
) => Promise<FullTicket[]>;

export interface EscalationUser {
  id: string;
  name: string | null;
  role: ImplementerRole;
}

export interface TicketEscalation {
  id: string;
  ticketId: string;
  escalatedById: string;
  escalatedToId: string;
  escalationReason: string;
  createdAt: Date;
  escalatedBy: EscalationUser;
  escalatedTo: EscalationUser;
}
