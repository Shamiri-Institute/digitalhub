import type { Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { ticketEvents, tickets } from "#/db/schema";
import { REOPEN_WINDOW_MS } from "#/lib/ticket-reopen-window";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail, uniqueSuffix } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";
import {
  activity,
  chooseMode,
  composerModes,
  fillAction,
  openTicket,
  submitAction,
  takeAction,
} from "#/tests/pages/tickets";

type FellowAndSupervisor = {
  fellowEmail: string;
  fellowUserId: string;
  supervisorEmail: string;
  supervisorUserId: string;
};

// A fellow who raises the ticket and the supervisor who holds it, both able to sign in.
async function pickFellowAndSupervisor() {
  const {
    rows: [fellowAndSupervisor],
  } = await db.execute<FellowAndSupervisor>(sql`
    select fu.email as "fellowEmail", fu.id as "fellowUserId",
      su.email as "supervisorEmail", su.id as "supervisorUserId"
    from fellows f
    join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
    join users fu on fu.id = m.user_id
    join supervisors sv on sv.id = f.supervisor_id
    join implementer_members sm on sm.identifier = sv.id and sm.role = 'SUPERVISOR'
      and ${signableMember("sm")}
    join users su on su.id = sm.user_id
    where ${signableMember()}
    order by fu.email
    limit 1`);
  return fellowAndSupervisor;
}

async function insertHeldTicket(fellowAndSupervisor: FellowAndSupervisor, undo: Undo) {
  const ticketSubject = `E2E ticket lifecycle ${uniqueSuffix()}`;
  const [ticket] = await db
    .insert(tickets)
    .values({
      createdById: fellowAndSupervisor.fellowUserId,
      subject: ticketSubject,
      description: "Raised by the ticket lifecycle spec.",
      category: "TECH",
      holderId: fellowAndSupervisor.supervisorUserId,
    })
    .returning({ id: tickets.id });
  required(ticket, "the spec's ticket");
  undo(async () => {
    await db.delete(ticketEvents).where(eq(ticketEvents.ticketId, ticket.id));
    await db.delete(tickets).where(eq(tickets.id, ticket.id));
  });
  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    kind: "CREATED",
    actorId: fellowAndSupervisor.fellowUserId,
    assigneeId: fellowAndSupervisor.supervisorUserId,
    reason: "Raised by the ticket lifecycle spec.",
  });
  return { ticketId: ticket.id, ticketSubject };
}

async function expectRowAfterReload(page: Page, path: string, ticketSubject: string, text: RegExp) {
  await page.goto(getUrl(path));
  await expect(await searchRows(page, ticketSubject)).toContainText(text);
}

async function expectNoActions(page: Page, path: string, ticketSubject: string, actions: string[]) {
  await openTicket(page, path, ticketSubject);
  const modes = await composerModes(page);
  for (const action of actions) expect(modes).not.toContain(action);
}

test("the holder starts, reprioritises and resolves a ticket, and its creator reopens it", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);

  await signInWithEmail(context, fellowAndSupervisor.supervisorEmail);
  await page.goto(getUrl("/sc/tickets"));
  await expect(await searchRows(page, ticketSubject)).toContainText(/open/i);
  const step = await openTicket(page, "/sc/tickets", ticketSubject);
  await chooseMode(page, "Start");
  await step.getByRole("button", { name: "Start ticket" }).click();
  await expect(page.getByText("Ticket started").first()).toBeVisible();
  await expectRowAfterReload(page, "/sc/tickets", ticketSubject, /in progress/i);

  await openTicket(page, "/sc/tickets", ticketSubject);
  const priority = await fillAction(page, "Change priority", "A whole school is affected.");
  await priority.getByRole("combobox").click();
  await page.getByRole("option", { name: "Urgent" }).click();
  await submitAction(page, "Change priority");
  await expectRowAfterReload(page, "/sc/tickets", ticketSubject, /urgent/i);

  await openTicket(page, "/sc/tickets", ticketSubject);
  await takeAction(page, "Resolve", "Sorted out.");
  await expectRowAfterReload(page, "/sc/tickets", ticketSubject, /resolved/i);

  await signInWithEmail(context, fellowAndSupervisor.fellowEmail);
  await openTicket(page, "/fel/tickets", ticketSubject);
  await takeAction(page, "Reopen", "The device still drops the connection.");
  await expectRowAfterReload(page, "/fel/tickets", ticketSubject, /in progress/i);

  await openTicket(page, "/fel/tickets", ticketSubject);
  await expect(activity(page)).toContainText("Medium to Urgent");
  await expect(activity(page)).toContainText("A whole school is affected.");
  // The holder is still active, so the reopen names the supervisor who resolved it.
  await expect(
    activity(page).getByRole("listitem").filter({ hasText: "Reopened" }).last(),
  ).toContainText("reopened it for");
  await expect(activity(page)).toContainText("The device still drops the connection.");
});

test("previous and next step through the tickets the holder holds, newest first", async ({
  page,
  context,
  undo,
}) => {
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const older = await insertHeldTicket(fellowAndSupervisor, undo);
  const newer = await insertHeldTicket(fellowAndSupervisor, undo);
  // A microsecond apart, which a Date can't hold, and far enough back that no other ticket falls
  // between them.
  for (const [ticket, createdAt] of [
    [older, "2001-01-01 00:00:00.000001+00"],
    [newer, "2001-01-01 00:00:00.000002+00"],
  ] as const)
    await db
      .update(tickets)
      .set({ createdAt: sql`${createdAt}::timestamptz` })
      .where(eq(tickets.id, ticket.ticketId));

  await signInWithEmail(context, fellowAndSupervisor.supervisorEmail);
  await openTicket(page, "/sc/tickets", older.ticketSubject);
  await page.getByRole("link", { name: /^Previous ticket you hold/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: newer.ticketSubject })).toBeVisible();
  await page.getByRole("link", { name: /^Next ticket you hold/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: older.ticketSubject })).toBeVisible();
});

test("the creator cancels an open ticket with a reason", async ({ page, context, undo }) => {
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);

  await signInWithEmail(context, fellowAndSupervisor.fellowEmail);
  await openTicket(page, "/fel/tickets", ticketSubject);
  await takeAction(page, "Cancel ticket", "Raised by mistake.");
  await expectRowAfterReload(page, "/fel/tickets", ticketSubject, /cancelled/i);
  await expectNoActions(page, "/fel/tickets", ticketSubject, ["Cancel ticket", "Reopen"]);

  await signInWithEmail(context, fellowAndSupervisor.supervisorEmail);
  await expectNoActions(page, "/sc/tickets", ticketSubject, [
    "Start",
    "Change priority",
    "Resolve",
    "Escalate",
    "Reassign",
  ]);

  await expect(activity(page)).toContainText("cancelled it");
  await expect(activity(page)).toContainText("Raised by mistake.");
});

test("the creator can't reopen a ticket once the reopen window has passed", async ({
  page,
  context,
  undo,
}) => {
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketId, ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);
  // Resolved just past the window, so the hourly close has not run yet and only the window guards it.
  await db
    .update(tickets)
    .set({ status: "RESOLVED", resolvedAt: new Date(Date.now() - REOPEN_WINDOW_MS - 60_000) })
    .where(eq(tickets.id, ticketId));

  await signInWithEmail(context, fellowAndSupervisor.fellowEmail);
  await expectNoActions(page, "/fel/tickets", ticketSubject, ["Reopen", "Cancel ticket"]);
});

test("the creator can cancel a clinical ticket only until it is started", async ({
  page,
  context,
  undo,
}) => {
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketId, ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);
  await db.update(tickets).set({ category: "CLINICAL" }).where(eq(tickets.id, ticketId));

  await signInWithEmail(context, fellowAndSupervisor.fellowEmail);
  await openTicket(page, "/fel/tickets", ticketSubject);
  expect(await composerModes(page)).toContain("Cancel ticket");

  await db.update(tickets).set({ status: "IN_PROGRESS" }).where(eq(tickets.id, ticketId));
  await expectNoActions(page, "/fel/tickets", ticketSubject, ["Cancel ticket"]);
});

test("the holder's drafts survive switching modes, and discarding a reason asks first", async ({
  page,
  context,
  undo,
}) => {
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);

  await signInWithEmail(context, fellowAndSupervisor.supervisorEmail);
  const step = await openTicket(page, "/sc/tickets", ticketSubject);
  await step.getByRole("textbox", { name: "Add a comment" }).fill("Half-written comment");
  const resolve = await fillAction(page, "Resolve", "Half-written fix");
  await resolve.getByLabel("Reason").press("Escape");
  await expect(resolve).toBeVisible();

  await chooseMode(page, "Comment");
  await expect(step.getByRole("textbox", { name: "Add a comment" })).toHaveValue(
    "Half-written comment",
  );
  await chooseMode(page, "Resolve");
  await expect(resolve.getByLabel("Reason")).toHaveValue("Half-written fix");

  await resolve.getByRole("button", { name: "Discard" }).click();
  await resolve.getByRole("button", { name: "Keep writing" }).click();
  await expect(resolve.getByLabel("Reason")).toHaveValue("Half-written fix");
  await resolve.getByRole("button", { name: "Discard" }).click();
  await resolve.getByRole("button", { name: "Discard reason" }).click();
  await expect(resolve).toBeHidden();
  await chooseMode(page, "Resolve");
  await expect(resolve.getByLabel("Reason")).toHaveValue("");
  // Like Post comment, the action waits for a reason.
  await expect(resolve.getByRole("button", { name: "Resolve", exact: true })).toBeDisabled();
});
