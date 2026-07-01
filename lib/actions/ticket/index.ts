"use server";

import { ImplementerRole, Prisma } from "@prisma/client";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { db } from "#/lib/db";
import type { ActionResponse } from "#/types/actions.types";
import {
  type CreateTicketEscalationPayload,
  type CreateTicketInput,
  type CreateTicketPayload,
  ESCALATION_INITIATOR_ROLES,
  ESCALATION_RECIPIENT_FROM_INITIATOR,
  ESCALATION_RECIPIENT_ROLES,
  type EscalationInitiatorRole,
  type EscalationRecipientRole,
  type FetchEscalationRecipientHandler,
  type FetchTicketsHandler,
  type FullTicket,
  type FullTicketPendingTier,
  ROLE_NAME_CONFIG,
  type TicketCategory,
  type TicketEscalation,
  type TicketEscalationStatus,
  type TicketFilters,
  type TicketQueryRole,
  type TicketResolution,
  type UserRoleNameMap,
} from "./types";

export async function createTicket(payload: CreateTicketInput): Promise<ActionResponse> {
  try {
    const {
      userId: createdById,
      role,
      implementerId: activeImplementerId,
    } = await requireAuthRole(ImplementerRole.FELLOW);

    const nextRecipientRole = ESCALATION_RECIPIENT_FROM_INITIATOR[role as EscalationInitiatorRole](
      payload.category,
    );
    const handler = fetchEscalationRecipientHandlers[nextRecipientRole];
    const escalationRecipientId = await handler(createdById, activeImplementerId);

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
          escalatedToId: escalationRecipientId,
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
    const { userId, role, implementerId } = await requireAuthRole(
      ...Object.values(ImplementerRole),
    );

    const queryRole: TicketQueryRole = role === "FELLOW" ? "FELLOW" : "NON_FELLOW";
    const handler = fetchTicketsHandlers[queryRole];

    if (!handler) throw new Error("No handler was found for this role");

    const tickets = await handler(userId, implementerId, filters);

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
    const { userId } = await requireAuthRole();

    const authorized = await db.ticketEscalations.findFirst({
      where: { ticketId, OR: [{ escalatedById: userId }, { escalatedToId: userId }] },
      take: 1,
    });
    if (!authorized) throw new Error("Not authorized to view this ticket's escalations");

    const escalations = await db.ticketEscalations.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });

    if (escalations.length === 0) throw new Error("No escalations were found for this ticket");

    const { orderedEscalations, uniqueRoles } = escalations.reduce<{
      orderedEscalations: TicketEscalation[];
      uniqueRoles: ImplementerRole[];
    }>(
      (acc, escalation, index) => {
        const escalatedByRole = acc.uniqueRoles[acc.uniqueRoles.length - 1] ?? "FELLOW";
        if (!isEscalationInitiatorRole(escalatedByRole))
          throw new Error("The role cannot create escalations");
        const escalatedToRole =
          ESCALATION_RECIPIENT_FROM_INITIATOR[escalatedByRole](ticketCategory);

        acc.orderedEscalations.push({
          ...escalation,
          escOrder: index + 1,
          escalatedByName: null,
          escalatedToName: null,
          escalatedByRole,
          escalatedToRole,
        });

        if (!acc.uniqueRoles.includes(escalatedToRole)) acc.uniqueRoles.push(escalatedToRole);

        return acc;
      },
      { orderedEscalations: [], uniqueRoles: ["FELLOW"] },
    );

    const userIds = Array.from(
      new Set(orderedEscalations.flatMap((e) => [e.escalatedById, e.escalatedToId])),
    );
    const nameMap = await getUserNamesByIdAndRole(userIds, uniqueRoles);

    const mappedEscalations = orderedEscalations.map((escalation) => ({
      ...escalation,
      escalatedByName:
        nameMap.get(`${escalation.escalatedById}:${escalation.escalatedByRole}`) ?? null,
      escalatedToName:
        nameMap.get(`${escalation.escalatedToId}:${escalation.escalatedToRole}`) ?? null,
    }));

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
    const {
      userId,
      role,
      implementerId: activeImplementerId,
    } = await requireAuthRole(...ESCALATION_INITIATOR_ROLES);

    if (!isEscalationInitiatorRole(role)) throw new Error("The role cannot create escalations");
    const nextRecipientRole = ESCALATION_RECIPIENT_FROM_INITIATOR[role](ticketCategory);

    const handler = fetchEscalationRecipientHandlers[nextRecipientRole];
    const escalationRecipientId = await handler(userId, activeImplementerId);

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

export async function resolveTicket(
  ticketId: string,
  resolutionReason: string,
): Promise<ActionResponse> {
  try {
    const { userId } = await requireAuthRole(...ESCALATION_RECIPIENT_ROLES);

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

      if (!latestEscalation) throw new Error("No escalation exists for this ticket");

      if (latestEscalation.ticket.status === "RESOLVED") {
        throw new Error("Ticket is already resolved");
      }

      if (latestEscalation.escalatedToId !== userId) {
        throw new Error("Only the current escalation recipient can resolve this ticket");
      }

      await tx.ticketResolutions.create({
        data: {
          ticketId,
          resolvedById: userId,
          resolutionReason,
        },
      });

      await tx.tickets.update({
        where: { id: ticketId },
        data: { status: "RESOLVED" },
      });
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
    const { userId, role } = await requireAuthRole(...Object.values(ImplementerRole));

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

    if (role === ImplementerRole.ADMIN) {
      return {
        success: true,
        message: "User is admin cannot escalate ticket but only resolve",
        data: { canEscalate: false, isResolved: false },
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

export async function getTicketResolution(
  ticketId: string,
): Promise<ActionResponse<TicketResolution>> {
  try {
    const { userId } = await requireAuthRole();

    const escalationParticipant = await db.ticketEscalations.findFirst({
      where: {
        ticketId,
        OR: [{ escalatedById: userId }, { escalatedToId: userId }],
      },
      take: 1,
    });

    if (!escalationParticipant)
      throw new Error("You are not authorized to view this ticket's resolution");

    const resolution = await db.ticketResolutions.findFirst({
      where: { ticketId },
      include: {
        resolvedByUser: {
          include: {
            memberships: {
              select: { role: true },
            },
          },
        },
      },
    });

    if (!resolution) throw new Error("No memberships found for this role");

    const resolvedByRole = resolution.resolvedByUser?.memberships?.[0]?.role ?? null;

    return {
      success: true,
      message: "Resolution retrieved successfully",
      data: {
        id: resolution.id,
        ticketId: resolution.ticketId,
        resolvedById: resolution.resolvedById,
        resolvedByRole,
        resolutionReason: resolution.resolutionReason,
        createdAt: resolution.createdAt,
      },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

function isEscalationInitiatorRole(role: ImplementerRole): role is EscalationInitiatorRole {
  return ESCALATION_INITIATOR_ROLES.includes(role as EscalationInitiatorRole);
}

const fetchTicketsHandlers: Record<TicketQueryRole, FetchTicketsHandler> = {
  FELLOW: async (userId, implementerId, filters) => {
    const rows = await db.$queryRaw<FullTicketPendingTier[]>`
      SELECT DISTINCT ON (t.id)
        t.id,
        t.subject,
        t.description,
        t.category,
        t.status,
        t.priority,
        t.created_at AS "createdAt",
        latest_e.escalated_to AS "currentRecipientId"
      FROM "tickets" t
      LEFT JOIN LATERAL (
        SELECT e.escalated_to
        FROM "ticket_escalations" e
        WHERE e.ticket_id = t.id
        ORDER BY e.created_at DESC
        LIMIT 1
      ) latest_e ON true
      WHERE t.created_by = ${userId}
      ${filters.status ? Prisma.sql`AND t.status = ${filters.status}` : Prisma.empty}
      ORDER BY t.id
    `;

    const roleMap = await getRoleFromUserIdMap(
      rows.map((r) => r.currentRecipientId).filter((id): id is string => !!id),
      implementerId,
    );

    return rows.map((row) => ({
      ...row,
      currentTier: row.currentRecipientId ? (roleMap.get(row.currentRecipientId) ?? null) : null,
    }));
  },

  NON_FELLOW: async (userId, implementerId, filters) => {
    const rows = await db.$queryRaw<FullTicketPendingTier[]>`
      SELECT DISTINCT ON (t.id)
        t.id,
        t.subject,
        t.description,
        t.category,
        t.status,
        t.priority,
        t.created_at AS "createdAt",
        latest_e.escalated_to AS "currentRecipientId"
      FROM "tickets" t
      JOIN "ticket_escalations" e ON t.id = e.ticket_id
      JOIN LATERAL (
        SELECT e2.escalated_to
        FROM "ticket_escalations" e2
        WHERE e2.ticket_id = t.id
        ORDER BY e2.created_at DESC
        LIMIT 1
      ) latest_e ON true
      WHERE e.escalated_to = ${userId}
      ${filters.status ? Prisma.sql`AND t.status = ${filters.status}` : Prisma.empty}
      ORDER BY t.id, e.created_at DESC
    `;

    const roleMap = await getRoleFromUserIdMap(
      rows.map((r) => r.currentRecipientId).filter((id): id is string => !!id),
      implementerId,
    );

    return rows.map((row) => ({
      ...row,
      currentTier: row.currentRecipientId ? (roleMap.get(row.currentRecipientId) ?? null) : null,
    }));
  },
};

async function getRoleFromUserIdMap(
  userIds: string[],
  implementerId: string,
): Promise<Map<string, ImplementerRole>> {
  if (userIds.length === 0) return new Map();

  const rows = await db.implementerMember.findMany({
    where: { implementerId, userId: { in: userIds } },
    select: { userId: true, role: true },
  });
  return new Map(rows.map((row) => [row.userId, row.role]));
}

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

    const supervisorUserId = result[0]?.supervisor_user_id;
    if (!supervisorUserId) throw new Error("No supervisor found for this fellow");

    return supervisorUserId;
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

    const hubCoordinatorUserId = result[0]?.hub_coordinator_user_id;
    if (!hubCoordinatorUserId) throw new Error("No hub coordinator found for this supervisor");

    return hubCoordinatorUserId;
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

    const clinicalLeadUserId = result[0]?.clinical_lead_user_id;
    if (!clinicalLeadUserId) throw new Error("No clinical lead found for this supervisor");

    return clinicalLeadUserId;
  },
  ADMIN: async () => {
    const adminUsers = await db.adminUser.findMany({
      orderBy: { createdAt: "desc" },
    });

    const adminMemberships = await db.implementerMember.findMany({
      where: {
        role: "ADMIN",
        identifier: { in: adminUsers.map((a) => a.id) },
      },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    const adminUserId = adminMemberships[0]?.userId;
    if (!adminUserId) throw new Error("No admin user found");

    return adminUserId;
  },
};

async function getUserNamesByIdAndRole(
  userIds: string[],
  roles: ImplementerRole[] = [],
): Promise<UserRoleNameMap> {
  const result: UserRoleNameMap = new Map();
  if (userIds.length === 0) return result;

  const activeConfigs =
    roles.length > 0
      ? ROLE_NAME_CONFIG.filter((config) => roles.includes(config.role))
      : ROLE_NAME_CONFIG;

  const coalesceSql = activeConfigs.map((c) => `${c.table}.${c.column}`).join(", ");
  const joinsSql = activeConfigs
    .map(
      (c) =>
        `LEFT JOIN ${c.table} ON ${c.table}.id = im.identifier AND im.role = '${c.role}'::implementer_roles`,
    )
    .join("\n");

  const rows = await db.$queryRaw<
    { user_id: string; role: ImplementerRole; name: string | null }[]
  >`
    SELECT
      im.user_id,
      im.role::text AS role,
      COALESCE(${Prisma.raw(coalesceSql)}) AS name
    FROM implementer_members im
    ${Prisma.raw(joinsSql)}
    WHERE im.user_id = ANY(${userIds}::text[])
  `;

  for (const row of rows) {
    result.set(`${row.user_id}:${row.role}`, row.name);
  }

  return result;
}
