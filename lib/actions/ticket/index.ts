"use server";

import { and, asc, desc, eq, exists, inArray, isNull, or, sql } from "drizzle-orm";

import { db, type Transaction } from "#/db/client";
import { ImplementerRole, type TicketStatus } from "#/db/enums";
import {
  adminUser,
  clinicalLead,
  hubCoordinator,
  implementerMember,
  ticketEvents,
  tickets,
} from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import type { ActionResponse } from "#/types/actions.types";
import {
  type CreateTicketInput,
  type CreateTicketPayload,
  type CreateTicketReassignmentInput,
  CreateTicketSchema,
  CreateTicketReassignmentSchema,
  ESCALATION_INITIATOR_ROLES,
  ESCALATION_RECIPIENT_FROM_INITIATOR,
  ESCALATION_RECIPIENT_ROLES,
  type EscalationInitiatorRole,
  type EscalationRecipientRole,
  type FetchEscalationRecipientHandler,
  type FullTicket,
  type FullTicketReassignment,
  isEscalationInitiatorRole,
  REASSIGNMENT_INITIATOR_ROLES,
  type ReassignmentInitiatorRole,
  ROLE_NAME_CONFIG,
  type TicketEscalation,
  type TicketEscalationStatus,
  type TicketFilters,
  type TicketResolution,
  type UserRoleNameMap,
} from "./types";

export async function createTicket(payload: CreateTicketInput): Promise<ActionResponse> {
  try {
    const {
      userId: createdById,
      role,
      implementerId: activeImplementerId,
    } = await requireAuthRole(...ESCALATION_INITIATOR_ROLES);

    if (!isEscalationInitiatorRole(role)) throw new Error("The role cannot create tickets");

    const ticketFields = CreateTicketSchema.parse(payload);
    const nextRecipientRole = ESCALATION_RECIPIENT_FROM_INITIATOR[role](ticketFields.category);
    const handler = fetchEscalationRecipientHandlers[nextRecipientRole];
    const escalationRecipientId = await handler({
      userId: createdById,
      implementerId: activeImplementerId,
    });

    const ticketPayload: CreateTicketPayload = { ...ticketFields, createdById };

    await db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(tickets)
        .values({ ...ticketPayload, holderId: escalationRecipientId, status: "ESCALATED" })
        .returning({ id: tickets.id });
      if (!ticket) throw new Error("Ticket insert returned no row");

      await tx.insert(ticketEvents).values({
        ticketId: ticket.id,
        kind: "CREATED",
        actorId: createdById,
        assigneeId: escalationRecipientId,
        reason: ticketPayload.description,
      });
    });

    return { success: true, message: "Successfully created ticket" };
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getAllTickets(filters: TicketFilters): Promise<ActionResponse<FullTicket[]>> {
  try {
    const { userId, implementerId } = await requireAuthRole(...Object.values(ImplementerRole));

    const tickets = await fetchTicketsForUser(userId, implementerId, filters);

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

/** The view permission: the user raised the ticket, or acted on it or was handed it at some point. */
function canViewTicket(userId: string) {
  return or(
    eq(tickets.createdById, userId),
    exists(
      db
        .select({ id: ticketEvents.id })
        .from(ticketEvents)
        .where(
          and(
            eq(ticketEvents.ticketId, tickets.id),
            or(eq(ticketEvents.actorId, userId), eq(ticketEvents.assigneeId, userId)),
          ),
        ),
    ),
  );
}

async function findViewableTicket(ticketId: string, userId: string) {
  const [ticket] = await db
    .select({ status: tickets.status, holderId: tickets.holderId })
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), canViewTicket(userId)));
  return ticket;
}

export async function getEscalationsPerTicket(
  ticketId: string,
): Promise<ActionResponse<TicketEscalation[]>> {
  try {
    const { userId, implementerId } = await requireAuthRole(...Object.values(ImplementerRole));

    const authorized = await findViewableTicket(ticketId, userId);
    if (!authorized) throw new Error("Not authorized to view this ticket's escalations");

    const escalations = await readHandovers(ticketId, ["CREATED", "ESCALATED"]);
    if (escalations.length === 0) throw new Error("No escalations were found for this ticket");

    const nameMap = await getUserNamesAndRolesById(
      Array.from(new Set(escalations.flatMap((e) => [e.actorId, e.assigneeId]))),
      implementerId,
    );

    const mappedEscalations: TicketEscalation[] = escalations.map(
      (escalation): TicketEscalation => {
        const escalatedBy = nameMap.get(escalation.actorId);
        const escalatedTo = nameMap.get(escalation.assigneeId);

        return {
          id: escalation.id,
          escalationReason: escalation.reason,
          createdAt: escalation.createdAt,
          escalatedByName: escalatedBy?.name ?? "",
          escalatedToName: escalatedTo?.name ?? "",
          escalatedByRole: escalatedBy?.role as EscalationInitiatorRole,
          escalatedToRole: escalatedTo?.role as EscalationRecipientRole,
        };
      },
    );

    return {
      success: true,
      message: "Successfully fetched escalations",
      data: mappedEscalations,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Events that hand the ticket to someone, which always carry an assignee and a reason. */
async function readHandovers(ticketId: string, kinds: ("CREATED" | "ESCALATED" | "REASSIGNED")[]) {
  const events = await db.query.ticketEvents.findMany({
    where: (e, { and, eq, inArray }) => and(eq(e.ticketId, ticketId), inArray(e.kind, kinds)),
    orderBy: (e, { asc }) => [asc(e.createdAt), asc(e.id)],
  });
  return events.map(({ assigneeId, reason, ...event }) => {
    if (!assigneeId || reason === null) throw new Error("A handover event lacks its assignee");
    return { ...event, assigneeId, reason };
  });
}

/**
 * Locks the ticket row for the rest of the transaction, so the checks a change makes on its status
 * and holder still hold when it writes.
 */
async function lockTicket(tx: Transaction, ticketId: string) {
  const [ticket] = await tx
    .select({ status: tickets.status, holderId: tickets.holderId })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .for("update");
  if (!ticket) throw new Error("Ticket not found");
  return ticket;
}

/** Writes the event and moves the ticket to its new status, and to the event's assignee if any. */
async function recordTicketEvent(
  tx: Transaction,
  event: typeof ticketEvents.$inferInsert,
  status: TicketStatus,
) {
  await tx.insert(ticketEvents).values(event);
  await tx
    .update(tickets)
    .set({ status, ...(event.assigneeId ? { holderId: event.assigneeId } : {}) })
    .where(eq(tickets.id, event.ticketId));
}

export async function createEscalation(
  ticketId: string,
  escalationReason: string,
): Promise<ActionResponse> {
  try {
    const {
      userId,
      role,
      implementerId: activeImplementerId,
    } = await requireAuthRole(...ESCALATION_INITIATOR_ROLES);

    if (!isEscalationInitiatorRole(role)) throw new Error("The role cannot create escalations");
    const ticket = await db.query.tickets.findFirst({
      where: (t, { eq }) => eq(t.id, ticketId),
      columns: { category: true },
    });
    if (!ticket) throw new Error("Ticket not found");
    const nextRecipientRole = ESCALATION_RECIPIENT_FROM_INITIATOR[role](ticket.category);

    const handler = fetchEscalationRecipientHandlers[nextRecipientRole];
    const escalationRecipientId = await handler({ userId, implementerId: activeImplementerId });

    await db.transaction(async (tx) => {
      const ticket = await lockTicket(tx, ticketId);

      if (ticket.status === "RESOLVED") {
        throw new Error("Cannot escalate a resolved ticket");
      }

      if (ticket.holderId !== userId) {
        throw new Error("You are not the current escalation recipient of this ticket");
      }

      await recordTicketEvent(
        tx,
        {
          ticketId,
          kind: "ESCALATED",
          actorId: userId,
          assigneeId: escalationRecipientId,
          reason: escalationReason,
        },
        "ESCALATED",
      );
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

    await db.transaction(async (tx) => {
      const ticket = await lockTicket(tx, ticketId);

      if (ticket.status === "RESOLVED") {
        throw new Error("Ticket is already resolved");
      }

      if (ticket.holderId !== userId) {
        throw new Error("Only the current escalation recipient can resolve this ticket");
      }

      await recordTicketEvent(
        tx,
        { ticketId, kind: "RESOLVED", actorId: userId, reason: resolutionReason },
        "RESOLVED",
      );
    });

    return { success: true, message: "Ticket resolved successfully" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function reassignTicket(
  payload: CreateTicketReassignmentInput,
): Promise<ActionResponse> {
  try {
    const { userId, role, implementerId, identifier } = await requireAuthRole(
      ...REASSIGNMENT_INITIATOR_ROLES,
    );

    const { ticketId, reassignedTo, reassignmentReason } =
      CreateTicketReassignmentSchema.parse(payload);

    if (reassignedTo === userId) {
      throw new Error("You cannot reassign a ticket to yourself");
    }

    await db.transaction(async (tx) => {
      const ticket = await lockTicket(tx, ticketId);

      if (ticket.status !== "ESCALATED") {
        throw new Error("This ticket is not escalated and cannot be reassigned");
      }

      if (ticket.holderId !== userId) {
        throw new Error("Only the current escalation recipient can reassign this ticket");
      }

      await assertReassignmentEligible(tx, { role, implementerId, identifier }, reassignedTo);

      await recordTicketEvent(
        tx,
        {
          ticketId,
          kind: "REASSIGNED",
          actorId: userId,
          assigneeId: reassignedTo,
          reason: reassignmentReason,
        },
        "ESCALATED",
      );
    });

    return { success: true, message: "Ticket reassigned successfully" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function assertReassignmentEligible(
  tx: Transaction,
  actor: { role: ImplementerRole; implementerId: string; identifier: string | null },
  reassignedTo: string,
): Promise<void> {
  const { role, implementerId, identifier } = actor;

  const targetMember = await tx.query.implementerMember.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.userId, reassignedTo), eq(m.role, role), eq(m.implementerId, implementerId)),
    columns: { identifier: true },
  });

  if (!targetMember?.identifier) {
    throw new Error("The selected user is not an eligible recipient for this tier");
  }

  if (role === ImplementerRole.HUB_COORDINATOR) {
    if (!identifier) throw new Error("Your account is not linked to a hub coordinator profile");

    // The target's hub must be one the acting coordinator is assigned to.
    const actorHubs = tx
      .select({ hubId: hubCoordinator.assignedHubId })
      .from(hubCoordinator)
      .where(eq(hubCoordinator.id, identifier));
    const [target] = await tx
      .select({ id: hubCoordinator.id })
      .from(hubCoordinator)
      .where(
        and(
          eq(hubCoordinator.id, targetMember.identifier),
          isNull(hubCoordinator.archivedAt),
          inArray(hubCoordinator.assignedHubId, actorHubs),
        ),
      );

    if (!target) {
      throw new Error("The selected hub coordinator is inactive or not in your hub");
    }
    return;
  }

  if (role === ImplementerRole.CLINICAL_LEAD) {
    if (!identifier) throw new Error("Your account is not linked to a clinical lead profile");

    const actorHubs = tx
      .select({ hubId: clinicalLead.assignedHubId })
      .from(clinicalLead)
      .where(eq(clinicalLead.id, identifier));
    const [target] = await tx
      .select({ id: clinicalLead.id })
      .from(clinicalLead)
      .where(
        and(
          eq(clinicalLead.id, targetMember.identifier),
          inArray(clinicalLead.assignedHubId, actorHubs),
        ),
      );

    if (!target) {
      throw new Error("The selected clinical lead is inactive or not in your hub");
    }
  }
}

export async function getTicketEscalationStatus(
  ticketId: string,
): Promise<ActionResponse<TicketEscalationStatus>> {
  try {
    const { userId, role } = await requireAuthRole(...Object.values(ImplementerRole));

    const ticket = await findViewableTicket(ticketId, userId);
    if (!ticket) throw new Error("Ticket not found");

    const pastKinds = await db
      .selectDistinct({ kind: ticketEvents.kind })
      .from(ticketEvents)
      .where(
        and(
          eq(ticketEvents.ticketId, ticketId),
          inArray(ticketEvents.kind, ["REASSIGNED", "RESOLVED"]),
        ),
      );
    const hasReassignment = pastKinds.some((e) => e.kind === "REASSIGNED");
    const hasResolution = pastKinds.some((e) => e.kind === "RESOLVED");
    const isCurrentRecipient = ticket.holderId === userId;

    if (ticket.status === "RESOLVED") {
      return {
        success: true,
        message: "This ticket has already been resolved and is no longer actionable",
        data: {
          canEscalate: false,
          canReassign: false,
          canResolve: false,
          hasReassignment,
          hasResolution,
        },
      };
    }

    if (!isCurrentRecipient) {
      return {
        success: true,
        message: "Ticket escalation status retrieved",
        data: {
          canEscalate: false,
          canReassign: false,
          canResolve: false,
          hasReassignment,
          hasResolution,
        },
      };
    }

    if (role === ImplementerRole.ADMIN) {
      return {
        success: true,
        message: "You can resolve or reassign this ticket as you are the current recipient",
        data: {
          canEscalate: false,
          canReassign: true,
          canResolve: true,
          hasReassignment,
          hasResolution,
        },
      };
    }

    return {
      success: true,
      message: "You can act on this ticket as you are the current escalation recipient",
      data: {
        canEscalate: true,
        canReassign: true,
        canResolve: true,
        hasReassignment,
        hasResolution,
      },
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

    const viewable = await findViewableTicket(ticketId, userId);
    if (!viewable) throw new Error("You are not authorized to view this ticket's resolution");

    const resolution = await db.query.ticketEvents.findFirst({
      where: (e, { and, eq }) => and(eq(e.ticketId, ticketId), eq(e.kind, "RESOLVED")),
      orderBy: (e, { desc }) => [desc(e.createdAt), desc(e.id)],
      with: {
        actor: {
          with: {
            memberships: { columns: { role: true } },
          },
        },
      },
    });

    if (!resolution) throw new Error("This ticket has not been resolved");

    return {
      success: true,
      message: "Resolution retrieved successfully",
      data: {
        id: resolution.id,
        resolvedByRole: resolution.actor.memberships[0]?.role ?? null,
        resolutionReason: resolution.reason ?? "",
        createdAt: resolution.createdAt,
      },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getTicketReassignments(
  ticketId: string,
): Promise<ActionResponse<FullTicketReassignment[]>> {
  try {
    const { userId, implementerId } = await requireAuthRole(...Object.values(ImplementerRole));

    const viewable = await findViewableTicket(ticketId, userId);
    if (!viewable) throw new Error("You are not authorized to view this ticket's reassignments");

    const reassignments = await readHandovers(ticketId, ["REASSIGNED"]);
    if (reassignments.length === 0) {
      throw new Error("No reassignments exist for this ticket");
    }

    const userIds = Array.from(new Set(reassignments.flatMap((r) => [r.actorId, r.assigneeId])));

    const nameMap = await getUserNamesAndRolesById(
      userIds,
      implementerId,
      REASSIGNMENT_INITIATOR_ROLES,
    );

    const mappedReassignments: FullTicketReassignment[] = reassignments.map((reassignment) => {
      const reassignedFromInfo = nameMap.get(reassignment.actorId);
      const reassignedToInfo = nameMap.get(reassignment.assigneeId);

      return {
        id: reassignment.id,
        reassignmentReason: reassignment.reason,
        createdAt: reassignment.createdAt,
        reassignedFromName: reassignedFromInfo?.name ?? "",
        reassignedToName: reassignedToInfo?.name ?? "",
        reassignedFromRole: (reassignedFromInfo?.role as ReassignmentInitiatorRole) ?? null,
        reassignedToRole: (reassignedToInfo?.role as ReassignmentInitiatorRole) ?? null,
      };
    });

    return {
      success: true,
      message: "Reassignments retrieved successfully",
      data: mappedReassignments,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchTicketsForUser(
  userId: string,
  implementerId: string,
  filters: TicketFilters,
): Promise<FullTicket[]> {
  const rows = await db
    .select({
      id: tickets.id,
      subject: tickets.subject,
      description: tickets.description,
      category: tickets.category,
      status: tickets.status,
      priority: tickets.priority,
      createdAt: tickets.createdAt,
      holderId: tickets.holderId,
    })
    .from(tickets)
    .where(
      and(canViewTicket(userId), filters.status ? eq(tickets.status, filters.status) : undefined),
    )
    .orderBy(desc(tickets.createdAt));

  const roleMap = await getUserNamesAndRolesById(
    Array.from(new Set(rows.map((r) => r.holderId))),
    implementerId,
  );

  return rows.map(({ holderId, ...row }): FullTicket => ({
    ...row,
    currentTier: roleMap.get(holderId)?.role ?? null,
  }));
}

const fetchEscalationRecipientHandlers: Record<
  EscalationRecipientRole,
  FetchEscalationRecipientHandler
> = {
  SUPERVISOR: async ({ userId }) => {
    const { rows: result } = await db.execute<{ supervisor_user_id: string }>(sql`
      SELECT im2.user_id AS supervisor_user_id
      FROM implementer_members im1
      JOIN fellows f ON f.id = im1.identifier
      JOIN supervisors s ON s.id = f.supervisor_id
      JOIN implementer_members im2 ON im2.identifier = s.id
      WHERE im1.user_id = ${userId}
        AND im1.role = 'FELLOW'
        AND im2.role = 'SUPERVISOR'
      LIMIT 1;
    `);

    const supervisorUserId = result[0]?.supervisor_user_id;
    if (!supervisorUserId) throw new Error("No supervisor found for this fellow");

    return supervisorUserId;
  },
  HUB_COORDINATOR: async ({ userId, implementerId }) => {
    const { rows: result } = await db.execute<{ hub_coordinator_user_id: string }>(sql`
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
    `);

    const hubCoordinatorUserId = result[0]?.hub_coordinator_user_id;
    if (!hubCoordinatorUserId) throw new Error("No hub coordinator found for this supervisor");

    return hubCoordinatorUserId;
  },
  CLINICAL_LEAD: async ({ userId, implementerId }) => {
    const { rows: result } = await db.execute<{ clinical_lead_user_id: string }>(sql`
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
    `);

    const clinicalLeadUserId = result[0]?.clinical_lead_user_id;
    if (!clinicalLeadUserId) throw new Error("No clinical lead found for this supervisor");

    return clinicalLeadUserId;
  },
  ADMIN: async ({ implementerId }) => {
    // The oldest super admin of the ticket's implementer, so adding admins, or an admin of another
    // implementer, never changes who receives the ticket.
    const [recipient] = await db
      .select({ userId: implementerMember.userId })
      .from(adminUser)
      .innerJoin(
        implementerMember,
        and(
          eq(implementerMember.identifier, adminUser.id),
          eq(implementerMember.role, "ADMIN"),
          eq(implementerMember.implementerId, implementerId),
        ),
      )
      .where(and(eq(adminUser.implementerId, implementerId), eq(adminUser.isSuperAdmin, true)))
      .orderBy(asc(adminUser.createdAt), asc(adminUser.id))
      .limit(1);
    if (!recipient) throw new Error("No admin user found");

    return recipient.userId;
  },
};

async function getUserNamesAndRolesById(
  userIds: string[],
  implementerId: string,
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

  const { rows } = await db.execute<{
    user_id: string;
    role: ImplementerRole;
    name: string | null;
  }>(sql`
    SELECT
      im.user_id,
      im.role::text AS role,
      COALESCE(${sql.raw(coalesceSql)}) AS name
    FROM implementer_members im
    ${sql.raw(joinsSql)}
    WHERE ${inArray(sql`im.user_id`, userIds)}
      AND im.implementer_id = ${implementerId}
  `);

  for (const row of rows) {
    result.set(`${row.user_id}`, { role: row.role, name: row.name });
  }

  return result;
}
