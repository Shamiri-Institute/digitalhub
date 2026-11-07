import type { Locator, Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  interventionSession,
  school,
  schoolDropoutHistory,
  student,
  supervisor,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { sessionDisplayName } from "#/lib/utils";
import { expect, test, type Undo } from "#/tests/fixtures";
import { raceOnRow, required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell, searchRows } from "#/tests/pages/helpers";

type Coordinator = { email: string; hubId: string; implementerId: string; sessionNameId: string };

async function pickCoordinator() {
  const {
    rows: [row],
  } = await db.execute<Coordinator>(sql`
    select u.email, h.id as "hubId", h.implementer_id as "implementerId",
      (select n.id from session_names n where n.hub_id = h.id and n.session_type = 'INTERVENTION'
        order by n.id limit 1) as "sessionNameId"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    where ${signableMember()}
    order by u.email
    limit 1`);
  required(row, "a hub coordinator with a hub");
  return row;
}

async function createSchool(
  coordinator: Coordinator,
  undo: Undo,
  dropout: { droppedOut: boolean; dropoutReason?: string } = { droppedOut: false },
) {
  const schoolId = objectId("sch");
  const visibleId = objectId("sch");
  const schoolName = `E2E pending school ${Date.now()}`;
  await db.insert(school).values({
    id: schoolId,
    visibleId,
    schoolName,
    hubId: coordinator.hubId,
    ...dropout,
  });
  // A test that fails mid-write leaves the write to land after it; locking the school first waits
  // for that write and the history row it adds.
  undo(() =>
    db.transaction(async (tx) => {
      await tx.select({ id: school.id }).from(school).where(eq(school.id, schoolId)).for("update");
      await tx.delete(schoolDropoutHistory).where(eq(schoolDropoutHistory.schoolId, schoolId));
      await tx.delete(school).where(eq(school.id, schoolId));
    }),
  );
  return { schoolId, visibleId, schoolName };
}

/**
 * Confirms the dialog's write while its row is locked, so the write waits on the lock, and checks
 * that Escape, the close button and Cancel leave the dialog open until the write lands.
 */
async function expectOpenUntilWritten(
  page: Page,
  dialog: Locator,
  confirm: Locator,
  lockedRow: { table: string; id: string },
) {
  await raceOnRow(lockedRow.table, lockedRow.id, async (waitForWaiting) => {
    await confirm.click();
    await waitForWaiting(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveAttribute("data-state", "open");
    await expect(dialog.getByRole("button", { name: "Close" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
  await expect(dialog).toBeHidden();
}

/** Picks the first dropout reason in the dialog's form, submits it and returns the confirm. */
async function submitDropoutReason(page: Page, form: Locator) {
  await form.getByRole("combobox", { name: /^Select reason/ }).click();
  await page.getByRole("option").first().click();
  await form.getByRole("button", { name: "Submit" }).click();
  return page.getByRole("dialog", { name: "Confirm drop out" });
}

test("a fellow's drop-out dialog stays open until the drop-out is saved", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await pickCoordinator();
  const fellowId = objectId("fellow");
  const fellowName = `E2E pending fellow ${Date.now()}`;
  await db.insert(fellow).values({
    id: fellowId,
    fellowName,
    hubId: coordinator.hubId,
    implementerId: coordinator.implementerId,
    droppedOut: false,
  });
  undo(() => db.delete(fellow).where(eq(fellow.id, fellowId)));
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl("/hc/fellows"));
  await chooseRowAction(page, await searchRows(page, fellowName), "Drop-out fellow");
  const confirmDialog = await submitDropoutReason(
    page,
    page.getByRole("dialog").filter({ hasText: "Drop out fellow" }),
  );
  await expectOpenUntilWritten(
    page,
    confirmDialog,
    confirmDialog.getByRole("button", { name: "Confirm" }),
    {
      table: "fellows",
      id: fellowId,
    },
  );
  await expect(page.getByText("successfully dropped out").first()).toBeVisible();
});

test("a student's drop-out dialog stays open until the drop-out is saved", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await pickCoordinator();
  const { schoolId, visibleId } = await createSchool(coordinator, undo);
  const studentId = objectId("stu");
  const studentName = `E2E pending student ${Date.now()}`;
  await db.insert(student).values({
    id: studentId,
    visibleId: objectId("stu"),
    studentName,
    schoolId,
    admissionNumber: String(Date.now()).slice(-9),
  });
  undo(() => db.delete(student).where(eq(student.id, studentId)));
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl(`/hc/schools/${visibleId}/students`));
  await chooseRowAction(
    page,
    await searchRows(page, studentName, page.getByRole("main")),
    "Drop-out student",
  );
  const confirmDialog = await submitDropoutReason(
    page,
    page.getByRole("dialog", { name: "Drop out student" }),
  );
  await expectOpenUntilWritten(
    page,
    confirmDialog,
    confirmDialog.getByRole("button", { name: "Confirm" }),
    {
      table: "students",
      id: studentId,
    },
  );
});

test("a school's drop-out and undo dialogs stay open until each is saved", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await pickCoordinator();
  const { schoolId, schoolName } = await createSchool(coordinator, undo);
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl("/hc/schools"));
  await chooseRowAction(page, await searchRows(page, schoolName), "Dropout school");
  const confirmDialog = await submitDropoutReason(
    page,
    page.getByRole("dialog", { name: "Drop out school" }),
  );
  await expectOpenUntilWritten(
    page,
    confirmDialog,
    confirmDialog.getByRole("button", { name: "Confirm" }),
    {
      table: "schools",
      id: schoolId,
    },
  );

  await page.reload();
  await chooseRowAction(page, await searchRows(page, schoolName), "Undo dropout");
  const undoDropout = page.getByRole("dialog", { name: "Undo school dropout?" });
  await expectOpenUntilWritten(
    page,
    undoDropout,
    undoDropout.getByRole("button", { name: "Undo" }),
    { table: "schools", id: schoolId },
  );
});

test("a supervisor's drop-out dialog stays open until the drop-out is saved", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await pickCoordinator();
  const supervisorId = objectId("sup");
  const supervisorName = `E2E pending supervisor ${Date.now()}`;
  await db.insert(supervisor).values({
    id: supervisorId,
    supervisorName,
    hubId: coordinator.hubId,
    implementerId: coordinator.implementerId,
  });
  undo(() => db.delete(supervisor).where(eq(supervisor.id, supervisorId)));
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl("/hc/supervisors"));
  await chooseRowAction(page, await searchRows(page, supervisorName), "Drop out supervisor");
  const confirmDialog = await submitDropoutReason(
    page,
    page.getByRole("dialog").filter({ hasText: "Drop out supervisor" }),
  );
  await expectOpenUntilWritten(
    page,
    confirmDialog,
    confirmDialog.getByRole("button", { name: "Confirm" }),
    {
      table: "supervisors",
      id: supervisorId,
    },
  );
});

test("the session occurrence dialog stays open until the occurrence is saved", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await pickCoordinator();
  required(coordinator.sessionNameId, "an intervention session type in the coordinator's hub");
  const { schoolId, visibleId } = await createSchool(coordinator, undo);
  const sessionDate = new Date(Date.now() - 24 * 3600 * 1000);
  const sessionId = objectId("session");
  await db.insert(interventionSession).values({
    id: sessionId,
    hubId: coordinator.hubId,
    schoolId,
    sessionId: coordinator.sessionNameId,
    occurred: false,
    yearOfImplementation: sessionDate.getFullYear(),
    sessionDate,
  });
  undo(() => db.delete(interventionSession).where(eq(interventionSession.id, sessionId)));
  const sessionName = await db.query.sessionName.findFirst({
    where: (n, { eq }) => eq(n.id, coordinator.sessionNameId),
    columns: { sessionName: true },
  });
  required(sessionName, "the session type");
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl(`/hc/schools/${visibleId}/sessions`));
  const label = sessionDisplayName(sessionName.sessionName) ?? sessionName.sessionName;
  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), label),
    "Mark session occurrence",
  );
  const mark = page.getByRole("dialog", { name: "Mark session occurrence" });
  await mark.getByRole("radio", { name: "Attended" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toContainText("Are you sure?");
  await expectOpenUntilWritten(page, mark, mark.getByRole("button", { name: "Confirm" }), {
    table: "intervention_sessions",
    id: sessionId,
  });
});
