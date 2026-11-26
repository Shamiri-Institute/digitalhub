"use server";

import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { refresh } from "next/cache";

import { db, type Transaction } from "#/db/client";
import { type AdminTeam, ImplementerRole, TicketCategory, type TicketStatus } from "#/db/enums";
import {
  adminUser,
  clinicalLead,
  clinicalTeam,
  hubCoordinator,
  implementerMember,
  supervisor,
  ticketEvents,
  tickets,
} from "#/db/schema";
import { NotFoundError, requireAuthRole } from "#/lib/auth/require-auth-role";
import { mayReopenTicket, REOPEN_WINDOW_DAYS, REOPEN_WINDOW_MS } from "#/lib/ticket-reopen-window";
import type { ActionResponse } from "#/types/actions.types";
import {
  ACTIVE_TICKET_STATUSES,
  ADMIN_TEAM_FROM_CATEGORY,
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
  EXTRA_RECIPIENT_ROLES_FROM_INITIATOR,
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
      { userId: createdById, implementerId: activeImplementerId },
      role,
      ticketFields.category,
      false,
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
    // Categories that share a recipient role, or an admin team, share one lookup.
    const lookups = new Map<string, Promise<string[]>>();
    const cachedRecipientsFor: ListRecipients = (recipientRole, recipientTeam) => {
      const key = recipientRole === "ADMIN" ? recipientTeam : recipientRole;
      const lookup =
        lookups.get(key) ??
        listEscalationRecipients[recipientRole]({ ...initiator, role, recipientTeam });
      lookups.set(key, lookup);
      return lookup;
    };
    const recipientsByCategory = await Promise.all(
      categories.map((c) => routeRecipients(initiator, role, c, false, db, cachedRecipientsFor)),
    );
    const people = await getUserNamesAndRolesById(
      recipientsByCategory.flat().map((recipient) => recipient.userId),
      implementerId,
    );

    return {
      success: true,
      message: "Assignees retrieved",
      data: Object.fromEntries(
        categories.map((c, i) => [
          c,
          // A recipient with several memberships is shown in the role they would take it as.
          (recipientsByCategory[i] ?? []).map((recipient) => ({
            ...personOf(recipient.userId, people),
            role: recipient.role,
          })),
        ]),
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
      identifier,
    } = await requireAuthRole(...ESCALATION_INITIATOR_ROLES);
    const escalationReason = TicketReasonSchema.parse(reason);

    if (!isEscalationInitiatorRole(role)) throw new Error("The role cannot create escalations");
    if (await isTopTier(role, identifier)) {
      throw new Error("The Tech team is the top tier, so reassign the ticket instead");
    }
    const ticket = await db.query.tickets.findFirst({
      where: (t, { eq }) => eq(t.id, ticketId),
      columns: { category: true },
    });
    if (!ticket) throw new Error("Ticket not found");

    await assertRecipient(
      { userId: callerUserId, implementerId: activeImplementerId },
      role,
      ticket.category,
      true,
      recipientId,
    );

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
          assigneeId: recipientId,
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
        (await isActiveHolder(tx, recipientId, activeImplementerId, callerUserId));
      if (!returnsToHolder) {
        await assertRecipient(
          { userId: callerUserId, implementerId: activeImplementerId },
          role,
          lockedTicket.category,
          false,
          recipientId,
          tx,
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

// The hubs a user leads as a clinical lead, as a subquery.
function clinicalLeadHubs(q: Transaction | typeof db, userId: string, implementerId: string) {
  return q
    .select({ hubId: clinicalLead.assignedHubId })
    .from(implementerMember)
    .innerJoin(clinicalLead, eq(clinicalLead.id, implementerMember.identifier))
    .where(
      and(
        eq(implementerMember.userId, userId),
        eq(implementerMember.role, "CLINICAL_LEAD"),
        eq(implementerMember.implementerId, implementerId),
      ),
    );
}

// The same archived and dropped-out rules the escalation routing applies to each role. A clinical
// team member must still be in one of the creator's clinical lead hubs.
async function isActiveHolder(
  tx: Transaction | typeof db,
  holderId: string,
  implementerId: string,
  creatorId: string,
) {
  const { rows } = await tx.execute(sql`
    SELECT 1
    FROM implementer_members m
    LEFT JOIN supervisors s ON m.role = 'SUPERVISOR' AND s.id = m.identifier
    LEFT JOIN hub_coordinators hc ON m.role = 'HUB_COORDINATOR' AND hc.id = m.identifier
    LEFT JOIN clinical_leads cl ON m.role = 'CLINICAL_LEAD' AND cl.id = m.identifier
    LEFT JOIN clinical_teams ct ON m.role = 'CLINICAL_TEAM' AND ct.id = m.identifier
    WHERE m.user_id = ${holderId}
      AND m.implementer_id = ${implementerId}
      AND (
        m.role = 'ADMIN'
        OR (s.archived_at IS NULL AND s.dropped_out IS NOT TRUE AND s.id IS NOT NULL)
        OR (hc.archived_at IS NULL AND hc.dropped_out IS NOT TRUE AND hc.id IS NOT NULL)
        OR (cl.dropped_out IS NOT TRUE AND cl.id IS NOT NULL)
        OR ct.assigned_hub_id IN ${clinicalLeadHubs(tx, creatorId, implementerId)}
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

// Another active holder of the actor's role: any admin, or a supervisor, coordinator, clinical
// lead or clinical team member of one of the actor's hubs.
async function listReassignmentRecipients(
  q: Transaction | typeof db,
  { userId, role, implementerId, identifier }: ReassignmentActor,
) {
  const colleagues = and(
    eq(implementerMember.role, role),
    eq(implementerMember.implementerId, implementerId),
    ne(implementerMember.userId, userId),
    isNotNull(implementerMember.identifier),
  );
  const byAge = [asc(implementerMember.createdAt), asc(implementerMember.id)];
  const userIdOf = { userId: implementerMember.userId };

  let rows: { userId: string }[] = [];
  if (role === "ADMIN") {
    rows = await q
      .select(userIdOf)
      .from(implementerMember)
      .where(colleagues)
      .orderBy(...byAge);
  } else if (role === "SUPERVISOR" && identifier) {
    const actorHubs = q
      .select({ hubId: supervisor.hubId })
      .from(supervisor)
      .where(eq(supervisor.id, identifier));
    rows = await q
      .select(userIdOf)
      .from(implementerMember)
      .innerJoin(supervisor, eq(supervisor.id, implementerMember.identifier))
      .where(
        and(
          colleagues,
          isNull(supervisor.archivedAt),
          or(eq(supervisor.droppedOut, false), isNull(supervisor.droppedOut)),
          inArray(supervisor.hubId, actorHubs),
        ),
      )
      .orderBy(...byAge);
  } else if (role === "HUB_COORDINATOR" && identifier) {
    const actorHubs = q
      .select({ hubId: hubCoordinator.assignedHubId })
      .from(hubCoordinator)
      .where(eq(hubCoordinator.id, identifier));
    rows = await q
      .select(userIdOf)
      .from(implementerMember)
      .innerJoin(hubCoordinator, eq(hubCoordinator.id, implementerMember.identifier))
      .where(
        and(
          colleagues,
          isNull(hubCoordinator.archivedAt),
          or(eq(hubCoordinator.droppedOut, false), isNull(hubCoordinator.droppedOut)),
          inArray(hubCoordinator.assignedHubId, actorHubs),
        ),
      )
      .orderBy(...byAge);
  } else if (role === "CLINICAL_LEAD" && identifier) {
    const actorHubs = q
      .select({ hubId: clinicalLead.assignedHubId })
      .from(clinicalLead)
      .where(eq(clinicalLead.id, identifier));
    rows = await q
      .select(userIdOf)
      .from(implementerMember)
      .innerJoin(clinicalLead, eq(clinicalLead.id, implementerMember.identifier))
      .where(
        and(
          colleagues,
          or(eq(clinicalLead.droppedOut, false), isNull(clinicalLead.droppedOut)),
          inArray(clinicalLead.assignedHubId, actorHubs),
        ),
      )
      .orderBy(...byAge);
  } else if (role === "CLINICAL_TEAM" && identifier) {
    const actorHubs = q
      .select({ hubId: clinicalTeam.assignedHubId })
      .from(clinicalTeam)
      .where(eq(clinicalTeam.id, identifier));
    rows = await q
      .select(userIdOf)
      .from(implementerMember)
      .innerJoin(clinicalTeam, eq(clinicalTeam.id, implementerMember.identifier))
      .where(and(colleagues, inArray(clinicalTeam.assignedHubId, actorHubs)))
      .orderBy(...byAge);
  }
  return rows.map((row) => row.userId);
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
    if (!ticketRow) throw new NotFoundError("Ticket");
    const callerHoldsTicket =
      isActiveTicketStatus(ticketRow.status) && ticketRow.holderId === callerUserId;
    // Each action's own role guard, so the page never offers one that would be refused.
    const callerHoldsTicketAs = (roles: readonly ImplementerRole[]) =>
      callerHoldsTicket && roles.includes(role);
    const initiatorRole = isEscalationInitiatorRole(role) ? role : null;

    // Reopen and cancel run under an initiator role, so another membership must not offer them.
    const callerCreatedTicket =
      ticketRow.createdById === callerUserId && isEscalationInitiatorRole(role);
    const { resolvedAt, holderId } = ticketRow;
    const reopenable = ticketRow.status === "RESOLVED" && mayReopenTicket(resolvedAt, new Date());
    const canReopen = callerCreatedTicket && reopenable;

    const canReassign = callerHoldsTicketAs(REASSIGNMENT_INITIATOR_ROLES);
    const canEscalate =
      callerHoldsTicketAs(ESCALATION_INITIATOR_ROLES) && !(await isTopTier(role, identifier));

    // Previous and next follow the list's order, newest first, through the tickets the caller
    // holds when they hold this one, so a holder can work through their queue. The comparison stays
    // in SQL because created_at keeps microseconds that a Date would drop.
    const neighbourScope = and(
      canViewTicket(callerUserId),
      holderId === callerUserId ? eq(tickets.holderId, callerUserId) : undefined,
    );
    const position = sql`(${tickets.createdAt}, ${tickets.id})`;
    const thisTicket = sql`(SELECT ${tickets.createdAt}, ${tickets.id} FROM ${tickets} WHERE ${tickets.id} = ${ticketId})`;
    const sibling = { id: tickets.id, visibleId: tickets.visibleId };

    const [routedRecipients, events, holderIsActive, reassignIds, [previous], [next]] =
      await Promise.all([
        (canEscalate || canReopen) && initiatorRole
          ? routeRecipients(
              { userId: callerUserId, implementerId },
              initiatorRole,
              ticketRow.category,
              canEscalate,
            )
          : [],
        db.query.ticketEvents.findMany({
          where: (e, { eq }) => eq(e.ticketId, ticketId),
          orderBy: (e, { asc }) => [asc(e.createdAt), asc(e.id)],
        }),
        canReopen && isActiveHolder(db, holderId, implementerId, callerUserId),
        canReassign
          ? listReassignmentRecipients(db, {
              userId: callerUserId,
              role,
              implementerId,
              identifier,
            })
          : [],
        db
          .select(sibling)
          .from(tickets)
          .where(and(neighbourScope, sql`${position} > ${thisTicket}`))
          .orderBy(asc(tickets.createdAt), asc(tickets.id))
          .limit(1),
        db
          .select(sibling)
          .from(tickets)
          .where(and(neighbourScope, sql`${position} < ${thisTicket}`))
          .orderBy(desc(tickets.createdAt), desc(tickets.id))
          .limit(1),
      ]);
    const routedIds = routedRecipients.map((recipient) => recipient.userId);
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
      canEscalate,
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
            : {
                ...personOf(id, people),
                role: routedRecipients.find((recipient) => recipient.userId === id)?.role ?? null,
              },
        ),
        reassignRecipients: reassignIds.map((id) => ({ ...personOf(id, people), role })),
        ticket,
        previous: previous ?? null,
        next: next ?? null,
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
    // Only a missing ticket becomes a not-found page; anything else reaches the error boundary.
    if (!(error instanceof NotFoundError)) throw error;
    return { success: false, message: error.message };
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
      closedAt: tickets.closedAt,
    })
    .from(tickets);
}

export type TicketRow = Awaited<ReturnType<ReturnType<typeof selectTickets>["where"]>>[number];

function personOf(userId: string, people: UserRoleNameMap): TicketPerson {
  const person = people.get(userId);
  return {
    userId,
    name: person?.name ?? null,
    role: person?.role ?? null,
    team: person?.team ?? null,
  };
}

function toFullTicket(
  { createdById, holderId, ...ticketFields }: TicketRow,
  people: UserRoleNameMap,
): FullTicket {
  return {
    ...ticketFields,
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
    .orderBy(desc(tickets.createdAt), desc(tickets.id));

  const people = await getUserNamesAndRolesById(
    Array.from(new Set(rows.flatMap((r) => [r.createdById, r.holderId]))),
    implementerId,
  );

  return rows.map((row) => toFullTicket(row, people));
}

const listEscalationRecipients: Record<EscalationRecipientRole, ListEscalationRecipientsHandler> = {
  SUPERVISOR: async ({ userId, implementerId }, q = db) => {
    const { rows: result } = await q.execute<{ supervisor_user_id: string }>(sql`
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
  HUB_COORDINATOR: async ({ userId, implementerId }, q = db) => {
    const { rows: result } = await q.execute<{ hub_coordinator_user_id: string }>(sql`
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
  CLINICAL_LEAD: async ({ userId, implementerId }, q = db) => {
    const initiatorHubs = q
      .select({ hubId: supervisor.hubId })
      .from(implementerMember)
      .innerJoin(supervisor, eq(supervisor.id, implementerMember.identifier))
      .where(
        and(
          eq(implementerMember.userId, userId),
          eq(implementerMember.role, "SUPERVISOR"),
          eq(implementerMember.implementerId, implementerId),
        ),
      );
    const clinicalLeads = await q
      .select({ userId: implementerMember.userId })
      .from(clinicalLead)
      .innerJoin(
        implementerMember,
        and(
          eq(implementerMember.identifier, clinicalLead.id),
          eq(implementerMember.role, "CLINICAL_LEAD"),
        ),
      )
      .where(
        and(
          inArray(clinicalLead.assignedHubId, initiatorHubs),
          or(eq(clinicalLead.droppedOut, false), isNull(clinicalLead.droppedOut)),
          ne(implementerMember.userId, userId),
        ),
      )
      .orderBy(asc(clinicalLead.createdAt), asc(clinicalLead.id));
    return clinicalLeads.map((clinicalLeadMember) => clinicalLeadMember.userId);
  },
  CLINICAL_TEAM: async ({ userId, implementerId }, q = db) => {
    // Only clinical leads send tickets to their hub's clinical team.
    const clinicalTeamMembers = await q
      .select({ userId: implementerMember.userId })
      .from(clinicalTeam)
      .innerJoin(
        implementerMember,
        and(
          eq(implementerMember.identifier, clinicalTeam.id),
          eq(implementerMember.role, "CLINICAL_TEAM"),
        ),
      )
      .where(
        and(
          inArray(clinicalTeam.assignedHubId, clinicalLeadHubs(q, userId, implementerId)),
          ne(implementerMember.userId, userId),
        ),
      )
      .orderBy(asc(clinicalTeam.createdAt), asc(clinicalTeam.id));
    return clinicalTeamMembers.map((clinicalTeamMember) => clinicalTeamMember.userId);
  },
  ADMIN: async ({ userId, implementerId, recipientTeam }, q = db) => {
    // Oldest first, so adding admins, or an admin of another implementer, never changes who
    // receives a ticket by default.
    const adminsMatching = (filter: SQL) =>
      q
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
        .where(
          and(
            eq(adminUser.implementerId, implementerId),
            ne(implementerMember.userId, userId),
            filter,
          ),
        )
        .orderBy(asc(adminUser.createdAt), asc(adminUser.id));
    const onTeam = await adminsMatching(eq(adminUser.team, recipientTeam));
    const recipients =
      onTeam.length > 0 ? onTeam : await adminsMatching(eq(adminUser.isSuperAdmin, true));
    return recipients.map((recipient) => recipient.userId);
  },
};

type RoutedRecipient = { userId: string; role: EscalationRecipientRole };
type ListRecipients = (
  role: EscalationRecipientRole,
  recipientTeam: AdminTeam,
) => Promise<string[]>;

// Who a ticket goes to from the initiator, the default first. An admin escalates to the Tech team;
// otherwise admin recipients are on the team the ticket's category names.
async function routeRecipients(
  initiator: { userId: string; implementerId: string },
  initiatorRole: EscalationInitiatorRole,
  category: TicketCategory,
  escalating: boolean,
  q: Transaction | typeof db = db,
  list: ListRecipients = (role, recipientTeam) =>
    listEscalationRecipients[role]({ ...initiator, role: initiatorRole, recipientTeam }, q),
): Promise<RoutedRecipient[]> {
  const recipientTeam: AdminTeam =
    initiatorRole === "ADMIN" && escalating ? "TECH" : ADMIN_TEAM_FROM_CATEGORY[category];
  const recipientRoles = [
    ESCALATION_RECIPIENT_FROM_INITIATOR[initiatorRole](category),
    ...(EXTRA_RECIPIENT_ROLES_FROM_INITIATOR[initiatorRole] ?? []),
  ];
  const recipientIdsByRole = await Promise.all(
    recipientRoles.map((role) => list(role, recipientTeam)),
  );
  const routed = recipientRoles.flatMap((role, i) =>
    (recipientIdsByRole[i] ?? []).map((userId) => ({ userId, role })),
  );
  // Someone with several memberships is offered once, in the first role that reaches them.
  return routed.filter(
    (recipient, i) => routed.findIndex((earlier) => earlier.userId === recipient.userId) === i,
  );
}

// The caller picks the recipient, so check they are one the routing allows.
async function assertRecipient(
  initiator: { userId: string; implementerId: string },
  initiatorRole: EscalationInitiatorRole,
  category: TicketCategory,
  escalating: boolean,
  recipientId: string,
  q: Transaction | typeof db = db,
) {
  const recipients = await routeRecipients(initiator, initiatorRole, category, escalating, q);
  if (!recipients.some((recipient) => recipient.userId === recipientId))
    throw new Error("Choose someone who can take this ticket");
}

// Tickets climb to the Tech team, so its admins have no one above them to escalate to.
async function isTopTier(role: ImplementerRole, identifier: string | null) {
  if (role !== "ADMIN" || !identifier) return false;
  const admin = await db.query.adminUser.findFirst({
    where: (a, { eq }) => eq(a.id, identifier),
    columns: { team: true },
  });
  return admin?.team === "TECH";
}

async function getUserNamesAndRolesById(
  userIds: string[],
  implementerId: string,
): Promise<UserRoleNameMap> {
  const result: UserRoleNameMap = new Map();
  if (userIds.length === 0) return result;

  const coalesceSql = ROLE_NAME_CONFIG.map((c) => `${c.table}.${c.column}`).join(", ");
  const joinsSql = ROLE_NAME_CONFIG.map(
    (c) =>
      `LEFT JOIN ${c.table} ON ${c.table}.id = im.identifier AND im.role = '${c.role}'::implementer_roles`,
  ).join("\n");

  const { rows } = await db.execute<{
    user_id: string;
    role: ImplementerRole;
    name: string | null;
    team: AdminTeam | null;
  }>(sql`
    SELECT
      im.user_id,
      im.role::text AS role,
      COALESCE(${sql.raw(coalesceSql)}) AS name,
      admin_users.team::text AS team
    FROM implementer_members im
    ${sql.raw(joinsSql)}
    WHERE ${inArray(sql`im.user_id`, userIds)}
      AND im.implementer_id = ${implementerId}
  `);

  for (const row of rows) {
    // Another membership's row has no team, so it must not hide the admin one's.
    const team = row.team ?? result.get(row.user_id)?.team ?? null;
    result.set(`${row.user_id}`, { role: row.role, name: row.name, team });
  }

  return result;
}
