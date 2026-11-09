import type { Page } from "@playwright/test";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, supervisor, supervisorAttendance } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { createSupervisedSession, otherHubOf } from "#/tests/delivery-helpers";
import { expect, test, type Undo } from "#/tests/fixtures";
import { raceOnRow, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, scheduleUrl, searchRows } from "#/tests/pages/helpers";

type SupervisedSession = Awaited<ReturnType<typeof createSupervisedSession>>;

async function openSupervisorAttendance(page: Page, supervised: SupervisedSession) {
  await page.goto(
    await scheduleUrl(page.context(), "/hc/schedule?mode=list", supervised.sessionDate),
  );
  const sessionRow = page.getByRole("row").filter({ hasText: supervised.schoolName }).first();
  await chooseRowAction(page, sessionRow, "Mark supervisor attendance");
  const dialog = page.getByRole("dialog", { name: "Mark supervisor attendance" });
  await expect(dialog).toBeVisible();
  return dialog;
}

function markDialog(page: Page) {
  return page.getByRole("dialog").filter({ hasText: "Select attendance" });
}

async function openMarkFor(page: Page, supervised: SupervisedSession, supervisorName: string) {
  const dialog = await openSupervisorAttendance(page, supervised);
  await chooseRowAction(page, await searchRows(page, supervisorName, dialog), "Mark attendance");
  return markDialog(page);
}

async function addSupervisor(supervised: SupervisedSession, undo: Undo) {
  const supervisorId = objectId("sup");
  const supervisorName = `${supervised.supervisorName} colleague`;
  await db.insert(supervisor).values({
    id: supervisorId,
    supervisorName,
    hubId: supervised.hubId,
    implementerId: supervised.implementerId,
  });
  undo(async () => {
    await db
      .delete(supervisorAttendance)
      .where(eq(supervisorAttendance.supervisorId, supervisorId));
    await db.delete(supervisor).where(eq(supervisor.id, supervisorId));
  });
  return { supervisorId, supervisorName };
}

/** Rows a refused or raced write must not add; no page shows a supervisor's missing row. */
async function storedAttendances(supervisorIds: string[], sessionId: string) {
  return db
    .select({ supervisorId: supervisorAttendance.supervisorId })
    .from(supervisorAttendance)
    .where(
      and(
        inArray(supervisorAttendance.supervisorId, supervisorIds),
        eq(supervisorAttendance.sessionId, sessionId),
      ),
    );
}

test("a supervisor moved to another hub while the dialog is open is not marked", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const otherHubId = await otherHubOf(supervised.hubId);
  await signInWithEmail(context, supervised.coordinatorEmail);

  const mark = await openMarkFor(page, supervised, supervised.supervisorName);
  await db
    .update(supervisor)
    .set({ hubId: otherHubId })
    .where(eq(supervisor.id, supervised.supervisorId));
  await mark.getByRole("radio", { name: "Attended" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Supervisor not found in your hub").first()).toBeVisible();

  expect(await storedAttendances([supervised.supervisorId], supervised.sessionId)).toEqual([]);
});

test("supervisor attendance is refused for a session that has not occurred", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  await signInWithEmail(context, supervised.coordinatorEmail);

  const mark = await openMarkFor(page, supervised, supervised.supervisorName);
  await db
    .update(interventionSession)
    .set({ occurred: false })
    .where(eq(interventionSession.id, supervised.sessionId));
  await mark.getByRole("radio", { name: "Attended" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("This session has not occurred yet.").first()).toBeVisible();

  expect(await storedAttendances([supervised.supervisorId], supervised.sessionId)).toEqual([]);
});

test("a bulk supervisor mark with one supervisor out of the hub marks none of them", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const colleague = await addSupervisor(supervised, undo);
  const otherHubId = await otherHubOf(supervised.hubId);
  await signInWithEmail(context, supervised.coordinatorEmail);

  const dialog = await openSupervisorAttendance(page, supervised);
  for (const supervisorName of [supervised.supervisorName, colleague.supervisorName]) {
    await (
      await searchRows(page, supervisorName, dialog)
    )
      .first()
      .getByRole("checkbox", { name: "Select row" })
      .check();
  }
  await dialog.getByRole("button", { name: "Mark supervisor attendance" }).click();
  const bulk = markDialog(page);
  await expect(bulk).toContainText("2 supervisors");
  await db
    .update(supervisor)
    .set({ hubId: otherHubId })
    .where(eq(supervisor.id, colleague.supervisorId));
  await bulk.getByRole("radio", { name: "Attended" }).click();
  await bulk.getByRole("button", { name: "Submit" }).click();
  await expect(
    page.getByText("Something went wrong while updating supervisor attendance").first(),
  ).toBeVisible();

  await page.reload();
  const reopened = await openSupervisorAttendance(page, supervised);
  await expect(await searchRows(page, supervised.supervisorName, reopened)).not.toContainText(
    /Attended|Missed/,
  );
  expect(
    await storedAttendances(
      [supervised.supervisorId, colleague.supervisorId],
      supervised.sessionId,
    ),
  ).toEqual([]);
});

test("two submits of one supervisor's attendance at once write one attendance", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  await signInWithEmail(context, supervised.coordinatorEmail);

  const firstMark = await openMarkFor(page, supervised, supervised.supervisorName);
  const otherTab = await context.newPage();
  const secondMark = await openMarkFor(otherTab, supervised, supervised.supervisorName);
  for (const mark of [firstMark, secondMark]) {
    await mark.getByRole("radio", { name: "Attended" }).click();
  }

  // Writing an attendance key-share-locks its supervisor, so both writes queue on the lock.
  await raceOnRow("supervisors", supervised.supervisorId, async (waitForWaiting) => {
    await firstMark.getByRole("button", { name: "Submit" }).click();
    await secondMark.getByRole("button", { name: "Submit" }).click();
    await waitForWaiting(2);
  });
  await expect(firstMark).toBeHidden();
  await expect(secondMark).toBeHidden();

  await page.reload();
  const reopened = await openSupervisorAttendance(page, supervised);
  await expect(await searchRows(page, supervised.supervisorName, reopened)).toContainText(
    "Attended",
  );
  expect(await storedAttendances([supervised.supervisorId], supervised.sessionId)).toHaveLength(1);
});
