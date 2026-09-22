"use server";

import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { db, isUniqueViolation, type Transaction } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  clinicalLead,
  hubCoordinator,
  ticketEscalations,
  ticketReassignments,
  ticketResolutions,
  tickets,
} from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import type { ActionResponse } from "#/types/actions.types";
import {
  type CreateTicketEscalationPayload,
  type CreateTicketInput,
  type CreateTicketPayload,
  type CreateTicketReassignmentInput,
  type CreateTicketReassignmentPayload,
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
  type TicketCategory,
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

    const nextRecipientRole = ESCALATION_RECIPIENT_FROM_INITIATOR[role](payload.category);
    const handler = fetchEscalationRecipientHandlers[nextRecipientRole];
    const escalationRecipientId = await handler(createdById, activeImplementerId);

    const ticketPayload: CreateTicketPayload = {
      ...payload,
      createdById,
    };

    await db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(tickets)
        .values({ ...ticketPayload, status: "ESCALATED" })
        .returning({ id: tickets.id });
      if (!ticket) throw new Error("Ticket insert returned no row");

      await tx.insert(ticketEscalations).values({
        ticketId: ticket.id,
        escalatedById: createdById,
        escalatedToId: escalationRecipientId,
        escalationReason: ticketPayload.description,
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

/** An escalation on the ticket where the user is either party; used as the view permission. */
function escalationParticipation(ticketId: string, userId: string) {
  return db.query.ticketEscalations.findFirst({
    where: (e, { and, eq, or }) =>
      and(eq(e.ticketId, ticketId), or(eq(e.escalatedById, userId), eq(e.escalatedToId, userId))),
  });
}

export async function getEscalationsPerTicket(
  ticketId: string,
): Promise<ActionResponse<TicketEscalation[]>> {
  try {
    const { userId, implementerId } = await requireAuthRole(...Object.values(ImplementerRole));

    const authorized = await escalationParticipation(ticketId, userId);
    if (!authorized) throw new Error("Not authorized to view this ticket's escalations");

    const escalations = await db.query.ticketEscalations.findMany({
      where: (e, { eq }) => eq(e.ticketId, ticketId),
      orderBy: (e, { asc }) => asc(e.createdAt),
    });

    if (escalations.length === 0) throw new Error("No escalations were found for this ticket");

    const userIds = Array.from(
      new Set(escalations.flatMap((e) => [e.escalatedById, e.escalatedToId])),
    );

    const nameMap = await getUserNamesAndRolesById(userIds, implementerId);

    const mappedEscalations: TicketEscalation[] = escalations.map(
      (escalation): TicketEscalation => {
        const escalatedBy = nameMap.get(escalation.escalatedById);
        const escalatedTo = nameMap.get(escalation.escalatedToId);

        return {
          ...escalation,
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

function latestEscalationWithTicket(tx: Transaction, ticketId: string) {
  return tx.query.ticketEscalations.findFirst({
    where: (e, { eq }) => eq(e.ticketId, ticketId),
    orderBy: (e, { desc }) => desc(e.createdAt),
    with: { ticket: { columns: { status: true } } },
  });
}

async function setTicketStatus(
  tx: Transaction,
  ticketId: string,
  status: "ESCALATED" | "RESOLVED",
) {
  const updated = await tx
    .update(tickets)
    .set({ status })
    .where(eq(tickets.id, ticketId))
    .returning({ id: tickets.id });
  if (updated.length === 0) throw new Error("Ticket not found");
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

    await db.transaction(async (tx) => {
      const latestEscalation = await latestEscalationWithTicket(tx, ticketId);

      if (!latestEscalation) {
        throw new Error("No escalation exists for this ticket");
      }

      if (latestEscalation.ticket.status === "RESOLVED") {
        throw new Error("Cannot escalate a resolved ticket");
      }

      if (latestEscalation.escalatedToId !== userId) {
        throw new Error("You are not the current escalation recipient of this ticket");
      }

      await tx.insert(ticketEscalations).values(escalationData);

      await setTicketStatus(tx, ticketId, "ESCALATED");
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
      const latestEscalation = await latestEscalationWithTicket(tx, ticketId);

      if (!latestEscalation) throw new Error("No escalation exists for this ticket");

      if (latestEscalation.ticket.status === "RESOLVED") {
        throw new Error("Ticket is already resolved");
      }

      if (latestEscalation.escalatedToId !== userId) {
        throw new Error("Only the current escalation recipient can resolve this ticket");
      }

      await tx.insert(ticketResolutions).values({
        ticketId,
        resolvedById: userId,
        resolutionReason,
      });

      await setTicketStatus(tx, ticketId, "RESOLVED");
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
      const escalation = await latestEscalationWithTicket(tx, ticketId);

      if (!escalation) throw new Error("No escalation exists for this ticket");

      if (escalation.ticket.status !== "ESCALATED") {
        throw new Error("This ticket is not escalated and cannot be reassigned");
      }

      if (escalation.escalatedToId !== userId) {
        throw new Error("Only the current escalation recipient can reassign this ticket");
      }

      const existingReassignment = await tx.query.ticketReassignments.findFirst({
        where: (r, { eq }) => eq(r.escalationId, escalation.id),
      });

      if (existingReassignment) throw new Error("This ticket has already been reassigned");

      await assertReassignmentEligible(tx, { role, implementerId, identifier }, reassignedTo);

      const reassignmentData: CreateTicketReassignmentPayload = {
        ticketId,
        reassignedFrom: userId,
        reassignedTo,
        reassignmentReason,
        escalationId: escalation.id,
      };

      await tx.insert(ticketReassignments).values(reassignmentData);

      const updatedEscalations = await tx
        .update(ticketEscalations)
        .set({ escalatedToId: reassignedTo })
        .where(eq(ticketEscalations.id, escalation.id))
        .returning({ id: ticketEscalations.id });
      if (updatedEscalations.length === 0) throw new Error("Escalation not found");

      await setTicketStatus(tx, ticketId, "ESCALATED");
    });

    return { success: true, message: "Ticket reassigned successfully" };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: false, message: "This ticket has already been reassigned" };
    }
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

    const ticket = await db.query.tickets.findFirst({
      where: (t, { eq }) => eq(t.id, ticketId),
      columns: { status: true },
    });

    if (!ticket) throw new Error("Ticket not found");

    const latestEscalation = await db.query.ticketEscalations.findFirst({
      where: (e, { eq }) => eq(e.ticketId, ticketId),
      orderBy: (e, { desc }) => desc(e.createdAt),
    });

    const isCurrentRecipient = latestEscalation?.escalatedToId === userId;

    const existingReassignment = latestEscalation
      ? await db.query.ticketReassignments.findFirst({
          where: (r, { eq }) => eq(r.escalationId, latestEscalation.id),
        })
      : null;

    const hasReassignment = Boolean(existingReassignment);

    const existingResolution = await db.query.ticketResolutions.findFirst({
      where: (r, { eq }) => eq(r.ticketId, ticketId),
    });

    const hasResolution = Boolean(existingResolution);

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
          canReassign: !existingReassignment,
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
        canReassign: !existingReassignment,
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

    const escalationParticipant = await escalationParticipation(ticketId, userId);

    if (!escalationParticipant)
      throw new Error("You are not authorized to view this ticket's resolution");

    const resolution = await db.query.ticketResolutions.findFirst({
      where: (r, { eq }) => eq(r.ticketId, ticketId),
      with: {
        resolvedByUser: {
          with: {
            memberships: { columns: { role: true } },
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

export async function getTicketReassignments(
  ticketId: string,
): Promise<ActionResponse<FullTicketReassignment[]>> {
  try {
    const { userId, implementerId } = await requireAuthRole(...Object.values(ImplementerRole));

    const ticket = await db.query.tickets.findFirst({
      where: (t, { eq }) => eq(t.id, ticketId),
      columns: { createdById: true },
    });

    if (!ticket) throw new Error("Ticket not found");

    const isCreator = ticket.createdById === userId;

    if (!isCreator) {
      const isReassignmentParty = await db.query.ticketReassignments.findFirst({
        where: (r, { and, eq, or }) =>
          and(
            eq(r.ticketId, ticketId),
            or(eq(r.reassignedFrom, userId), eq(r.reassignedTo, userId)),
          ),
        columns: { id: true },
      });

      if (!isReassignmentParty) {
        const escalationParticipant = await escalationParticipation(ticketId, userId);

        if (!escalationParticipant) {
          throw new Error("You are not authorized to view this ticket's reassignments");
        }
      }
    }

    const reassignments = await db.query.ticketReassignments.findMany({
      where: (r, { eq }) => eq(r.ticketId, ticketId),
      orderBy: (r, { asc }) => asc(r.createdAt),
    });

    if (reassignments.length === 0) {
      throw new Error("No reassignments exist for this ticket");
    }

    const userIds = Array.from(
      new Set(
        reassignments.flatMap((reassignment) => [
          reassignment.reassignedFrom,
          reassignment.reassignedTo,
        ]),
      ),
    );

    const nameMap = await getUserNamesAndRolesById(
      userIds,
      implementerId,
      REASSIGNMENT_INITIATOR_ROLES,
    );

    const mappedReassignments: FullTicketReassignment[] = reassignments.map((reassignment) => {
      const reassignedFromInfo = nameMap.get(reassignment.reassignedFrom);
      const reassignedToInfo = nameMap.get(reassignment.reassignedTo);

      return {
        ...reassignment,
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
  const userTickets = db.$with("user_tickets").as(
    db
      .selectDistinct({ id: tickets.id })
      .from(tickets)
      .leftJoin(ticketEscalations, eq(tickets.id, ticketEscalations.ticketId))
      .where(
        and(
          or(
            eq(tickets.createdById, userId),
            eq(ticketEscalations.escalatedToId, userId),
            eq(ticketEscalations.escalatedById, userId),
          ),
          filters.status ? eq(tickets.status, filters.status) : undefined,
        ),
      ),
  );
  const latestEscalations = db.$with("latest_escalations").as(
    db
      .select({
        ticketId: ticketEscalations.ticketId,
        escalatedToId: ticketEscalations.escalatedToId,
        rn: sql<number>`row_number() over (partition by ${ticketEscalations.ticketId} order by ${ticketEscalations.createdAt} desc)`.as(
          "rn",
        ),
      })
      .from(ticketEscalations)
      .where(
        inArray(ticketEscalations.ticketId, db.select({ id: userTickets.id }).from(userTickets)),
      ),
  );
  const rows = await db
    .with(userTickets, latestEscalations)
    .select({
      id: tickets.id,
      subject: tickets.subject,
      description: tickets.description,
      category: tickets.category,
      status: tickets.status,
      priority: tickets.priority,
      createdAt: tickets.createdAt,
      currentRecipientId: latestEscalations.escalatedToId,
    })
    .from(userTickets)
    .innerJoin(tickets, eq(tickets.id, userTickets.id))
    .leftJoin(
      latestEscalations,
      and(eq(tickets.id, latestEscalations.ticketId), eq(latestEscalations.rn, 1)),
    )
    .orderBy(desc(tickets.createdAt));

  const currentTierIds = rows.map((r) => r.currentRecipientId).filter((id): id is string => !!id);
  const roleMap = await getUserNamesAndRolesById(currentTierIds, implementerId);

  const fullTickets: FullTicket[] = rows.map((row): FullTicket => {
    let currentTier: ImplementerRole | null = null;

    if (!row.currentRecipientId || row.currentRecipientId === undefined) {
      currentTier = null;
    } else {
      currentTier = roleMap.get(row.currentRecipientId)?.role ?? null;
    }

    return { ...row, currentTier };
  });

  return fullTickets;
}

const fetchEscalationRecipientHandlers: Record<
  EscalationRecipientRole,
  FetchEscalationRecipientHandler
> = {
  SUPERVISOR: async (userId) => {
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
  HUB_COORDINATOR: async (userId, implementerId) => {
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
  CLINICAL_LEAD: async (userId, implementerId) => {
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
  ADMIN: async () => {
    const adminUsers = await db.query.adminUser.findMany({
      orderBy: (a, { desc }) => desc(a.createdAt),
    });
    if (adminUsers.length === 0) throw new Error("No admin user found");

    const adminMemberships = await db.query.implementerMember.findMany({
      where: (m, { and, eq, inArray }) =>
        and(
          eq(m.role, "ADMIN"),
          inArray(
            m.identifier,
            adminUsers.map((a) => a.id),
          ),
        ),
      columns: { userId: true, createdAt: true },
      orderBy: (m, { desc }) => desc(m.createdAt),
      limit: 1,
    });

    const adminUserId = adminMemberships[0]?.userId;
    if (!adminUserId) throw new Error("No admin user found");

    return adminUserId;
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
