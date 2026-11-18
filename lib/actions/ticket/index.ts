"use server";

import { and, asc, desc, eq, exists, inArray, or, sql } from "drizzle-orm";
import { refresh } from "next/cache";

import { db, type Transaction } from "#/db/client";
import { ImplementerRole, TicketCategory, type TicketStatus } from "#/db/enums";
import { adminUser, implementerMember, ticketEvents, tickets } from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { mayReopenTicket, REOPEN_WINDOW_DAYS, REOPEN_WINDOW_MS } from "#/lib/ticket-reopen-window";
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
  type EscalationRecipientRole,
  type ListEscalationRecipientsHandler,
  type FullTicket,
  type TicketActions,
  type TicketAssignees,
  type TicketDetails,
  type TicketEvent,
  type TicketPerson,
  isEscalationInitiatorRole,
  REASSIGNMENT_INITIATOR_ROLES,
  ROLE_NAME_CONFIG,
  type TicketFilters,
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

    const { assigneeId, ...ticketFields } = CreateTicketSchema.parse(payload);
    await assertRecipient(
      ESCALATION_RECIPIENT_FROM_INITIATOR[role](ticketFields.category),
      { userId: createdById, implementerId: activeImplementerId },
      assigneeId,
    );

    const ticketPayload: CreateTicketPayload = { ...ticketFields, createdById };

    await db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(tickets)
        .values({ ...ticketPayload, holderId: assigneeId })
        .returning({ id: tickets.id });
      if (!ticket) throw new Error("Ticket insert returned no row");

      await tx.insert(ticketEvents).values({
        ticketId: ticket.id,
        kind: "CREATED",
        actorId: createdById,
        assigneeId,
        reason: ticketPayload.description,
      });
    });

    refresh();
    return { success: true, message: "Successfully created ticket" };
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getTicketAssignees(): Promise<ActionResponse<TicketAssignees>> {
  try {
    const initiator = await requireAuthRole(...ESCALATION_INITIATOR_ROLES);
    const { role, implementerId } = initiator;
    if (!isEscalationInitiatorRole(role)) throw new Error("The role cannot create tickets");

    const categories = Object.values(TicketCategory);
    const recipientRoles = [
      ...new Set(categories.map((c) => ESCALATION_RECIPIENT_FROM_INITIATOR[role](c))),
    ];
    const recipientIds = await Promise.all(
      recipientRoles.map((r) => listEscalationRecipients[r](initiator)),
    );
    const people = await getUserNamesAndRolesById(recipientIds.flat(), implementerId);
    const byRole = new Map(
      recipientRoles.map((r, i) => [
        r,
        // A recipient with several memberships is shown in the role they would take it as.
        (recipientIds[i] ?? []).map((id) => ({ ...personOf(id, people), role: r })),
      ]),
    );

    return {
      success: true,
      message: "Assignees retrieved",
      data: Object.fromEntries(
        categories.map((c) => [c, byRole.get(ESCALATION_RECIPIENT_FROM_INITIATOR[role](c)) ?? []]),
      ) as TicketAssignees,
    };
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

export async function createEscalation(
  ticketId: string,
  reason: string,
  recipientId: string,
): Promise<ActionResponse> {
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

    await assertRecipient(
      nextRecipientRole,
      { userId: callerUserId, implementerId: activeImplementerId },
      recipientId,
    );
    const escalationRecipientId = recipientId;

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

export async function reopenTicket(
  ticketId: string,
  reason: string,
  recipientId: string,
): Promise<ActionResponse> {
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

      // The creator may send it back to whoever resolved it, while they are still active, or to
      // anyone a new ticket could go to.
      const returnsToHolder =
        recipientId === lockedTicket.holderId &&
        (await isActiveHolder(tx, recipientId, activeImplementerId));
      if (!returnsToHolder) {
        await assertRecipient(
          ESCALATION_RECIPIENT_FROM_INITIATOR[role](lockedTicket.category),
          { userId: callerUserId, implementerId: activeImplementerId },
          recipientId,
        );
      }
      const newHolderId = returnsToHolder ? undefined : recipientId;

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

      await assertReassignmentEligible(
        tx,
        { userId: callerUserId, role, implementerId, identifier },
        reassignedTo,
      );

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
async function isActiveHolder(
  tx: Transaction | typeof db,
  holderId: string,
  implementerId: string,
) {
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

type ReassignmentActor = {
  userId: string;
  role: ImplementerRole;
  implementerId: string;
  identifier: string | null;
};

// Another active holder of the actor's role: any admin, or a coordinator or clinical lead of
// one of the actor's hubs.
async function listReassignmentRecipients(
  q: Transaction | typeof db,
  { userId, role, implementerId, identifier }: ReassignmentActor,
) {
  const { rows } = await q.execute<{ user_id: string }>(sql`
    SELECT m.user_id
    FROM implementer_members m
    LEFT JOIN hub_coordinators hc ON m.role = 'HUB_COORDINATOR' AND hc.id = m.identifier
    LEFT JOIN clinical_leads cl ON m.role = 'CLINICAL_LEAD' AND cl.id = m.identifier
    WHERE m.role = ${role}::implementer_roles
      AND m.implementer_id = ${implementerId}
      AND m.user_id <> ${userId}
      AND m.identifier IS NOT NULL
      AND (
        m.role = 'ADMIN'
        OR (hc.archived_at IS NULL AND hc.dropped_out IS NOT TRUE AND hc.assigned_hub_id IN (
          SELECT assigned_hub_id FROM hub_coordinators WHERE id = ${identifier}))
        OR (cl.dropped_out IS NOT TRUE AND cl.assigned_hub_id IN (
          SELECT assigned_hub_id FROM clinical_leads WHERE id = ${identifier}))
      )
    ORDER BY m.created_at, m.id
  `);
  return rows.map((row) => row.user_id);
}

async function assertReassignmentEligible(
  tx: Transaction,
  actor: ReassignmentActor,
  reassignedTo: string,
): Promise<void> {
  if (!(await listReassignmentRecipients(tx, actor)).includes(reassignedTo)) {
    throw new Error(
      actor.role === "ADMIN"
        ? "Choose another admin to take it over"
        : "Choose an active colleague in your hub to take it over",
    );
  }
}

export async function getTicketDetails(ticketId: string): Promise<ActionResponse<TicketDetails>> {
  try {
    const {
      userId: callerUserId,
      role,
      implementerId,
      identifier,
    } = await requireAuthRole(...Object.values(ImplementerRole));

    const [ticketRow] = await selectTickets()
      .where(and(eq(tickets.id, ticketId), canViewTicket(callerUserId)))
      .limit(1);
    if (!ticketRow) throw new Error("Ticket not found");
    const callerHoldsTicket =
      isActiveTicketStatus(ticketRow.status) && ticketRow.holderId === callerUserId;
    // Each action's own role guard, so the page never offers one that would be refused.
    const callerHoldsTicketAs = (roles: readonly ImplementerRole[]) =>
      callerHoldsTicket && roles.includes(role);
    const recipientRole = isEscalationInitiatorRole(role)
      ? ESCALATION_RECIPIENT_FROM_INITIATOR[role](ticketRow.category)
      : null;

    // Reopen and cancel run under an initiator role, so another membership must not offer them.
    const callerCreatedTicket =
      ticketRow.createdById === callerUserId && isEscalationInitiatorRole(role);
    const { resolvedAt, holderId } = ticketRow;
    const reopenable = ticketRow.status === "RESOLVED" && mayReopenTicket(resolvedAt, new Date());
    const canReopen = callerCreatedTicket && reopenable;

    const canReassign = callerHoldsTicketAs(REASSIGNMENT_INITIATOR_ROLES);

    const [routedIds, events, holderIsActive, reassignIds] = await Promise.all([
      (callerHoldsTicket || canReopen) && recipientRole
        ? listEscalationRecipients[recipientRole]({ userId: callerUserId, implementerId })
        : [],
      db.query.ticketEvents.findMany({
        where: (e, { eq }) => eq(e.ticketId, ticketId),
        orderBy: (e, { asc }) => [asc(e.createdAt), asc(e.id)],
      }),
      canReopen && isActiveHolder(db, holderId, implementerId),
      canReassign
        ? listReassignmentRecipients(db, { userId: callerUserId, role, implementerId, identifier })
        : [],
    ]);
    // A reopened ticket goes back to whoever resolved it unless the creator picks someone else.
    const recipientIds = holderIsActive
      ? [holderId, ...routedIds.filter((id) => id !== holderId)]
      : routedIds;
    const people = await getUserNamesAndRolesById(
      [
        ticketRow.createdById,
        ticketRow.holderId,
        ...events.flatMap((e) => [e.actorId, e.assigneeId].filter((id) => id !== null)),
        ...recipientIds,
        ...reassignIds,
      ],
      implementerId,
    );
    const ticket = toFullTicket(ticketRow, people);

    const actions: TicketActions = {
      canStart: callerHoldsTicketAs(ESCALATION_RECIPIENT_ROLES) && ticket.status !== "IN_PROGRESS",
      canChangePriority: callerHoldsTicketAs(ESCALATION_RECIPIENT_ROLES),
      canEscalate: callerHoldsTicketAs(ESCALATION_INITIATOR_ROLES),
      canReassign,
      canResolve: callerHoldsTicketAs(ESCALATION_RECIPIENT_ROLES),
      canReopen,
      canCancel: callerCreatedTicket && mayCancelTicket(ticket),
    };

    return {
      success: true,
      message: "Ticket retrieved",
      data: {
        viewerId: callerUserId,
        // A recipient with several memberships is shown in the role they would take it as.
        // The resolver keeps their own role, which may be above the routing's.
        recipients: recipientIds.map((id) =>
          holderIsActive && id === holderId
            ? personOf(id, people)
            : { ...personOf(id, people), role: recipientRole },
        ),
        reassignRecipients: reassignIds.map((id) => ({ ...personOf(id, people), role })),
        ticket,
        actions,
        reopenableUntil:
          reopenable && resolvedAt ? new Date(resolvedAt.getTime() + REOPEN_WINDOW_MS) : null,
        events: events.map((e): TicketEvent => ({
          id: e.id,
          kind: e.kind,
          actor: e.actorId ? personOf(e.actorId, people) : null,
          assignee: e.assigneeId ? personOf(e.assigneeId, people) : null,
          fromValue: e.fromValue,
          toValue: e.toValue,
          reason: e.reason,
          createdAt: e.createdAt,
        })),
      },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

function selectTickets() {
  return db
    .select({
      id: tickets.id,
      visibleId: tickets.visibleId,
      subject: tickets.subject,
      description: tickets.description,
      category: tickets.category,
      status: tickets.status,
      priority: tickets.priority,
      createdAt: tickets.createdAt,
      createdById: tickets.createdById,
      holderId: tickets.holderId,
      resolvedAt: tickets.resolvedAt,
    })
    .from(tickets);
}

function personOf(userId: string, people: UserRoleNameMap): TicketPerson {
  const person = people.get(userId);
  return { userId, name: person?.name ?? null, role: person?.role ?? null };
}

function toFullTicket(
  {
    createdById,
    holderId,
    resolvedAt: _resolvedAt,
    ...row
  }: Awaited<ReturnType<ReturnType<typeof selectTickets>["where"]>>[number],
  people: UserRoleNameMap,
): FullTicket {
  return {
    ...row,
    createdBy: personOf(createdById, people),
    holder: personOf(holderId, people),
  };
}

async function fetchTicketsForUser(
  userId: string,
  implementerId: string,
  filters: TicketFilters,
): Promise<FullTicket[]> {
  const rows = await selectTickets()
    .where(
      and(canViewTicket(userId), filters.status ? eq(tickets.status, filters.status) : undefined),
    )
    .orderBy(desc(tickets.createdAt));

  const people = await getUserNamesAndRolesById(
    Array.from(new Set(rows.flatMap((r) => [r.createdById, r.holderId]))),
    implementerId,
  );

  return rows.map((row) => toFullTicket(row, people));
}

const listEscalationRecipients: Record<EscalationRecipientRole, ListEscalationRecipientsHandler> = {
  SUPERVISOR: async ({ userId, implementerId }) => {
    const { rows: result } = await db.execute<{ supervisor_user_id: string }>(sql`
      SELECT im2.user_id AS supervisor_user_id
      FROM implementer_members im1
      JOIN fellows f ON f.id = im1.identifier
      JOIN supervisors s ON s.id = f.supervisor_id
      JOIN implementer_members im2 ON im2.identifier = s.id
      WHERE im1.user_id = ${userId}
        AND im1.role = 'FELLOW'
        AND im1.implementer_id = ${implementerId}
        AND im2.role = 'SUPERVISOR'
        AND im2.implementer_id = ${implementerId}
        AND s.archived_at IS NULL
        AND s.dropped_out IS NOT TRUE
      ORDER BY im2.created_at, im2.id;
    `);
    return result.map((row) => row.supervisor_user_id);
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
    `);
    return result.map((row) => row.hub_coordinator_user_id);
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
    `);
    return result.map((row) => row.clinical_lead_user_id);
  },
  ADMIN: async ({ implementerId }) => {
    // Oldest first, so adding admins, or an admin of another implementer, never changes who
    // receives a ticket by default.
    const recipients = await db
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
      .orderBy(asc(adminUser.createdAt), asc(adminUser.id));
    return recipients.map((recipient) => recipient.userId);
  },
};

// The caller picks the recipient, so check they are one the routing allows.
async function assertRecipient(
  role: EscalationRecipientRole,
  initiator: Parameters<ListEscalationRecipientsHandler>[0],
  recipientId: string,
) {
  const recipients = await listEscalationRecipients[role](initiator);
  if (!recipients.includes(recipientId)) throw new Error("Choose someone who can take this ticket");
}

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
