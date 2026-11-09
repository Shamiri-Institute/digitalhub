import type { BrowserContext, Page } from "@playwright/test";
import { eq, inArray, like, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { adminUser, hubCoordinator, ticketEvents, tickets } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { createAdminCopy, required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

// Hub coordinators reassign to each other and the sign-ins share people, so the tests take turns.
test.describe.configure({ mode: "serial" });

type Hub = {
  supervisorEmail: string;
  bystanderEmail: string;
  coordinatorEmail: string;
  otherCoordinatorId: string;
  otherCoordinatorName: string;
  otherCoordinatorEmail: string;
  leadEmail: string;
  adminUserId: string;
};

const subjectPrefix = `E2E ticket routing ${Date.now()}`;
let hub: Hub;

// Two supervisors, two hub coordinators and a clinical lead of one hub, each able to sign in.
test.beforeAll(async () => {
  const {
    rows: [row],
  } = await db.execute<Hub>(sql`
    select su.email as "supervisorEmail", bu.email as "bystanderEmail",
      hu.email as "coordinatorEmail", hc2.id as "otherCoordinatorId",
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

async function createTicket(page: Page, path: string, subject: string, category: string) {
  await page.goto(getUrl(path));
  await page.getByRole("button", { name: "New ticket" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new ticket" });
  await dialog.getByPlaceholder("Enter ticket subject").fill(subject);
  await dialog.getByPlaceholder("Describe the issue").fill("Raised by the ticket routing spec.");
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: category, exact: true }).click();
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeHidden();
}

async function currentTier(page: Page, path: string, subject: string) {
  await page.goto(getUrl(path));
  return cellUnder(page, await searchRows(page, subject), "Current Tier");
}

async function ticketMenu(page: Page, path: string, subject: string) {
  await page.goto(getUrl(path));
  const row = await searchRows(page, subject);
  await row.getByRole("cell").last().click();
  const menu = page.getByRole("menu");
  // The holder's actions arrive with a status request the menu makes as it opens; reopening the
  // menu while that request runs would start it again.
  await expect(menu.getByText("View ticket")).toBeVisible();
  await page.waitForLoadState("networkidle");
  return menu;
}

async function act(page: Page, path: string, subject: string, action: string, reason: string) {
  const menu = await ticketMenu(page, path, subject);
  await menu.getByText(action, { exact: true }).click();
  // "Resolve ticket" opens "Resolve Ticket", "Reassign ticket" opens "Reassign Ticket to …".
  const dialog = page.getByRole("dialog", { name: new RegExp(`^${action}`, "i") });
  if (action !== "Reassign ticket") {
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Yes" }).click();
  }
  await dialog.getByRole("textbox").last().fill(reason);
  return dialog;
}

test("a supervisor's ticket goes to the hub role its category names", async ({ page, context }) => {
  const techSubject = `${subjectPrefix} tech`;
  const clinicalSubject = `${subjectPrefix} clinical`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", techSubject, "TECH");
  await createTicket(page, "/sc/tickets", clinicalSubject, "CLINICAL");

  await signIn(context, hub.coordinatorEmail);
  await expect(await currentTier(page, "/hc/tickets", techSubject)).toHaveText("hub coordinator");
  await expect(await searchRows(page, clinicalSubject)).toHaveCount(0);

  await signIn(context, hub.leadEmail);
  await expect(await currentTier(page, "/cl/tickets", clinicalSubject)).toHaveText("clinical lead");
  await expect(await searchRows(page, techSubject)).toHaveCount(0);

  // A supervisor who took no part in either ticket sees neither.
  await signIn(context, hub.bystanderEmail);
  await page.goto(getUrl("/sc/tickets"));
  await expect(await searchRows(page, subjectPrefix)).toHaveCount(0);
});

test("only the holder escalates or resolves, and a resolution is shown to the creator", async ({
  page,
  context,
}) => {
  const subject = `${subjectPrefix} resolve`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "TECH");
  let menu = await ticketMenu(page, "/sc/tickets", subject);
  await expect(menu.getByText("Escalate ticket")).toHaveCount(0);
  await expect(menu.getByText("Resolve ticket")).toHaveCount(0);

  await signIn(context, hub.coordinatorEmail);
  const resolve = await act(page, "/hc/tickets", subject, "Resolve ticket", "Fixed the laptop.");
  await resolve.getByRole("button", { name: "Resolve Ticket" }).click();
  await expect(resolve).toBeHidden();
  menu = await ticketMenu(page, "/hc/tickets", subject);
  await expect(menu.getByText("Escalate ticket")).toHaveCount(0);
  await expect(menu.getByText("Resolve ticket")).toHaveCount(0);

  await signIn(context, hub.supervisorEmail);
  menu = await ticketMenu(page, "/sc/tickets", subject);
  await menu.getByText("View resolution").click();
  await expect(page.getByRole("dialog", { name: "Resolution Details" })).toContainText(
    "Fixed the laptop.",
  );
});

test("a hub coordinator reassigns once per escalation to an active coordinator of the hub", async ({
  page,
  context,
}) => {
  const subject = `${subjectPrefix} reassign`;
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "OPERATIONS");

  await signIn(context, hub.coordinatorEmail);
  const reassign = await act(page, "/hc/tickets", subject, "Reassign ticket", "On leave.");
  await reassign.getByRole("combobox").click();
  await page.getByPlaceholder("Search coordinators...").fill(hub.otherCoordinatorName);
  await page.getByRole("option", { name: new RegExp(hub.otherCoordinatorName) }).click();
  await reassign.getByRole("button", { name: /Reassign/ }).click();
  await expect(reassign).toBeHidden();

  await signIn(context, hub.otherCoordinatorEmail);
  await expect(await currentTier(page, "/hc/tickets", subject)).toHaveText("hub coordinator");
  const menu = await ticketMenu(page, "/hc/tickets", subject);
  await expect(menu.getByText("Reassign ticket")).toHaveCount(0);
  await expect(menu.getByText("View reassignment")).toBeVisible();
  await menu.getByText("View reassignment").click();
  await expect(page.getByRole("dialog")).toContainText("On leave.");

  // The new holder escalates to an admin, so the admin may reassign this new escalation.
  await page.keyboard.press("Escape");
  const escalate = await act(page, "/hc/tickets", subject, "Escalate ticket", "Needs an admin.");
  await escalate.getByRole("button", { name: "Escalate Ticket" }).click();
  await expect(escalate).toBeHidden();
  await expect(await currentTier(page, "/hc/tickets", subject)).toHaveText("admin");

  // Each escalation keeps its reason and the roles it went between, for every participant.
  await signIn(context, hub.supervisorEmail);
  await page.goto(getUrl("/sc/tickets"));
  await chooseRowAction(page, await searchRows(page, subject), "View ticket");
  const history = page.getByRole("dialog");
  await expect(history).toContainText("Needs an admin.");
  await expect(history).toContainText(/hub_coordinator/i);
  await expect(history).toContainText(/admin/i);
});

test("an archived hub coordinator cannot receive a reassigned ticket", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} archived`;
  await db
    .update(hubCoordinator)
    .set({ archivedAt: new Date() })
    .where(eq(hubCoordinator.id, hub.otherCoordinatorId));
  undo(() =>
    db
      .update(hubCoordinator)
      .set({ archivedAt: null })
      .where(eq(hubCoordinator.id, hub.otherCoordinatorId)),
  );
  await signIn(context, hub.supervisorEmail);
  await createTicket(page, "/sc/tickets", subject, "CARE");

  await signIn(context, hub.coordinatorEmail);
  const reassign = await act(page, "/hc/tickets", subject, "Reassign ticket", "On leave.");
  await reassign.getByRole("combobox").click();
  await page.getByPlaceholder("Search coordinators...").fill(hub.otherCoordinatorName);
  await expect(page.getByText("No eligible", { exact: false })).toBeVisible();
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
  await expect(await currentTier(page, "/hc/tickets", subject)).toHaveText("admin");

  await signIn(context, newerSuperAdmin.email);
  await page.goto(getUrl("/admin/tickets"));
  await expect(await searchRows(page, subject)).toHaveCount(0);
  // Admins receive tickets but do not raise them.
  await expect(page.getByRole("button", { name: "New ticket" })).toHaveCount(0);
});
