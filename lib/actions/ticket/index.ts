"use server";

import { ImplementerRole, Prisma } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";
import type { ActionResponse } from "#/types/actions.types";
import {
  type CreateTicketEscalationPayload,
  type CreateTicketInput,
  type CreateTicketPayload,
  ESCALATION_INITIATOR_ROLES,
  ESCALATION_RECIPIENT_FROM_CATEGORY,
  ESCALATION_RECIPIENT_FROM_INITIATOR,
  ESCALATION_RECIPIENT_ROLES,
  type EscalationCount,
  type EscalationInitiatorRole,
  type EscalationRecipientRole,
  type FetchEscalationMappingHandler,
  type FetchEscalationRecipientHandler,
  type FetchTicketsHandler,
  type FullTicket,
  IMPLEMENTER_ROLE_TABLE_LOOKUP,
  type OrderedEscalation,
  type TicketCategory,
  type TicketEscalation,
  type TicketEscalationStatus,
  type TicketFilters,
  type TicketQueryRole,
} from "./types";

export async function createTicket(payload: CreateTicketInput): Promise<ActionResponse> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    const createdById = session.user.id;
    const activeImplementerId = session.user.activeMembership?.implementerId;

    if (!activeImplementerId) throw new Error("No active implementer found for user");

    const handler = fetchEscalationRecipientHandlers["SUPERVISOR"];
    const supervisorUserId = await handler(createdById, activeImplementerId);
    if (!supervisorUserId) throw new Error("Unable to resolve supervisor for your account");

    const ticketPayload: CreateTicketPayload = {
      ...payload,
      createdById,
    };

    await db.$transaction(async (transaction) => {
      const ticket = await transaction.tickets.create({
        data: { ...ticketPayload, status: "ESCALATED" },
      });

      await transaction.ticketEscalations.create({
        data: {
          ticketId: ticket.id,
          escalatedById: createdById,
          escalatedToId: supervisorUserId,
          escalationReason: ticketPayload.description,
        },
      });
    });

    return { success: true, message: "Successfully created ticket" };
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getAllTickets(filters: TicketFilters): Promise<ActionResponse<FullTicket[]>> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id) throw new Error("The session has not been authenticated");

    const role: ImplementerRole | null = session.user.activeMembership?.role ?? null;

    if (!role) throw new Error("No role exists for this user");
    const queryRole: TicketQueryRole = role === "FELLOW" ? "FELLOW" : "NON_FELLOW";
    const handler = fetchTicketsHandlers[queryRole];

    if (!handler) throw new Error("No handler was found for this role");
    const activeImplementerId = session.user.activeMembership?.implementerId;
    const tickets = await handler(session.user.id, activeImplementerId ?? "", filters);

    const response: ActionResponse<FullTicket[]> = {
      success: true,
      message: "successfully fetched tickets",
      data: tickets,
    };

    return response;
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getEscalationsPerTicket(
  ticketId: string,
  ticketCategory: TicketCategory,
): Promise<ActionResponse<TicketEscalation[]>> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id) throw new Error("The session has not been authenticated");

    const activeImplementerId = session.user.activeMembership?.implementerId;
    if (!activeImplementerId) throw new Error("No active implementer found");

    const escalations = await db.ticketEscalations.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });

    if (escalations.length === 0) throw new Error("No escalations exist for this ticket");

    const escalationsCount = escalations.length;
    if (!isValidEscalationCount(escalationsCount)) {
      throw new Error("Unsupported escalation count");
    }

    const orderedEscalations: OrderedEscalation[] = escalations.map((escalation, index) => ({
      ...escalation,
      escOrder: index + 1,
    }));

    const handler = fetchEscalationMappingHandlers[escalationsCount];
    const mappedEscalations = await handler(orderedEscalations, ticketCategory);

    return {
      success: true,
      message: "Successfully fetched escalations",
      data: mappedEscalations,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function createEscalation(
  ticketId: string,
  escalationReason: string,
  ticketCategory: TicketCategory,
): Promise<ActionResponse> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id) throw new Error("The session has not been authenticated");
    const userId = session.user.id;

    const activeImplementerId = session.user.activeMembership?.implementerId;
    if (!activeImplementerId) throw new Error("No active implementer found for user");

    const sessionRole = session.user.activeMembership?.role;
    if (!sessionRole) throw new Error("No role was found for this user");

    if (!isEscalationInitiatorRole(sessionRole))
      throw new Error("The role cannot create escalations");
    const role =
      ESCALATION_RECIPIENT_FROM_INITIATOR[sessionRole as EscalationInitiatorRole](ticketCategory);

    const handler = fetchEscalationRecipientHandlers[role];
    const escalationRecipientId = await handler(userId, activeImplementerId);
    if (!escalationRecipientId) throw new Error("No escalation recipient was found");

    const escalationData: CreateTicketEscalationPayload = {
      escalatedById: userId,
      escalatedToId: escalationRecipientId,
      ticketId,
      escalationReason,
    };

    await db.$transaction(async (tx) => {
      const latestEscalation = await tx.ticketEscalations.findFirst({
        where: { ticketId },
        orderBy: { createdAt: "desc" },
        include: {
          ticket: {
            select: { status: true },
          },
        },
      });

      if (!latestEscalation) {
        throw new Error("No escalation exists for this ticket");
      }

      if (latestEscalation.ticket.status === "RESOLVED") {
        throw new Error("Cannot escalate a resolved ticket");
      }

      if (latestEscalation.escalatedToId !== userId) {
        throw new Error("You are not the current escalation recipient of this ticket");
      }

      await tx.ticketEscalations.create({ data: escalationData });

      await tx.tickets.update({
        where: { id: ticketId },
        data: { status: "ESCALATED" },
      });
    });

    return { success: true, message: "Escalation created successfully" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function resolveTicket(ticketId: string): Promise<ActionResponse> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id) throw new Error("The session has not been authenticated");

    const userId = session.user.id;
    const userRole = session.user.activeMembership?.role;

    if (!userRole || !ESCALATION_RECIPIENT_ROLES.includes(userRole as EscalationRecipientRole)) {
      throw new Error("Only escalation recipients can resolve tickets");
    }

    const latestEscalation = await db.ticketEscalations.findFirst({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
      include: {
        ticket: {
          select: { status: true },
        },
      },
    });

    if (!latestEscalation) throw new Error("No escalation exists for this ticket");

    if (latestEscalation.ticket.status === "RESOLVED") {
      throw new Error("Ticket is already resolved");
    }

    if (latestEscalation.escalatedToId !== userId) {
      throw new Error("Only the current escalation recipient can resolve this ticket");
    }

    await db.tickets.update({
      where: { id: ticketId },
      data: { status: "RESOLVED" },
    });

    return { success: true, message: "Ticket resolved successfully" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getTicketEscalationStatus(
  ticketId: string,
): Promise<ActionResponse<TicketEscalationStatus>> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id) throw new Error("Not authenticated");

    const userId = session.user.id;

    const ticket = await db.tickets.findUnique({
      where: { id: ticketId },
      select: { status: true },
    });

    if (!ticket) throw new Error("Ticket not found");

    if (ticket.status === "RESOLVED") {
      return {
        success: true,
        message: "Ticket status retrieved",
        data: { canEscalate: false, isResolved: true, reason: "Ticket has already been resolved" },
      };
    }

    const existingEscalation = await db.ticketEscalations.findFirst({
      where: { escalatedById: userId, ticketId },
    });

    if (existingEscalation) {
      return {
        success: true,
        message: "Ticket escalation status retrieved",
        data: {
          canEscalate: false,
          isResolved: false,
          reason: "You have already escalated this ticket",
        },
      };
    }

    return {
      success: true,
      message: "Ticket escalation status retrieved",
      data: { canEscalate: true, isResolved: false },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

function isEscalationInitiatorRole(role: ImplementerRole): boolean {
  if (!ESCALATION_INITIATOR_ROLES.includes(role as EscalationInitiatorRole)) return false;
  return true;
}

const fetchTicketsHandlers: Record<TicketQueryRole, FetchTicketsHandler> = {
  FELLOW: async (userId, implementerId, filters) => {
    return await db.$queryRaw<FullTicket[]>`
      SELECT DISTINCT ON (t.id)
        t.id,
        t.subject,
        t.description,
        t.category,
        t.status,
        t.priority,
        t.created_at AS "createdAt",
        im_tier.role AS "currentTier"
      FROM "tickets" t
      JOIN "implementer_members" im_creator ON t.created_by = im_creator.user_id
        AND im_creator.implementer_id = ${implementerId}
        AND im_creator.role = 'FELLOW'
      LEFT JOIN "ticket_escalations" e ON t.id = e.ticket_id
      LEFT JOIN "implementer_members" im_tier ON e.escalated_to = im_tier.user_id
        AND im_tier.implementer_id = ${implementerId}
      WHERE t.created_by = ${userId}
      ${filters.status ? Prisma.sql`AND t.status = ${filters.status}` : Prisma.empty}
      ORDER BY t.id, e.created_at DESC
    `;
  },
  NON_FELLOW: async (userId, implementerId, filters) => {
    return await db.$queryRaw<FullTicket[]>`
      SELECT DISTINCT ON (t.id)
        t.id,
        t.subject,
        t.description,
        t.category,
        t.status,
        t.priority,
        t.created_at AS "createdAt",
        im_tier.role AS "currentTier"
      FROM "tickets" t
      JOIN "ticket_escalations" e ON t.id = e.ticket_id
      JOIN "implementer_members" im_tier ON e.escalated_to = im_tier.user_id
        AND im_tier.implementer_id = ${implementerId}
      WHERE e.escalated_to = ${userId}
      ${filters.status ? Prisma.sql`AND t.status = ${filters.status}` : Prisma.empty}
      ORDER BY t.id, e.created_at DESC
    `;
  },
};

const fetchEscalationRecipientHandlers: Record<
  EscalationRecipientRole,
  FetchEscalationRecipientHandler
> = {
  SUPERVISOR: async (userId) => {
    const result = await db.$queryRaw<{ supervisor_user_id: string }[]>`
      SELECT im2.user_id AS supervisor_user_id
      FROM implementer_members im1
      JOIN fellows f ON f.id = im1.identifier
      JOIN supervisors s ON s.id = f.supervisor_id
      JOIN implementer_members im2 ON im2.identifier = s.id
      WHERE im1.user_id = ${userId}
        AND im1.role = 'FELLOW'
        AND im2.role = 'SUPERVISOR'
      LIMIT 1;
    `;

    return result[0]?.supervisor_user_id ?? null;
  },
  HUB_COORDINATOR: async (userId, implementerId) => {
    const result = await db.$queryRaw<{ hub_coordinator_user_id: string }[]>`
      SELECT hc_member.user_id as hub_coordinator_user_id
      FROM implementer_members sup_member
      JOIN supervisors s ON s.id = sup_member.identifier
      JOIN hubs h ON h.id = s.hub_id
      JOIN hub_coordinators hc ON hc.assigned_hub_id = h.id
      JOIN implementer_members hc_member
        ON hc_member.identifier = hc.id
        AND hc_member.role = 'HUB_COORDINATOR'
      WHERE sup_member.user_id = ${userId}
        AND sup_member.role = 'SUPERVISOR'
        AND sup_member.implementer_id = ${implementerId}
      LIMIT 1
    `;

    return result[0]?.hub_coordinator_user_id ?? null;
  },
  CLINICAL_LEAD: async (userId, implementerId) => {
    const result = await db.$queryRaw<{ clinical_lead_user_id: string }[]>`
      SELECT cl_member.user_id as clinical_lead_user_id
      FROM implementer_members sup_member
      JOIN supervisors s ON s.id = sup_member.identifier
      JOIN hubs h ON h.id = s.hub_id
      JOIN clinical_leads cl ON cl.assigned_hub_id = h.id
      JOIN implementer_members cl_member
        ON cl_member.identifier = cl.id
        AND cl_member.role = 'CLINICAL_LEAD'::implementer_roles
      WHERE sup_member.user_id = ${userId}
        AND sup_member.role = 'SUPERVISOR'::implementer_roles
        AND sup_member.implementer_id = ${implementerId}
      LIMIT 1
    `;

    return result[0]?.clinical_lead_user_id ?? null;
  },
  ADMIN: async () => {
    const result = await db.implementerMember.findFirst({
      where: { role: "ADMIN" },
      select: { userId: true },
      orderBy: { createdAt: "desc" },
    });

    return result?.userId ?? null;
  },
};

function isValidEscalationCount(count: number): count is EscalationCount {
  return count === 1 || count === 2;
}

const fetchEscalationMappingHandlers: Record<EscalationCount, FetchEscalationMappingHandler> = {
  1: async (orderedEscalations) => {
    const firstEscalation = orderedEscalations.find((esc) => esc.escOrder === 1);
    if (!firstEscalation?.escalatedById || !firstEscalation?.escalatedToId) {
      throw new Error("Escalator or recipient ID is missing");
    }

    const result = await db.$queryRaw<
      { fellow_name: string | null; supervisor_name: string | null }[]
    >`
      SELECT
        f.fellow_name,
        s.supervisor_name
      FROM implementer_members im_fellow
      CROSS JOIN implementer_members im_supervisor
      LEFT JOIN fellows f ON f.id = im_fellow.identifier
      LEFT JOIN supervisors s ON s.id = im_supervisor.identifier
      WHERE im_fellow.user_id = ${firstEscalation.escalatedById}
        AND im_fellow.role = 'FELLOW'
        AND im_supervisor.user_id = ${firstEscalation.escalatedToId}
        AND im_supervisor.role = 'SUPERVISOR'
      LIMIT 1
    `;

    const { fellow_name, supervisor_name } = result[0] ?? {};

    if (!fellow_name || !supervisor_name) {
      throw new Error("Fellow or supervisor name not found");
    }

    return [
      {
        ...firstEscalation,
        escalatedByName: fellow_name,
        escalatedByRole: "FELLOW",
        escalatedToName: supervisor_name,
        escalatedToRole: "SUPERVISOR",
      },
    ];
  },
  2: async (orderedEscalations, ticketCategory) => {
    const firstEscalation = orderedEscalations.find((esc) => esc.escOrder === 1);
    const secondEscalation = orderedEscalations.find((esc) => esc.escOrder === 2);

    if (
      !firstEscalation?.escalatedById ||
      !firstEscalation?.escalatedToId ||
      !secondEscalation?.escalatedToId
    ) {
      throw new Error("Escalation data is missing");
    }

    const recipientRole = ESCALATION_RECIPIENT_FROM_CATEGORY[ticketCategory];
    const names = await getEscalationUserNames(
      firstEscalation.escalatedById,
      firstEscalation.escalatedToId,
      secondEscalation.escalatedToId,
      recipientRole,
    );

    return [
      {
        ...firstEscalation,
        escalatedByName: names.fellowName,
        escalatedByRole: "FELLOW",
        escalatedToName: names.supervisorName,
        escalatedToRole: "SUPERVISOR",
      },
      {
        ...secondEscalation,
        escalatedByName: names.supervisorName,
        escalatedByRole: "SUPERVISOR",
        escalatedToName: names.thirdName,
        escalatedToRole: recipientRole,
      },
    ];
  },
};

async function getEscalationUserNames(
  fellowUserId: string,
  supervisorUserId: string,
  thirdUserId: string,
  recipientRole: EscalationRecipientRole,
): Promise<{ fellowName: string; supervisorName: string; thirdName: string }> {
  const lookup = IMPLEMENTER_ROLE_TABLE_LOOKUP[recipientRole];

  const result = await db.$queryRaw<
    {
      fellow_name: string | null;
      supervisor_name: string | null;
      third_name: string | null;
    }[]
  >`
    SELECT
      f.fellow_name,
      s.supervisor_name,
      ${Prisma.raw(`t.${lookup.nameColumn}`)} AS third_name
    FROM implementer_members im_fellow
    CROSS JOIN implementer_members im_supervisor
    CROSS JOIN implementer_members im_third
    LEFT JOIN fellows f ON f.id = im_fellow.identifier
    LEFT JOIN supervisors s ON s.id = im_supervisor.identifier
    LEFT JOIN ${Prisma.raw(lookup.table)} t
      ON t.id = im_third.identifier
      AND im_third.role = ${Prisma.sql`${lookup.role}::implementer_roles`}
    WHERE im_fellow.user_id = ${fellowUserId}
      AND im_fellow.role = 'FELLOW'::implementer_roles
      AND im_supervisor.user_id = ${supervisorUserId}
      AND im_supervisor.role = 'SUPERVISOR'::implementer_roles
      AND im_third.user_id = ${thirdUserId}
      AND im_third.role = ${Prisma.sql`${lookup.role}::implementer_roles`}
    LIMIT 1
  `;

  const { fellow_name, supervisor_name, third_name } = result[0] ?? {};

  if (!fellow_name || !supervisor_name || !third_name) {
    throw new Error("Could not resolve all escalation user names");
  }

  return {
    fellowName: fellow_name,
    supervisorName: supervisor_name,
    thirdName: third_name,
  };
}
