import type { Page } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, fellowAttendance, payoutStatements } from "#/db/schema";
import { createSupervisedSession, otherHubOf } from "#/tests/delivery-helpers";
import { expect, test } from "#/tests/fixtures";
import { raceOnRow, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, scheduleUrl, searchRows } from "#/tests/pages/helpers";

type SupervisedSession = Awaited<ReturnType<typeof createSupervisedSession>>;

async function openFellowAttendance(page: Page, supervised: SupervisedSession) {
  await page.goto(
    await scheduleUrl(page.context(), "/sc/schedule?mode=list", supervised.sessionDate),
  );
  const sessionRow = page.getByRole("row").filter({ hasText: supervised.schoolName }).first();
  await chooseRowAction(page, sessionRow, "Mark fellow attendance");
  const dialog = page.getByRole("dialog", { name: "Mark fellow attendance" }).first();
  await expect(dialog).toBeVisible();
  return dialog;
}

function markDialog(page: Page) {
  return page.getByRole("dialog").filter({ hasText: "Select attendance" });
}

async function openMarkFor(page: Page, supervised: SupervisedSession, fellowName: string) {
  const dialog = await openFellowAttendance(page, supervised);
  await chooseRowAction(page, await searchRows(page, fellowName, dialog), "Mark attendance");
  return markDialog(page);
}

async function attendanceCellText(page: Page, supervised: SupervisedSession, fellowName: string) {
  const dialog = await openFellowAttendance(page, supervised);
  return searchRows(page, fellowName, dialog);
}

/** Payout statements are not shown on the schedule, so the spec reads them from the database. */
async function payoutsOf(fellowIds: string[]) {
  return db
    .select({ fellowId: fellowAttendance.fellowId, reason: payoutStatements.reason })
    .from(payoutStatements)
    .innerJoin(fellowAttendance, eq(fellowAttendance.id, payoutStatements.fellowAttendanceId))
    .where(inArray(fellowAttendance.fellowId, fellowIds));
}

test("a supervisor marks fellows in bulk from a blank form, and each attendance pays once", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const markedAlone = await supervised.addFellow();
  const markedInBulk = await supervised.addFellow();
  await signInWithEmail(context, supervised.supervisorEmail);

  const alone = await openMarkFor(page, supervised, markedAlone.fellowName);
  await expect(alone).toContainText(
    "Please confirm fellow's M-Pesa number before marking attendance.",
  );
  await alone.getByRole("radio", { name: "Attended" }).click();
  await alone.getByRole("button", { name: "Submit" }).click();
  await expect(alone).toBeHidden();

  // Opening the marked fellow's mark shows it; cancelling leaves that fellow behind the table.
  const dialog = await openFellowAttendance(page, supervised);
  await chooseRowAction(
    page,
    await searchRows(page, markedAlone.fellowName, dialog),
    "Mark attendance",
  );
  await expect(markDialog(page).getByRole("radio", { name: "Attended" })).toBeChecked();
  await markDialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(markDialog(page)).toBeHidden();
  for (const { fellowName } of [markedAlone, markedInBulk]) {
    await (
      await searchRows(page, fellowName, dialog)
    )
      .getByRole("checkbox", { name: "Select row" })
      .check();
  }
  await dialog.getByRole("button", { name: "Mark fellow attendance" }).click();
  const bulk = markDialog(page);
  await expect(bulk).toContainText("2 fellows");
  await expect(bulk).toContainText(
    "Please confirm fellows' M-Pesa numbers before marking attendance.",
  );
  await expect(bulk.getByRole("radio", { name: "Unmarked" })).toBeChecked();
  await bulk.getByRole("radio", { name: "Attended" }).click();
  await bulk.getByRole("button", { name: "Submit" }).click();
  await expect(bulk).toBeHidden();

  await page.reload();
  for (const { fellowName } of [markedAlone, markedInBulk]) {
    await expect(await attendanceCellText(page, supervised, fellowName)).toContainText("Attended");
    await page.keyboard.press("Escape");
  }
  const payouts = await payoutsOf([markedAlone.fellowId, markedInBulk.fellowId]);
  expect(payouts.toSorted((a, b) => a.fellowId.localeCompare(b.fellowId))).toEqual(
    [markedAlone.fellowId, markedInBulk.fellowId]
      .toSorted()
      .map((fellowId) => ({ fellowId, reason: "MARK_SESSION_ATTENDANCE" })),
  );
});

test("a fellow marked absent keeps a reason, and marking them attended clears it", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const absentFellow = await supervised.addFellow();
  await signInWithEmail(context, supervised.supervisorEmail);

  const missed = await openMarkFor(page, supervised, absentFellow.fellowName);
  await missed.getByRole("radio", { name: "Missed" }).click();
  await missed.getByRole("button", { name: "Submit" }).click();
  await expect(missed.getByText("Please select reason for absence.")).toBeVisible();
  await missed.getByRole("combobox", { name: "Select reason for above" }).click();
  await page.getByRole("option", { name: "Sickness" }).click();
  await missed.getByRole("textbox", { name: "Additional comments" }).fill("E2E absence note");
  await missed.getByRole("button", { name: "Submit" }).click();
  await expect(missed).toBeHidden();

  await page.reload();
  const reopened = await openMarkFor(page, supervised, absentFellow.fellowName);
  await expect(reopened.getByRole("radio", { name: "Missed" })).toBeChecked();
  await expect(reopened.getByRole("combobox", { name: "Select reason for above" })).toHaveText(
    "Sickness",
  );
  await reopened.getByRole("radio", { name: "Attended" }).click();
  await reopened.getByRole("button", { name: "Submit" }).click();
  await expect(reopened).toBeHidden();

  await page.reload();
  await expect(await attendanceCellText(page, supervised, absentFellow.fellowName)).toContainText(
    "Attended",
  );
  // An attended fellow's dialog shows no reason field, so only the database shows it was cleared.
  const [stored] = await db
    .select({
      absenceReason: fellowAttendance.absenceReason,
      absenceComments: fellowAttendance.absenceComments,
    })
    .from(fellowAttendance)
    .where(eq(fellowAttendance.fellowId, absentFellow.fellowId));
  expect(stored).toEqual({ absenceReason: null, absenceComments: null });
});

test("marking a fellow whose group has no students warns but still marks", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const fellowWithoutStudents = await supervised.addFellow({ students: 0 });
  await signInWithEmail(context, supervised.supervisorEmail);

  const mark = await openMarkFor(page, supervised, fellowWithoutStudents.fellowName);
  await expect(mark).toContainText(
    "This group has no students. Please contact the Fellow to add them.",
  );
  await mark.getByRole("radio", { name: "Attended" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

  await page.reload();
  await expect(
    await attendanceCellText(page, supervised, fellowWithoutStudents.fellowName),
  ).toContainText("Attended");
});

test("a bulk mark that includes a processed attendance fails whole and names the fellow", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const processedFellow = await supervised.addFellow();
  const otherFellow = await supervised.addFellow();
  await signInWithEmail(context, supervised.supervisorEmail);

  const first = await openMarkFor(page, supervised, processedFellow.fellowName);
  await first.getByRole("radio", { name: "Attended" }).click();
  await first.getByRole("button", { name: "Submit" }).click();
  await expect(first).toBeHidden();

  const dialog = await openFellowAttendance(page, supervised);
  for (const { fellowName } of [processedFellow, otherFellow]) {
    await (
      await searchRows(page, fellowName, dialog)
    )
      .getByRole("checkbox", { name: "Select row" })
      .check();
  }
  await dialog.getByRole("button", { name: "Mark fellow attendance" }).click();
  const bulk = markDialog(page);
  // The payout run processes the attendance while the dialog is open.
  await db
    .update(fellowAttendance)
    .set({ processedAt: new Date() })
    .where(eq(fellowAttendance.fellowId, processedFellow.fellowId));
  await bulk.getByRole("radio", { name: "Missed" }).click();
  await bulk.getByRole("combobox", { name: "Select reason for above" }).click();
  await page.getByRole("option", { name: "Sickness" }).click();
  await bulk.getByRole("button", { name: "Submit" }).click();
  await expect(
    page.getByText(`${processedFellow.fellowName}'s attendance has already been processed`).first(),
  ).toBeVisible();

  await page.reload();
  await expect(
    await attendanceCellText(page, supervised, processedFellow.fellowName),
  ).toContainText("Attended");
  await page.keyboard.press("Escape");
  await expect(
    await attendanceCellText(page, supervised, otherFellow.fellowName),
  ).not.toContainText(/Attended|Missed/);
});

test("a fellow moved to another hub while the dialog is open is not marked", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const movedFellow = await supervised.addFellow();
  const otherHubId = await otherHubOf(supervised.hubId);
  await signInWithEmail(context, supervised.supervisorEmail);

  const mark = await openMarkFor(page, supervised, movedFellow.fellowName);
  await db.update(fellow).set({ hubId: otherHubId }).where(eq(fellow.id, movedFellow.fellowId));
  await mark.getByRole("radio", { name: "Attended" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Fellow not found").first()).toBeVisible();

  // The schedule lists the supervisor's fellows whatever their hub, so the refused write shows
  // only in the database.
  const attendances = await db
    .select({ id: fellowAttendance.id })
    .from(fellowAttendance)
    .where(eq(fellowAttendance.fellowId, movedFellow.fellowId));
  expect(attendances).toEqual([]);
});

test("two submits of one fellow's attendance at once write one attendance and one payout", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const raced = await supervised.addFellow();
  await signInWithEmail(context, supervised.supervisorEmail);

  const firstMark = await openMarkFor(page, supervised, raced.fellowName);
  const otherTab = await context.newPage();
  const secondMark = await openMarkFor(otherTab, supervised, raced.fellowName);
  for (const mark of [firstMark, secondMark]) {
    await mark.getByRole("radio", { name: "Attended" }).click();
  }

  // Writing an attendance key-share-locks its fellow, so both writes queue on the locked fellow.
  await raceOnRow("fellows", raced.fellowId, async (waitForWaiting) => {
    await firstMark.getByRole("button", { name: "Submit" }).click();
    await secondMark.getByRole("button", { name: "Submit" }).click();
    await waitForWaiting(2);
  });

  await page.reload();
  await expect(await attendanceCellText(page, supervised, raced.fellowName)).toContainText(
    "Attended",
  );
  // The schedule shows one row per fellow whatever the table holds, so the count is read here.
  const attendances = await db
    .select({ id: fellowAttendance.id })
    .from(fellowAttendance)
    .where(eq(fellowAttendance.fellowId, raced.fellowId));
  expect(attendances).toHaveLength(1);
  expect(await payoutsOf([raced.fellowId])).toHaveLength(1);
});
