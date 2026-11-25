import type { Page } from "@playwright/test";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { type AdminTeam, TEAM_LABELS } from "#/db/enums";
import { techAdminEmail } from "#/db/seed/fixtures";
import {
  adminUser,
  fellow,
  hubCoordinator,
  implementerMember,
  supervisor,
  ticketEvents,
  tickets,
} from "#/db/schema";
import { expect, test, type Undo } from "#/tests/fixtures";
import {
  createAdminCopy,
  deleteTickets,
  oldestAdminName,
  required,
  signableMember,
  signIn,
  uniqueSuffix,
} from "#/tests/helpers";
import { cellUnder, getUrl, searchRows } from "#/tests/pages/helpers";
import {
  activity,
  createTicket,
  fillAction,
  heldBy,
  openTicket,
  submitAction,
  takeAction,
} from "#/tests/pages/tickets";

// Hub coordinators reassign to each other and the sign-ins share people, so the tests take turns.
test.describe.configure({ mode: "serial" });

type Hub = {
  implementerId: string;
  supervisorEmail: string;
  supervisorUserId: string;
  supervisorId: string;
  supervisorName: string;
  bystanderEmail: string;
  bystanderSupervisorId: string;
  bystanderName: string;
  coordinatorEmail: string;
  coordinatorName: string;
  coordinatorId: string;
  otherCoordinatorId: string;
  otherCoordinatorName: string;
  otherCoordinatorEmail: string;
  leadEmail: string;
  adminUserId: string;
};

const subjectPrefix = `E2E ticket routing ${uniqueSuffix()}`;
let hub: Hub;

// Two supervisors, two hub coordinators and a clinical lead of one hub, each able to sign in.
test.beforeAll(async () => {
  const {
    rows: [row],
  } = await db.execute<Hub>(sql`
    select sm.implementer_id as "implementerId", su.email as "supervisorEmail",
      su.id as "supervisorUserId", sv.id as "supervisorId", sv.supervisor_name as "supervisorName", bu.email as "bystanderEmail", bv.id as "bystanderSupervisorId",
      bv.supervisor_name as "bystanderName",
      hu.email as "coordinatorEmail", hc.coordinator_name as "coordinatorName", hc.id as "coordinatorId", hc2.id as "otherCoordinatorId",
      hc2.coordinator_name as "otherCoordinatorName", h2u.email as "otherCoordinatorEmail",
      lu.email as "leadEmail", am.user_id as "adminUserId"
    from supervisors sv
    join implementer_members sm on sm.identifier = sv.id and sm.role = 'SUPERVISOR'
      and ${signableMember("sm")}
    join users su on su.id = sm.user_id
    join supervisors bv on bv.hub_id = sv.hub_id and bv.id <> sv.id and bv.archived_at is null
      and bv.dropped_out is not true and bv.supervisor_name is not null
    join implementer_members bm on bm.identifier = bv.id and bm.role = 'SUPERVISOR'
      and ${signableMember("bm")}
    join users bu on bu.id = bm.user_id
    join hub_coordinators hc on hc.assigned_hub_id = sv.hub_id and hc.archived_at is null
      and hc.coordinator_name is not null
    join implementer_members hm on hm.identifier = hc.id and hm.role = 'HUB_COORDINATOR'
      and ${signableMember("hm")}
    join users hu on hu.id = hm.user_id
    join hub_coordinators hc2 on hc2.assigned_hub_id = sv.hub_id and hc2.id <> hc.id
      and hc2.archived_at is null and hc2.coordinator_name is not null
    join implementer_members h2m on h2m.identifier = hc2.id and h2m.role = 'HUB_COORDINATOR'
      and ${signableMember("h2m")}
    join users h2u on h2u.id = h2m.user_id
    join clinical_leads cl on cl.assigned_hub_id = sv.hub_id
    join implementer_members lm on lm.identifier = cl.id and lm.role = 'CLINICAL_LEAD'
      and ${signableMember("lm")}
    join users lu on lu.id = lm.user_id
    join implementer_members am on am.role = 'ADMIN' and am.implementer_id = sm.implementer_id
      and ${signableMember("am")}
    where sv.supervisor_name is not null and sv.archived_at is null and sv.dropped_out is not true
      and exists (select 1 from fellows f
        join implementer_members fm on fm.identifier = f.id and fm.role = 'FELLOW'
        where f.supervisor_id = sv.id)
      and (select count(*) from clinical_leads o where o.assigned_hub_id = sv.hub_id) = 1
      and (select count(*) from hub_coordinators o where o.assigned_hub_id = sv.hub_id) = 2
    order by sv.id, bv.id, hc.id
    limit 1`);
  required(
    row,
    "a hub with two supervisors, one active with fellows, two hub coordinators and one clinical lead",
  );
  hub = row;
});

test.afterAll(() => deleteTickets(subjectPrefix));

async function act(page: Page, path: string, subject: string, action: string, reason: string) {
  await openTicket(page, path, subject);
  return fillAction(page, action, reason);
}

test("a supervisor's ticket goes to the hub role its category names", async ({ page, context }) => {
  const techSubject = `${subjectPrefix} tech`;
  const clinicalSubject = `${subjectPrefix} clinical`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", techSubject, "TECH");
  await createTicket(page, "/sc/tickets", clinicalSubject, "CLINICAL");

  await signIn(context, hub.coordinatorEmail);
  // Each lands with the one active holder of its role, who sees it as theirs.
  await expect(await heldBy(page, "/hc/tickets", techSubject)).toHaveText("You");
  await expect(await searchRows(page, clinicalSubject)).toHaveCount(0);

  await signIn(context, hub.leadEmail);
  await expect(await heldBy(page, "/cl/tickets", clinicalSubject)).toHaveText("You");
  await expect(await searchRows(page, techSubject)).toHaveCount(0);

  // A supervisor who took no part in either ticket sees neither.
  await signIn(context, hub.bystanderEmail);
  await page.goto(getUrl("/sc/tickets"));
  await expect(await searchRows(page, subjectPrefix)).toHaveCount(0);
});

test("someone with no part in a ticket cannot open it by its address", async ({
  page,
  context,
}) => {
  const subject = `${subjectPrefix} guessed id`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "TECH");
  await openTicket(page, "/sc/tickets", subject);
  const address = page.url();

  // The page streams behind its loading state, so the status is already 200; check what shows.
  await signIn(context, hub.bystanderEmail);
  await page.goto(address);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: subject })).toHaveCount(0);
});

test("a supervisor can assign a new ticket to any coordinator of their hub", async ({
  page,
  context,
}) => {
  const subject = `${subjectPrefix} assigned`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "TECH", hub.otherCoordinatorName);

  await signIn(context, hub.otherCoordinatorEmail);
  await expect(await heldBy(page, "/hc/tickets", subject)).toHaveText("You");
});

test("only the holder escalates or resolves, and a resolution is shown to the creator", async ({
  page,
  context,
}) => {
  const subject = `${subjectPrefix} resolve`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "TECH");
  let step = await openTicket(page, "/sc/tickets", subject);
  await expect(step.getByRole("button", { name: "Escalate" })).toHaveCount(0);
  await expect(step.getByRole("button", { name: "Resolve" })).toHaveCount(0);

  await signIn(context, hub.coordinatorEmail);
  await act(page, "/hc/tickets", subject, "Resolve", "Fixed the laptop.");
  await submitAction(page, "Resolve");
  step = await openTicket(page, "/hc/tickets", subject);
  await expect(step.getByRole("button", { name: "Escalate" })).toHaveCount(0);
  await expect(step.getByRole("button", { name: "Resolve" })).toHaveCount(0);

  await signIn(context, hub.supervisorEmail);
  await openTicket(page, "/sc/tickets", subject);
  await expect(activity(page)).toContainText("Fixed the laptop.");
});

test("a hub coordinator reassigns to an active coordinator of the hub, who may pass it on again", async ({
  page,
  context,
}) => {
  const subject = `${subjectPrefix} reassign`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "OPERATIONS");

  await signIn(context, hub.coordinatorEmail);
  const reassign = await act(page, "/hc/tickets", subject, "Reassign", "On leave.");
  await reassign.getByRole("combobox").click();
  await page.getByRole("option", { name: new RegExp(hub.otherCoordinatorName) }).click();
  await submitAction(page, "Reassign");

  // The earlier holder can still see the ticket, and its history names the new holder.
  await openTicket(page, "/hc/tickets", subject);
  await expect(activity(page)).toContainText(`Sent to ${hub.otherCoordinatorName}`);

  await signIn(context, hub.otherCoordinatorEmail);
  await expect(await heldBy(page, "/hc/tickets", subject)).toHaveText("You");
  // A reassign is a handover at the same tier, not an escalation.
  await expect(await cellUnder(page, await searchRows(page, subject), "Status")).toHaveText("Open");
  // Reassigns are not limited, so a wrong one can be passed on, and the history stays in reach.
  const step = await openTicket(page, "/hc/tickets", subject);
  await expect(step.getByRole("button", { name: "Reassign" })).toBeVisible();
  await expect(activity(page)).toContainText("On leave.");

  // The new holder escalates to an admin, so the admin may reassign this new escalation.
  const oldest = await oldestAdminName(hub.implementerId, eq(adminUser.team, "OPERATIONS"));
  await takeAction(page, "Escalate", "Needs an admin.");
  await expect(await heldBy(page, "/hc/tickets", subject)).toContainText(oldest);

  // Each escalation keeps its reason and the roles it went between, for every participant.
  await signIn(context, hub.supervisorEmail);
  await openTicket(page, "/sc/tickets", subject);
  await expect(activity(page)).toContainText("Needs an admin.");
  await expect(activity(page)).toContainText("Hub manager");
  await expect(activity(page)).toContainText("Admin");
});

for (const [state, inactive] of [
  ["An archived", { archivedAt: new Date() }],
  ["A dropped-out", { droppedOut: true }],
] as const) {
  test(`${state} hub coordinator cannot receive a reassigned ticket`, async ({
    page,
    context,
    undo,
  }) => {
    const subject = `${subjectPrefix} ${state.toLowerCase()} reassign`;
    const [otherCoordinator] = await db
      .select({ archivedAt: hubCoordinator.archivedAt, droppedOut: hubCoordinator.droppedOut })
      .from(hubCoordinator)
      .where(eq(hubCoordinator.id, hub.otherCoordinatorId));
    required(otherCoordinator, "the hub's other coordinator");
    await db
      .update(hubCoordinator)
      .set(inactive)
      .where(eq(hubCoordinator.id, hub.otherCoordinatorId));
    undo(() =>
      db
        .update(hubCoordinator)
        .set(otherCoordinator)
        .where(eq(hubCoordinator.id, hub.otherCoordinatorId)),
    );
    await signIn(context, hub.supervisorEmail);
    await createTicket(page, "/sc/tickets", subject, "CARE");

    await signIn(context, hub.coordinatorEmail);
    const reassign = await act(page, "/hc/tickets", subject, "Reassign", "On leave.");
    // The hub's only other coordinator is inactive, so no one is offered.
    await expect(reassign).toContainText("No one is available to take this ticket");
  });
}

for (const [state, inactive] of [
  ["an archived", { archivedAt: new Date() }],
  ["a dropped-out", { droppedOut: true }],
] as const) {
  test(`a supervisor's ticket skips ${state} hub coordinator`, async ({ page, context, undo }) => {
    const subject = `${subjectPrefix} skips ${state}`;
    // Deactivate the coordinator routing would pick first, so only the filter keeps it from the ticket.
    const [firstCoordinator] = await db
      .select({
        id: hubCoordinator.id,
        archivedAt: hubCoordinator.archivedAt,
        droppedOut: hubCoordinator.droppedOut,
      })
      .from(hubCoordinator)
      .where(inArray(hubCoordinator.id, [hub.coordinatorId, hub.otherCoordinatorId]))
      .orderBy(hubCoordinator.createdAt, hubCoordinator.id)
      .limit(1);
    required(firstCoordinator, "the hub's first coordinator");
    await db.update(hubCoordinator).set(inactive).where(eq(hubCoordinator.id, firstCoordinator.id));
    undo(() =>
      db
        .update(hubCoordinator)
        .set({ archivedAt: firstCoordinator.archivedAt, droppedOut: firstCoordinator.droppedOut })
        .where(eq(hubCoordinator.id, firstCoordinator.id)),
    );

    await signIn(context, hub.supervisorEmail);
    await createTicket(page, "/sc/tickets", subject, "TECH");

    const activeEmail =
      firstCoordinator.id === hub.coordinatorId ? hub.otherCoordinatorEmail : hub.coordinatorEmail;
    await signIn(context, activeEmail);
    // Resolve shows only to the holder, so this proves routing skipped the inactive coordinator.
    const step = await openTicket(page, "/hc/tickets", subject);
    await expect(step.getByRole("button", { name: "Resolve" })).toBeVisible();
  });
}

test("a ticket reopened after its resolver dropped out goes to an active hub coordinator", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} reopen after dropout`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "TECH");

  const {
    rows: [resolver],
  } = await db.execute<{ coordinatorId: string; droppedOut: boolean | null }>(sql`
    select hc.id as "coordinatorId", hc.dropped_out as "droppedOut"
    from tickets t
    join implementer_members m on m.user_id = t.holder_id and m.role = 'HUB_COORDINATOR'
    join hub_coordinators hc on hc.id = m.identifier
    where t.subject = ${subject}`);
  required(resolver, "the hub coordinator holding the ticket");
  await db
    .update(tickets)
    .set({ status: "RESOLVED", resolvedAt: new Date() })
    .where(eq(tickets.subject, subject));
  await db
    .update(hubCoordinator)
    .set({ droppedOut: true })
    .where(eq(hubCoordinator.id, resolver.coordinatorId));
  undo(() =>
    db
      .update(hubCoordinator)
      .set({ droppedOut: resolver.droppedOut })
      .where(eq(hubCoordinator.id, resolver.coordinatorId)),
  );

  await openTicket(page, "/sc/tickets", subject);
  await takeAction(page, "Reopen", "Still broken.");

  const activeEmail =
    resolver.coordinatorId === hub.coordinatorId ? hub.otherCoordinatorEmail : hub.coordinatorEmail;
  await signIn(context, activeEmail);
  // Start shows only to the holder of an open ticket, so the new coordinator now holds it.
  const step = await openTicket(page, "/hc/tickets", subject);
  await expect(step.getByRole("button", { name: "Start", exact: true })).toBeVisible();
});

test("the creator can reopen a ticket to a different coordinator", async ({ page, context }) => {
  const subject = `${subjectPrefix} reopen elsewhere`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "TECH", hub.coordinatorName);
  await db
    .update(tickets)
    .set({ status: "RESOLVED", resolvedAt: new Date() })
    .where(eq(tickets.subject, subject));

  await openTicket(page, "/sc/tickets", subject);
  const form = await fillAction(page, "Reopen", "Needs someone else.");
  await form.getByRole("combobox", { name: "Send to" }).click();
  await page.getByRole("option", { name: hub.otherCoordinatorName }).click();
  await submitAction(page, "Reopen");

  await signIn(context, hub.otherCoordinatorEmail);
  // Start shows only to the holder of an open ticket, so the other coordinator now holds it.
  const step = await openTicket(page, "/hc/tickets", subject);
  await expect(step.getByRole("button", { name: "Start", exact: true })).toBeVisible();
});

/** A ticket held by the hub's supervisor, as if one of their fellows had raised it. */
async function ticketHeldBySupervisor(subject: string) {
  const [fellowMember] = await db
    .select({ userId: implementerMember.userId })
    .from(implementerMember)
    .innerJoin(fellow, eq(fellow.id, implementerMember.identifier))
    .where(and(eq(fellow.supervisorId, hub.supervisorId), eq(implementerMember.role, "FELLOW")))
    .limit(1);
  required(fellowMember, "a fellow of the hub's supervisor");
  const [ticket] = await db
    .insert(tickets)
    .values({
      createdById: fellowMember.userId,
      subject,
      description: "Raised by the ticket routing spec.",
      category: "TECH",
      holderId: hub.supervisorUserId,
      status: "ESCALATED",
    })
    .returning({ id: tickets.id });
  required(ticket, "the supervisor's ticket");
  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    kind: "CREATED",
    actorId: fellowMember.userId,
    assigneeId: hub.supervisorUserId,
    reason: "Raised by the ticket routing spec.",
  });
}

test("a supervisor reassigns to another supervisor of the hub, as often as needed", async ({
  page,
  context,
}) => {
  const subject = `${subjectPrefix} supervisor reassign`;
  await ticketHeldBySupervisor(subject);

  await signIn(context, hub.supervisorEmail);
  const reassign = await act(page, "/sc/tickets", subject, "Reassign", "Off sick.");
  await expect(reassign).toContainText("Reassign to another supervisor");
  await reassign.getByRole("combobox").click();
  await page.getByRole("option", { name: hub.bystanderName }).click();
  await submitAction(page, "Reassign");

  await signIn(context, hub.bystanderEmail);
  const back = await act(page, "/sc/tickets", subject, "Reassign", "Back from leave.");
  await back.getByRole("combobox").click();
  await page.getByRole("option", { name: hub.supervisorName }).click();
  await submitAction(page, "Reassign");

  // Every handover stays in the history.
  await signIn(context, hub.supervisorEmail);
  await expect(await heldBy(page, "/sc/tickets", subject)).toHaveText("You");
  await openTicket(page, "/sc/tickets", subject);
  await expect(activity(page)).toContainText("Off sick.");
  await expect(activity(page)).toContainText("Back from leave.");
});

test("the server refuses a reassignment to someone who left the tier after the form opened", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} stale reassign`;
  await ticketHeldBySupervisor(subject);

  await signIn(context, hub.supervisorEmail);
  const reassign = await act(page, "/sc/tickets", subject, "Reassign", "Off sick.");
  await reassign.getByRole("combobox").click();
  await page.getByRole("option", { name: hub.bystanderName }).click();

  const [bystander] = await db
    .select({ droppedOut: supervisor.droppedOut })
    .from(supervisor)
    .where(eq(supervisor.id, hub.bystanderSupervisorId));
  required(bystander, "the hub's other supervisor");
  await db
    .update(supervisor)
    .set({ droppedOut: true })
    .where(eq(supervisor.id, hub.bystanderSupervisorId));
  undo(() =>
    db.update(supervisor).set(bystander).where(eq(supervisor.id, hub.bystanderSupervisorId)),
  );
  await reassign.getByRole("button", { name: "Reassign", exact: true }).click();

  await expect(
    page.getByText("Choose an active colleague in your hub to take it over").first(),
  ).toBeVisible();
  await expect(await heldBy(page, "/sc/tickets", subject)).toHaveText("You");
});

test("a hub coordinator's ticket goes to the oldest admin on its category's team", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} team`;
  const oldest = await oldestAdminName(hub.implementerId, eq(adminUser.team, "OPERATIONS"));
  const newer = await createAdminCopy(hub.adminUserId);
  undo(newer.remove);
  await db.update(adminUser).set({ team: "OPERATIONS" }).where(eq(adminUser.email, newer.email));

  await signIn(context, hub.coordinatorEmail);
  await createTicket(page, "/hc/tickets", subject, "OPERATIONS");
  await expect(await heldBy(page, "/hc/tickets", subject)).toContainText(oldest);
});

test("an admin's ticket for a team with no one else on it goes to the oldest super admin", async ({
  page,
  context,
}) => {
  const subject = `${subjectPrefix} no team`;
  // The seed's Tech admin is the team's only member, and never receives their own ticket. No other
  // spec puts anyone on Tech, so a parallel worker cannot fill the team mid-test.
  const [techAdmin] = await db
    .select({ implementerId: adminUser.implementerId })
    .from(adminUser)
    .where(eq(adminUser.email, techAdminEmail));
  required(techAdmin, "the seeded Tech admin");
  const oldest = await oldestAdminName(techAdmin.implementerId, eq(adminUser.isSuperAdmin, true));

  await signIn(context, techAdminEmail);
  await createTicket(page, "/admin/tickets", subject, "TECH");
  await expect(await heldBy(page, "/admin/tickets", subject)).toContainText(oldest);
});

test("an admin raises a ticket for its category's team", async ({ page, context, undo }) => {
  const subject = `${subjectPrefix} admin raised`;
  const oldest = await oldestAdminName(hub.implementerId, eq(adminUser.team, "CARE"));
  const creator = await createAdminCopy(hub.adminUserId);
  undo(creator.remove);
  // Runs before the removal above, since the ticket's events point at the creator.
  undo(async () => {
    const created = db.select({ id: tickets.id }).from(tickets).where(eq(tickets.subject, subject));
    await db.delete(ticketEvents).where(inArray(ticketEvents.ticketId, created));
    await db.delete(tickets).where(eq(tickets.subject, subject));
  });

  await signIn(context, creator.email);
  await createTicket(page, "/admin/tickets", subject, "CARE");
  await expect(await heldBy(page, "/admin/tickets", subject)).toContainText(oldest);
});

/** A named admin on each of `teams`, removed after the test along with the ticket called `subject`. */
async function teamAdmins(undo: Undo, subject: string, teams: AdminTeam[]) {
  const admins = await Promise.all(
    teams.map(async (team) => {
      const admin = await createAdminCopy(hub.adminUserId);
      undo(admin.remove);
      const name = `E2E ${TEAM_LABELS[team]} ${uniqueSuffix()}`;
      await db
        .update(adminUser)
        .set({ adminName: name, team })
        .where(eq(adminUser.email, admin.email));
      return { ...admin, name };
    }),
  );
  // Runs before the removals above, since the ticket's events point at the admins.
  undo(async () => {
    const created = db.select({ id: tickets.id }).from(tickets).where(eq(tickets.subject, subject));
    await db.delete(ticketEvents).where(inArray(ticketEvents.ticketId, created));
    await db.delete(tickets).where(eq(tickets.subject, subject));
  });
  return admins;
}

test("an admin reassigns across teams and escalates to Tech, the top tier", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} admin reassign`;
  const [holder, other, tech] = await teamAdmins(undo, subject, ["CARE", "RESEARCH", "TECH"]);
  required(holder, "the Care admin");
  required(other, "the Research admin");
  required(tech, "the Tech admin");

  await signIn(context, hub.coordinatorEmail);
  await createTicket(page, "/hc/tickets", subject, "CARE", holder.name);

  // Every admin is one tier, so the holder can hand the ticket to another team, listed under it.
  await signIn(context, holder.email);
  const reassign = await act(page, "/admin/tickets", subject, "Reassign", "Out this week.");
  await expect(reassign).toContainText("Reassign to another admin");
  await reassign.getByRole("combobox").click();
  await expect(page.getByRole("group", { name: "Research team" })).toContainText(other.name);
  await page.getByRole("option", { name: other.name }).click();
  await submitAction(page, "Reassign");

  await signIn(context, other.email);
  const escalate = await act(page, "/admin/tickets", subject, "Escalate", "Needs an engineer.");
  await escalate.getByRole("combobox").click();
  // Everyone offered is on Tech, so the list needs no team headings.
  await expect(page.getByRole("listbox").getByRole("group")).toHaveCount(0);
  await page.getByRole("option", { name: tech.name }).click();
  await submitAction(page, "Escalate");

  // Tech is the top of the ladder, so its holder can reassign but not escalate.
  await signIn(context, tech.email);
  const step = await openTicket(page, "/admin/tickets", subject);
  await expect(step.getByRole("button", { name: "Reassign", exact: true })).toBeVisible();
  await expect(step.getByRole("button", { name: "Escalate", exact: true })).toHaveCount(0);
});

for (const [change, error] of [
  ["the holder joined Tech", "The Tech team is the top tier, so reassign the ticket instead"],
  ["the recipient left Tech", "Choose someone who can take this ticket"],
] as const) {
  test(`the server refuses an admin's escalation when ${change} after the form opened`, async ({
    page,
    context,
    undo,
  }) => {
    const subject = `${subjectPrefix} stale escalation ${change}`;
    const [holder, tech] = await teamAdmins(undo, subject, ["CARE", "TECH"]);
    required(holder, "the Care admin");
    required(tech, "the Tech admin");
    await signIn(context, hub.coordinatorEmail);
    await createTicket(page, "/hc/tickets", subject, "CARE", holder.name);

    await signIn(context, holder.email);
    const escalate = await act(page, "/admin/tickets", subject, "Escalate", "Needs an engineer.");
    await escalate.getByRole("combobox").click();
    await page.getByRole("option", { name: tech.name }).click();

    const [moved, team] =
      change === "the holder joined Tech" ? [holder, "TECH"] : [tech, "RESEARCH"];
    await db
      .update(adminUser)
      .set({ team: team as AdminTeam })
      .where(eq(adminUser.email, moved.email));
    await escalate.getByRole("button", { name: "Escalate", exact: true }).click();

    await expect(page.getByText(error).first()).toBeVisible();
    await expect(await heldBy(page, "/admin/tickets", subject)).toHaveText("You");
  });
}

test("a hub coordinator escalates to the oldest super admin when the category's team is empty", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} empty team`;
  // No other spec relies on the Tech team, so it can be emptied for this test.
  const onTech = and(eq(adminUser.implementerId, hub.implementerId), eq(adminUser.team, "TECH"));
  const techAdmins = await db.select({ id: adminUser.id }).from(adminUser).where(onTech);
  await db.update(adminUser).set({ team: null }).where(onTech);
  undo(() =>
    db
      .update(adminUser)
      .set({ team: "TECH" })
      .where(
        inArray(
          adminUser.id,
          techAdmins.map((admin) => admin.id),
        ),
      ),
  );
  const oldest = await oldestAdminName(hub.implementerId, eq(adminUser.isSuperAdmin, true));

  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "TECH", hub.coordinatorName);

  await signIn(context, hub.coordinatorEmail);
  await act(page, "/hc/tickets", subject, "Escalate", "Needs an engineer.");
  await submitAction(page, "Escalate");
  await expect(await heldBy(page, "/hc/tickets", subject)).toContainText(oldest);
});
