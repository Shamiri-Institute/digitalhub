"use server";

import { ImplementerRole, Prisma } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";
import type { ActionResponse } from "#/types/actions.types";
import type {
  CreateTicketInput,
  CreateTicketPayload,
  FullTicket,
  TicketEscalation,
  TicketFilters,
  TicketHandler,
} from "./types";

export async function createTicket(payload: CreateTicketInput): Promise<ActionResponse> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    const createdById = session.user.id;
    const activeImplementerId = session.user.activeMembership?.implementerId;

    if (!activeImplementerId) {
      throw new Error("No active implementer found for user");
    }

    const supervisorResult = await db.$queryRaw<{ supervisor_user_id: string }[]>`
      SELECT sup_member.user_id as supervisor_user_id
      FROM implementer_members fellow_member
      JOIN fellows f ON f.id = fellow_member.identifier
      JOIN implementer_members sup_member ON sup_member.identifier = f.supervisor_id
        AND sup_member.role = 'SUPERVISOR'
      WHERE fellow_member.user_id = ${createdById}
        AND fellow_member.role = 'FELLOW'
        AND fellow_member.implementer_id = ${activeImplementerId}
    `;

    const firstResult = supervisorResult[0];
    if (!firstResult || !firstResult.supervisor_user_id) {
      throw new Error("Unable to resolve supervisor for your account");
    }

    const supervisorUserId = firstResult.supervisor_user_id;

    const ticketPayload: CreateTicketPayload = {
      ...payload,
      createdById,
    };

    await db.$transaction(async (transaction) => {
      const ticket = await transaction.tickets.create({
        data: ticketPayload,
      });

      await transaction.ticketEscalations.create({
        data: {
          ticketId: ticket.id,
          escalatedById: createdById,
          escalatedToId: supervisorUserId,
          escalationReason: ticketPayload.description,
        },
      });

      await transaction.tickets.update({
        where: { id: ticket.id },
        data: { status: "ESCALATED" },
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
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    const role: ImplementerRole | null = session.user.activeMembership?.role ?? null;

    if (!role) throw new Error("No role exists for this user");
    const handler = ticketHandlers[role];

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

const ticketHandlers: Record<string, TicketHandler> = {
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
      ORDER BY t.created_at DESC
    `;
  },
};

export async function getEscalationsPerTicket(
  ticketId: string,
): Promise<ActionResponse<TicketEscalation[]>> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    const userId = session.user.id;

    const escalations = await db.$queryRaw<
      {
        id: string;
        ticketId: string;
        escalatedById: string;
        escalatedToId: string;
        escalationReason: string;
        createdAt: Date;
        escalatedByName: string | null;
        escalatedToName: string | null;
        escalatedByRole: string | null;
        escalatedToRole: string | null;
      }[]
    >`
      SELECT
        te.id,
        te.ticket_id AS "ticketId",
        te.escalated_by AS "escalatedById",
        te.escalated_to AS "escalatedToId",
        te.escalation_reason AS "escalationReason",
        te.created_at AS "createdAt",
        COALESCE(f.fellow_name, s.supervisor_name, u.name) AS "escalatedByName",
        COALESCE(f2.fellow_name, s2.supervisor_name, u2.name) AS "escalatedToName",
        im_by.role AS "escalatedByRole",
        im_to.role AS "escalatedToRole"
      FROM ticket_escalations te
      JOIN tickets t ON t.id = te.ticket_id
      LEFT JOIN implementer_members im_by ON im_by.user_id = te.escalated_by
      LEFT JOIN implementer_members im_to ON im_to.user_id = te.escalated_to
      LEFT JOIN fellows f ON f.id = im_by.identifier AND im_by.role = 'FELLOW'
      LEFT JOIN supervisors s ON s.id = im_by.identifier AND im_by.role = 'SUPERVISOR'
      LEFT JOIN fellows f2 ON f2.id = im_to.identifier AND im_to.role = 'FELLOW'
      LEFT JOIN supervisors s2 ON s2.id = im_to.identifier AND im_to.role = 'SUPERVISOR'
      LEFT JOIN users u ON u.id = te.escalated_by
      LEFT JOIN users u2 ON u2.id = te.escalated_to
      WHERE te.ticket_id = ${ticketId}
        AND t.created_by = ${userId}
      ORDER BY te.created_at DESC
    `;

    const mappedEscalations: TicketEscalation[] = escalations.map((escalation) => ({
      id: escalation.id,
      ticketId: escalation.ticketId,
      escalatedById: escalation.escalatedById,
      escalatedToId: escalation.escalatedToId,
      escalationReason: escalation.escalationReason,
      createdAt: escalation.createdAt,
      escalatedBy: {
        id: escalation.escalatedById,
        name: escalation.escalatedByName,
        role: (escalation.escalatedByRole as ImplementerRole) ?? "FELLOW",
      },
      escalatedTo: {
        id: escalation.escalatedToId,
        name: escalation.escalatedToName,
        role: (escalation.escalatedToRole as ImplementerRole) ?? "SUPERVISOR",
      },
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
