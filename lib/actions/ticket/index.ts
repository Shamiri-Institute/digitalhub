"use server";

import { and, asc, desc, eq, exists, inArray, isNull, or, sql } from "drizzle-orm";
import { refresh } from "next/cache";

import { db, type Transaction } from "#/db/client";
import {
  ImplementerRole,
  type TicketCategory,
  type TicketEventKind,
  type TicketStatus,
} from "#/db/enums";
import {
  adminUser,
  clinicalLead,
  hubCoordinator,
  implementerMember,
  ticketEvents,
  tickets,
} from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { mayReopenTicket, REOPEN_WINDOW_DAYS } from "#/lib/ticket-reopen-window";
import type { ActionResponse } from "#/types/actions.types";
import {
  ACTIVE_TICKET_STATUSES,
  ChangeTicketPrioritySchema,
  type ChangeTicketPriorityInput,
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
  TICKET_CHANGE_KINDS,
  type TicketChange,
  type TicketEscalation,
  type TicketEscalationStatus,
  type TicketFilters,
  RESOLVED_TICKET_STATUSES,
  type TicketResolution,
  TicketReasonSchema,
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
        .values({ ...ticketPayload, holderId: escalationRecipientId })
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

    refresh();
    return { success: true, message: "Successfully created ticket" };
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getAllTickets(filters: TicketFilters): Promise<ActionResponse<FullTicket[]>> {
  try {
    const { userId: callerUserId, implementerId } = await requireAuthRole(
      ...Object.values(ImplementerRole),
    );

    const tickets = await fetchTicketsForUser(callerUserId, implementerId, filters);

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
    .select({
      status: tickets.status,
      holderId: tickets.holderId,
      createdById: tickets.createdById,
      resolvedAt: tickets.resolvedAt,
      category: tickets.category,
    })
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), canViewTicket(userId)));
  return ticket;
}

export async function getEscalationsPerTicket(
  ticketId: string,
): Promise<ActionResponse<TicketEscalation[]>> {
  try {
    const { userId: callerUserId, implementerId } = await requireAuthRole(
      ...Object.values(ImplementerRole),
    );

    const viewableTicket = await findViewableTicket(ticketId, callerUserId);
    if (!viewableTicket) throw new Error("Not authorized to view this ticket's escalations");

    const escalations = await readHandovers(ticketId, ["CREATED", "ESCALATED"]);
    if (escalations.length === 0) throw new Error("No escalations were found for this ticket");

    const nameMap = await getUserNamesAndRolesById(
      escalations.flatMap((e) => [e.actorId, e.assigneeId]),
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
async function readHandovers(
  ticketId: string,
  kinds: Extract<TicketEventKind, "CREATED" | "ESCALATED" | "REASSIGNED">[],
) {
  const events = await db.query.ticketEvents.findMany({
    where: (e, { and, eq, inArray }) => and(eq(e.ticketId, ticketId), inArray(e.kind, kinds)),
    orderBy: (e, { asc }) => [asc(e.createdAt), asc(e.id)],
  });
  return events.map(({ actorId, assigneeId, reason, ...event }) => {
    if (!actorId || !assigneeId || reason === null) {
      throw new Error("A handover event lacks its actor or assignee");
    }
    return { ...event, actorId, assigneeId, reason };
  });
}

async function lockTicket(tx: Transaction, ticketId: string) {
  const [ticket] = await tx
    .select({
      status: tickets.status,
      holderId: tickets.holderId,
      priority: tickets.priority,
      createdById: tickets.createdById,
      resolvedAt: tickets.resolvedAt,
      category: tickets.category,
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .for("update");
  if (!ticket) throw new Error("Ticket not found");
  return ticket;
}

async function recordTicketEvent(
  tx: Transaction,
  lockedTicket: Awaited<ReturnType<typeof lockTicket>>,
  event: Omit<typeof ticketEvents.$inferInsert, "fromValue" | "toValue">,
  ticketChanges: Pick<typeof tickets.$inferInsert, "status" | "priority" | "resolvedAt">,
  loggedField: "status" | "priority",
) {
  const fromValue = lockedTicket[loggedField];
  const toValue = ticketChanges[loggedField];
  await tx
    .insert(ticketEvents)
    .values({ ...event, ...(fromValue !== toValue ? { fromValue, toValue } : {}) });
  await tx
    .update(tickets)
    .set({ ...ticketChanges, ...(event.assigneeId ? { holderId: event.assigneeId } : {}) })
    .where(eq(tickets.id, event.ticketId));
}

function isActiveTicketStatus(status: TicketStatus) {
  return ACTIVE_TICKET_STATUSES.includes(status);
}

function assertActiveTicket(status: TicketStatus, outcome: string) {
  if (!isActiveTicketStatus(status)) {
    throw new Error(`Only an open, in-progress or escalated ticket can ${outcome}`);
  }
}

// A clinical ticket is in a clinician's hands once started, so its creator may withdraw it only before.
function mayCancelTicket(ticket: { status: TicketStatus; category: TicketCategory }) {
  return ticket.category === "CLINICAL"
    ? ticket.status === "OPEN"
    : isActiveTicketStatus(ticket.status);
}

function assertTicketHolder(holderId: string | null, callerUserId: string, action: string) {
  if (holderId !== callerUserId) {
    throw new Error(`Only the ticket's current holder can ${action} it`);
  }
}

function assertTicketCreator(createdById: string, callerUserId: string, action: string) {
  if (createdById !== callerUserId) {
    throw new Error(`Only the ticket's creator can ${action} it`);
  }
}

async function runTicketAction(
  successMessage: string,
  action: () => Promise<void>,
): Promise<ActionResponse> {
  try {
    await action();
    refresh();
    return { success: true, message: successMessage };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function createEscalation(ticketId: string, reason: string): Promise<ActionResponse> {
  return runTicketAction("Escalation created successfully", async () => {
    const {
      userId: callerUserId,
      role,
      implementerId: activeImplementerId,
    } = await requireAuthRole(...ESCALATION_INITIATOR_ROLES);
    const escalationReason = TicketReasonSchema.parse(reason);

    if (!isEscalationInitiatorRole(role)) throw new Error("The role cannot create escalations");
    const ticket = await db.query.tickets.findFirst({
      where: (t, { eq }) => eq(t.id, ticketId),
      columns: { category: true },
    });
    if (!ticket) throw new Error("Ticket not found");
    const nextRecipientRole = ESCALATION_RECIPIENT_FROM_INITIATOR[role](ticket.category);

    const handler = fetchEscalationRecipientHandlers[nextRecipientRole];
    const escalationRecipientId = await handler({
      userId: callerUserId,
      implementerId: activeImplementerId,
    });

    await db.transaction(async (tx) => {
      const lockedTicket = await lockTicket(tx, ticketId);
      assertActiveTicket(lockedTicket.status, "be escalated");

      assertTicketHolder(lockedTicket.holderId, callerUserId, "escalate");

      await recordTicketEvent(
        tx,
        lockedTicket,
        {
          ticketId,
          kind: "ESCALATED",
          actorId: callerUserId,
          assigneeId: escalationRecipientId,
          reason: escalationReason,
        },
        { status: "ESCALATED" },
        "status",
      );
    });
  });
}

export async function resolveTicket(ticketId: string, reason: string): Promise<ActionResponse> {
  return runTicketAction("Ticket resolved successfully", async () => {
    const { userId: callerUserId } = await requireAuthRole(...ESCALATION_RECIPIENT_ROLES);
    const resolutionReason = TicketReasonSchema.parse(reason);

    await db.transaction(async (tx) => {
      const lockedTicket = await lockTicket(tx, ticketId);
      assertActiveTicket(lockedTicket.status, "be resolved");

      assertTicketHolder(lockedTicket.holderId, callerUserId, "resolve");

      await recordTicketEvent(
        tx,
        lockedTicket,
        { ticketId, kind: "RESOLVED", actorId: callerUserId, reason: resolutionReason },
        { status: "RESOLVED", resolvedAt: new Date() },
        "status",
      );
    });
  });
}

export async function startTicket(ticketId: string): Promise<ActionResponse> {
  return runTicketAction("Ticket started", async () => {
    const { userId: callerUserId } = await requireAuthRole(...ESCALATION_RECIPIENT_ROLES);

    await db.transaction(async (tx) => {
      const lockedTicket = await lockTicket(tx, ticketId);
      if (lockedTicket.status !== "OPEN" && lockedTicket.status !== "ESCALATED") {
        throw new Error("Only an open or escalated ticket can be started");
      }
      assertTicketHolder(lockedTicket.holderId, callerUserId, "start");

      await recordTicketEvent(
        tx,
        lockedTicket,
        { ticketId, kind: "STARTED", actorId: callerUserId },
        { status: "IN_PROGRESS" },
        "status",
      );
    });
  });
}

export async function changeTicketPriority(
  ticketId: string,
  input: ChangeTicketPriorityInput,
): Promise<ActionResponse> {
  return runTicketAction("Ticket priority changed", async () => {
    const { userId: callerUserId } = await requireAuthRole(...ESCALATION_RECIPIENT_ROLES);
    const { priority, reason } = ChangeTicketPrioritySchema.parse(input);

    await db.transaction(async (tx) => {
      const lockedTicket = await lockTicket(tx, ticketId);
      assertActiveTicket(lockedTicket.status, "have its priority changed");
      assertTicketHolder(lockedTicket.holderId, callerUserId, "change the priority of");
      if (lockedTicket.priority === priority) {
        throw new Error("The ticket already has this priority");
      }

      await recordTicketEvent(
        tx,
        lockedTicket,
        { ticketId, kind: "PRIORITY_CHANGED", actorId: callerUserId, reason },
        { priority },
        "priority",
      );
    });
  });
}

export async function reopenTicket(ticketId: string, reason: string): Promise<ActionResponse> {
  return runTicketAction("Ticket reopened", async () => {
    const {
      userId: callerUserId,
      role,
      implementerId: activeImplementerId,
    } = await requireAuthRole(...ESCALATION_INITIATOR_ROLES);
    const reopenReason = TicketReasonSchema.parse(reason);

    if (!isEscalationInitiatorRole(role)) throw new Error("The role cannot reopen tickets");

    await db.transaction(async (tx) => {
      const lockedTicket = await lockTicket(tx, ticketId);
      assertTicketCreator(lockedTicket.createdById, callerUserId, "reopen");
      if (lockedTicket.status !== "RESOLVED") {
        throw new Error("Only a resolved ticket can be reopened");
      }
      if (!mayReopenTicket(lockedTicket.resolvedAt, new Date())) {
        throw new Error(
          `Tickets can only be reopened within ${REOPEN_WINDOW_DAYS} days of being resolved`,
        );
      }

      // The ticket returns to its holder, who resolved it, unless they have since left; then it is
      // routed afresh, as a new ticket is, so it is never left with no one able to act on it.
      const holderIsActive =
        lockedTicket.holderId !== null &&
        (await isActiveHolder(tx, lockedTicket.holderId, activeImplementerId));
      const newHolderId = holderIsActive
        ? undefined
        : await fetchEscalationRecipientHandlers[
            ESCALATION_RECIPIENT_FROM_INITIATOR[role](lockedTicket.category)
          ]({ userId: callerUserId, implementerId: activeImplementerId });

      await recordTicketEvent(
        tx,
        lockedTicket,
        {
          ticketId,
          kind: "REOPENED",
          actorId: callerUserId,
          assigneeId: newHolderId,
          reason: reopenReason,
        },
        // A new holder has not picked the ticket up, so it must be startable.
        { status: newHolderId ? "OPEN" : "IN_PROGRESS", resolvedAt: null },
        "status",
      );
    });
  });
}

export async function cancelTicket(ticketId: string, reason: string): Promise<ActionResponse> {
  return runTicketAction("Ticket cancelled", async () => {
    const { userId: callerUserId } = await requireAuthRole(...ESCALATION_INITIATOR_ROLES);
    const cancelReason = TicketReasonSchema.parse(reason);

    await db.transaction(async (tx) => {
      const lockedTicket = await lockTicket(tx, ticketId);
      assertTicketCreator(lockedTicket.createdById, callerUserId, "cancel");
      assertActiveTicket(lockedTicket.status, "be cancelled");
      if (!mayCancelTicket(lockedTicket)) {
        throw new Error("A clinical ticket can only be cancelled before it is started");
      }

      await recordTicketEvent(
        tx,
        lockedTicket,
        { ticketId, kind: "CANCELLED", actorId: callerUserId, reason: cancelReason },
        { status: "CANCELLED" },
        "status",
      );
    });
  });
}

export async function reassignTicket(
  payload: CreateTicketReassignmentInput,
): Promise<ActionResponse> {
  return runTicketAction("Ticket reassigned successfully", async () => {
    const {
      userId: callerUserId,
      role,
      implementerId,
      identifier,
    } = await requireAuthRole(...REASSIGNMENT_INITIATOR_ROLES);

    const { ticketId, reassignedTo, reassignmentReason } =
      CreateTicketReassignmentSchema.parse(payload);

    if (reassignedTo === callerUserId) {
      throw new Error("You cannot reassign a ticket to yourself");
    }

    await db.transaction(async (tx) => {
      const lockedTicket = await lockTicket(tx, ticketId);
      assertActiveTicket(lockedTicket.status, "be reassigned");

      assertTicketHolder(lockedTicket.holderId, callerUserId, "reassign");

      await assertReassignmentEligible(tx, { role, implementerId, identifier }, reassignedTo);

      await recordTicketEvent(
        tx,
        lockedTicket,
        {
          ticketId,
          kind: "REASSIGNED",
          actorId: callerUserId,
          assigneeId: reassignedTo,
          reason: reassignmentReason,
        },
        // The new holder has not picked the ticket up, so it must be startable again.
        { status: lockedTicket.status === "IN_PROGRESS" ? "OPEN" : lockedTicket.status },
        "status",
      );
    });
  });
}

// The same archived and dropped-out rules the escalation routing applies to each role.
async function isActiveHolder(tx: Transaction, holderId: string, implementerId: string) {
  const { rows } = await tx.execute(sql`
    SELECT 1
    FROM implementer_members m
    LEFT JOIN supervisors s ON m.role = 'SUPERVISOR' AND s.id = m.identifier
    LEFT JOIN hub_coordinators hc ON m.role = 'HUB_COORDINATOR' AND hc.id = m.identifier
    LEFT JOIN clinical_leads cl ON m.role = 'CLINICAL_LEAD' AND cl.id = m.identifier
    WHERE m.user_id = ${holderId}
      AND m.implementer_id = ${implementerId}
      AND (
        m.role = 'ADMIN'
        OR (s.archived_at IS NULL AND s.dropped_out IS NOT TRUE AND s.id IS NOT NULL)
        OR (hc.archived_at IS NULL AND hc.dropped_out IS NOT TRUE AND hc.id IS NOT NULL)
        OR (cl.dropped_out IS NOT TRUE AND cl.id IS NOT NULL)
      )
    LIMIT 1
  `);
  return rows.length > 0;
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
          or(eq(hubCoordinator.droppedOut, false), isNull(hubCoordinator.droppedOut)),
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
          or(eq(clinicalLead.droppedOut, false), isNull(clinicalLead.droppedOut)),
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
    const { userId: callerUserId, role } = await requireAuthRole(...Object.values(ImplementerRole));

    const ticket = await findViewableTicket(ticketId, callerUserId);
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
    const ticketIsActive = isActiveTicketStatus(ticket.status);
    const callerHoldsTicket = ticketIsActive && ticket.holderId === callerUserId;
    // Each action's own role guard, so the menu never offers one that would be refused.
    const callerHoldsTicketAs = (roles: readonly ImplementerRole[]) =>
      callerHoldsTicket && roles.includes(role);
    // Reopen and cancel run under an initiator role, so another membership must not offer them.
    const callerCreatedTicket =
      ticket.createdById === callerUserId && isEscalationInitiatorRole(role);

    return {
      success: true,
      message: "Ticket escalation status retrieved",
      data: {
        canStart:
          callerHoldsTicketAs(ESCALATION_RECIPIENT_ROLES) && ticket.status !== "IN_PROGRESS",
        canChangePriority: callerHoldsTicketAs(ESCALATION_RECIPIENT_ROLES),
        canEscalate: callerHoldsTicketAs(ESCALATION_INITIATOR_ROLES),
        canReassign: callerHoldsTicketAs(REASSIGNMENT_INITIATOR_ROLES),
        canResolve: callerHoldsTicketAs(ESCALATION_RECIPIENT_ROLES),
        canReopen:
          callerCreatedTicket &&
          ticket.status === "RESOLVED" &&
          mayReopenTicket(ticket.resolvedAt, new Date()),
        canCancel: callerCreatedTicket && mayCancelTicket(ticket),
        hasReassignment,
        hasResolution:
          RESOLVED_TICKET_STATUSES.includes(ticket.status) &&
          pastKinds.some((e) => e.kind === "RESOLVED"),
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
    const { userId: callerUserId, implementerId } = await requireAuthRole(
      ...Object.values(ImplementerRole),
    );

    const viewableTicket = await findViewableTicket(ticketId, callerUserId);
    if (!viewableTicket) throw new Error("You are not authorized to view this ticket's resolution");

    const resolution = await db.query.ticketEvents.findFirst({
      where: (e, { and, eq }) => and(eq(e.ticketId, ticketId), eq(e.kind, "RESOLVED")),
      orderBy: (e, { desc }) => [desc(e.createdAt), desc(e.id)],
      with: {
        actor: {
          with: {
            memberships: {
              where: (m, { eq }) => eq(m.implementerId, implementerId),
              orderBy: (m, { asc }) => [asc(m.id)],
              limit: 1,
              columns: { role: true },
            },
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
        resolvedByRole: resolution.actor?.memberships[0]?.role ?? null,
        resolutionReason: resolution.reason ?? "",
        createdAt: resolution.createdAt,
      },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getTicketChanges(ticketId: string): Promise<ActionResponse<TicketChange[]>> {
  try {
    const { userId: callerUserId, implementerId } = await requireAuthRole(
      ...Object.values(ImplementerRole),
    );

    const viewableTicket = await findViewableTicket(ticketId, callerUserId);
    if (!viewableTicket) throw new Error("You are not authorized to view this ticket's changes");

    const changes = await db.query.ticketEvents.findMany({
      where: (e, { and, eq, inArray }) =>
        and(eq(e.ticketId, ticketId), inArray(e.kind, [...TICKET_CHANGE_KINDS])),
      orderBy: (e, { asc }) => [asc(e.createdAt), asc(e.id)],
    });
    const nameMap = await getUserNamesAndRolesById(
      changes.flatMap((e) => (e.actorId ? [e.actorId] : [])),
      implementerId,
    );

    return {
      success: true,
      message: "Ticket changes retrieved",
      data: changes.map((e): TicketChange => ({
        id: e.id,
        kind: e.kind as TicketChange["kind"],
        actorName: (e.actorId && nameMap.get(e.actorId)?.name) || null,
        fromValue: e.fromValue,
        toValue: e.toValue,
        reason: e.reason ?? "",
        createdAt: e.createdAt,
      })),
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getTicketReassignments(
  ticketId: string,
): Promise<ActionResponse<FullTicketReassignment[]>> {
  try {
    const { userId: callerUserId, implementerId } = await requireAuthRole(
      ...Object.values(ImplementerRole),
    );

    const viewableTicket = await findViewableTicket(ticketId, callerUserId);
    if (!viewableTicket)
      throw new Error("You are not authorized to view this ticket's reassignments");

    const reassignments = await readHandovers(ticketId, ["REASSIGNED"]);
    if (reassignments.length === 0) {
      throw new Error("No reassignments exist for this ticket");
    }

    const userIds = reassignments.flatMap((r) => [r.actorId, r.assigneeId]);

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
        AND s.archived_at IS NULL
        AND s.dropped_out IS NOT TRUE
      ORDER BY im2.created_at, im2.id
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
        AND hc.archived_at IS NULL
        AND hc.dropped_out IS NOT TRUE
      ORDER BY hc.created_at, hc.id
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
        AND cl.dropped_out IS NOT TRUE
      ORDER BY cl.created_at, cl.id
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
