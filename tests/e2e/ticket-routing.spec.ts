import type { BrowserContext, Page } from "@playwright/test";
import { eq, inArray, like, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { adminUser, hubCoordinator, ticketEvents, tickets } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import {
  createAdminCopy,
  required,
  signableMember,
  signInWithEmail,
  uniqueSuffix,
} from "#/tests/helpers";
import { cellUnder, getUrl, searchRows } from "#/tests/pages/helpers";
import { activity, fillAction, openTicket, submitAction, takeAction } from "#/tests/pages/tickets";

// Hub coordinators reassign to each other and the sign-ins share people, so the tests take turns.
test.describe.configure({ mode: "serial" });

type Hub = {
  supervisorEmail: string;
  bystanderEmail: string;
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
    select su.email as "supervisorEmail", bu.email as "bystanderEmail",
      hu.email as "coordinatorEmail", hc.coordinator_name as "coordinatorName", hc.id as "coordinatorId", hc2.id as "otherCoordinatorId",
      hc2.coordinator_name as "otherCoordinatorName", h2u.email as "otherCoordinatorEmail",
      lu.email as "leadEmail", am.user_id as "adminUserId"
    from supervisors sv
    join implementer_members sm on sm.identifier = sv.id and sm.role = 'SUPERVISOR'
      and ${signableMember("sm")}
    join users su on su.id = sm.user_id
    join supervisors bv on bv.hub_id = sv.hub_id and bv.id <> sv.id
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
    where (select count(*) from clinical_leads o where o.assigned_hub_id = sv.hub_id) = 1
      and (select count(*) from hub_coordinators o where o.assigned_hub_id = sv.hub_id) = 2
    order by sv.id, bv.id, hc.id
    limit 1`);
  required(row, "a hub with two supervisors, two hub coordinators and one clinical lead");
  hub = row;
});

test.afterAll(async () => {
  const created = db
    .select({ id: tickets.id })
    .from(tickets)
    .where(like(tickets.subject, `${subjectPrefix}%`));
  await db.delete(ticketEvents).where(inArray(ticketEvents.ticketId, created));
  await db.delete(tickets).where(like(tickets.subject, `${subjectPrefix}%`));
});

async function signIn(context: BrowserContext, email: string) {
  await context.clearCookies();
  await signInWithEmail(context, email);
}

async function createTicket(
  page: Page,
  path: string,
  subject: string,
  category: string,
  assignee?: string,
) {
  await page.goto(getUrl(path));
  await page.getByRole("button", { name: "New ticket" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new ticket" });
  await dialog.getByPlaceholder("Enter ticket subject").fill(subject);
  await dialog.getByPlaceholder("Describe the issue").fill("Raised by the ticket routing spec.");
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: category, exact: true }).click();
  if (assignee) {
    await dialog.getByRole("combobox", { name: "Assign to" }).click();
    await page.getByRole("option", { name: assignee }).click();
  }
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeHidden();
}

async function heldBy(page: Page, path: string, subject: string) {
  await page.goto(getUrl(path));
  return cellUnder(page, await searchRows(page, subject), "Held by");
}

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
  await takeAction(page, "Escalate", "Needs an admin.");
  await expect(await heldBy(page, "/hc/tickets", subject)).toContainText("Admin");

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

test("an admin reassigns a ticket to another admin", async ({ page, context, undo }) => {
  const subject = `${subjectPrefix} admin reassign`;
  const [holder, other] = await Promise.all([
    createAdminCopy(hub.adminUserId),
    createAdminCopy(hub.adminUserId),
  ]);
  undo(holder.remove);
  undo(other.remove);
  // Runs before the removals above, since the ticket's events point at both admins.
  undo(async () => {
    const created = db.select({ id: tickets.id }).from(tickets).where(eq(tickets.subject, subject));
    await db.delete(ticketEvents).where(inArray(ticketEvents.ticketId, created));
    await db.delete(tickets).where(eq(tickets.subject, subject));
  });
  const holderName = `E2E Holder ${uniqueSuffix()}`;
  const otherName = `E2E Other ${uniqueSuffix()}`;
  // Only super admins receive tickets, so the holder must be one to be offered on a new ticket.
  await db
    .update(adminUser)
    .set({ adminName: holderName, isSuperAdmin: true })
    .where(eq(adminUser.email, holder.email));
  await db.update(adminUser).set({ adminName: otherName }).where(eq(adminUser.email, other.email));

  await signIn(context, hub.coordinatorEmail);
  await createTicket(page, "/hc/tickets", subject, "TECH", holderName);

  await signIn(context, holder.email);
  const reassign = await act(page, "/admin/tickets", subject, "Reassign", "Out this week.");
  await expect(reassign).toContainText("Reassign to another admin");
  await reassign.getByRole("combobox").click();
  await page.getByRole("option", { name: new RegExp(otherName) }).click();
  await submitAction(page, "Reassign");

  await signIn(context, other.email);
  await expect(await heldBy(page, "/admin/tickets", subject)).toHaveText("You");
});

test("a hub coordinator's ticket goes to the implementer's first super admin, not a newer one", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} admin`;
  const newerSuperAdmin = await createAdminCopy(hub.adminUserId);
  undo(newerSuperAdmin.remove);
  await db
    .update(adminUser)
    .set({ isSuperAdmin: true })
    .where(eq(adminUser.email, newerSuperAdmin.email));

  await signIn(context, hub.coordinatorEmail);
  await createTicket(page, "/hc/tickets", subject, "TECH");
  await expect(await heldBy(page, "/hc/tickets", subject)).toContainText("Admin");

  await signIn(context, newerSuperAdmin.email);
  await page.goto(getUrl("/admin/tickets"));
  await expect(await searchRows(page, subject)).toHaveCount(0);
  // Admins receive tickets but do not raise them.
  await expect(page.getByRole("button", { name: "New ticket" })).toHaveCount(0);
});
