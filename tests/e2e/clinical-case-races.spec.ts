import type { Page } from "@playwright/test";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  clinicalCaseReview,
  clinicalCaseTermination,
  clinicalScreeningInfo,
  clinicalSessionAttendance,
} from "#/db/schema";
import { expect, test, type Undo } from "#/tests/fixtures";
import {
  createClinicalCase,
  expectOpenUntilWritten,
  raceOnRow,
  required,
  signableMember,
  signInWithEmail,
} from "#/tests/helpers";
import { chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

type Owner = { email: string; supervisorId: string; schoolId: string };

// A supervisor and a school in their hub with a group, which a case's student needs.
async function pickOwner() {
  const {
    rows: [row],
  } = await db.execute<Owner>(sql`
    select u.email, sv.id as "supervisorId", s.id as "schoolId"
    from supervisors sv
    join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id
    join schools s on s.hub_id = sv.hub_id
    where ${signableMember()}
      and exists (select 1 from intervention_groups g where g.school_id = s.id and g.archived_at is null)
    order by u.email desc, s.id
    limit 1`);
  return row;
}

async function createCaseWithSession(undo: Undo) {
  const owner = await pickOwner();
  required(owner, "a supervisor whose hub has a school with a group");
  const clinicalCase = await createClinicalCase({
    schoolId: owner.schoolId,
    currentSupervisorId: owner.supervisorId,
  });
  undo(async () => {
    // A test that fails mid-write leaves the write to land after it; taking the case's lock first
    // waits for that write and any row it adds.
    await db.transaction((tx) =>
      tx
        .select({ id: clinicalScreeningInfo.id })
        .from(clinicalScreeningInfo)
        .where(eq(clinicalScreeningInfo.id, clinicalCase.caseId))
        .for("update"),
    );
    const terminations = db
      .select({ id: clinicalCaseTermination.id })
      .from(clinicalCaseTermination)
      .where(eq(clinicalCaseTermination.caseId, clinicalCase.caseId));
    await db
      .delete(clinicalCaseReview)
      .where(inArray(clinicalCaseReview.terminationId, terminations));
    await clinicalCase.remove();
  });
  await db.insert(clinicalSessionAttendance).values({
    caseId: clinicalCase.caseId,
    session: "S1",
    supervisorId: owner.supervisorId,
    attendanceStatus: true,
  });
  return { ...owner, ...clinicalCase };
}

async function openTerminationForm(page: Page, pseudonym: string) {
  await page.goto(getUrl("/sc/clinical"));
  await chooseRowAction(page, await searchRows(page, pseudonym), "Terminate case");
  const dialog = page.getByRole("dialog", { name: "Terminate Case" });
  await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await page.getByRole("option", { name: /^S1 / }).click();
  await dialog.getByRole("combobox").filter({ hasText: "Student no-show" }).click();
  await page.getByRole("option", { name: "Student refused to return to sessions" }).click();
  await dialog.getByRole("textbox", { name: /Termination Explanation/ }).fill("e2e race");
  return dialog.getByRole("button", { name: "Terminate Case" });
}

test("terminating a case from two tabs at once records one termination", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const clinicalCase = await createCaseWithSession(undo);
  await signInWithEmail(context, clinicalCase.email);
  const otherTab = await context.newPage();
  const firstSubmit = await openTerminationForm(page, clinicalCase.pseudonym);
  const secondSubmit = await openTerminationForm(otherTab, clinicalCase.pseudonym);

  await raceOnRow("clinical_screening_info", clinicalCase.caseId, async (waitForWaiting) => {
    await firstSubmit.click();
    await waitForWaiting(1);
    await secondSubmit.click();
    await waitForWaiting(2);
  });

  await expect(page.getByText("Case terminated successfully").first()).toBeVisible();
  await expect(otherTab.getByText("Something went wrong, please try again").first()).toBeVisible();
  // The case lists only its latest termination, so only the database shows a second one.
  const terminations = await db.$count(
    clinicalCaseTermination,
    eq(clinicalCaseTermination.caseId, clinicalCase.caseId),
  );
  expect(terminations).toBe(1);
});

test("a follow-up that arrives as the case is terminated leaves it terminated", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const clinicalCase = await createCaseWithSession(undo);
  await signInWithEmail(context, clinicalCase.email);
  const terminate = await openTerminationForm(page, clinicalCase.pseudonym);
  const otherTab = await context.newPage();
  await otherTab.goto(getUrl("/sc/clinical"));
  await chooseRowAction(otherTab, await searchRows(otherTab, clinicalCase.pseudonym), "Follow up");
  const followUp = otherTab
    .getByRole("dialog", { name: "Trigger Follow Up" })
    .getByRole("button", { name: "Confirm" });

  await raceOnRow("clinical_screening_info", clinicalCase.caseId, async (waitForWaiting) => {
    await terminate.click();
    await waitForWaiting(1);
    await followUp.click();
    await waitForWaiting(2);
  });

  await expect(page.getByText("Case terminated successfully").first()).toBeVisible();
  await expect(otherTab.getByText("Failed to update case status").first()).toBeVisible();
  await page.reload();
  await expect(await searchRows(page, clinicalCase.pseudonym)).toContainText("Terminated");
});

test("the terminate dialog stays open until the termination is saved", async ({
  page,
  context,
  undo,
}) => {
  const clinicalCase = await createCaseWithSession(undo);
  await signInWithEmail(context, clinicalCase.email);
  const terminate = await openTerminationForm(page, clinicalCase.pseudonym);
  await expectOpenUntilWritten(
    page,
    page.getByRole("dialog", { name: "Terminate Case" }),
    terminate,
    {
      table: "clinical_screening_info",
      id: clinicalCase.caseId,
    },
  );

  await page.reload();
  await expect(await searchRows(page, clinicalCase.pseudonym)).toContainText(/terminated/i);
});

test("Escape while a termination saves leaves the row menu, and so the dialog, open", async ({
  page,
  context,
  undo,
}) => {
  const clinicalCase = await createCaseWithSession(undo);
  await signInWithEmail(context, clinicalCase.email);
  const terminate = await openTerminationForm(page, clinicalCase.pseudonym);
  const dialog = page.getByRole("dialog", { name: "Terminate Case" });
  // The dialog renders inside the row menu, which is inert behind it, so the menu is found by
  // its role attribute rather than through the accessibility tree.
  const rowMenu = page.locator('[role="menu"]');
  await raceOnRow("clinical_screening_info", clinicalCase.caseId, async (waitForWaiting) => {
    await terminate.click();
    await waitForWaiting(1);
    // The pending save disables the button that was pressed, so focus is on the page, not in
    // the dialog, when Escape arrives.
    await page.keyboard.press("Escape");
    await expect(rowMenu).toHaveAttribute("data-open");
    await expect(dialog).toHaveAttribute("data-open");
  });
  await expect(dialog).toBeHidden();
});

test("the follow-up dialog stays open until the follow-up is saved", async ({
  page,
  context,
  undo,
}) => {
  const clinicalCase = await createCaseWithSession(undo);
  await signInWithEmail(context, clinicalCase.email);
  await page.goto(getUrl("/sc/clinical"));
  await chooseRowAction(page, await searchRows(page, clinicalCase.pseudonym), "Follow up");
  const followUp = page.getByRole("dialog", { name: "Trigger Follow Up" });
  await expectOpenUntilWritten(page, followUp, followUp.getByRole("button", { name: "Confirm" }), {
    table: "clinical_screening_info",
    id: clinicalCase.caseId,
  });

  await page.reload();
  // The status badge uppercases the stored status through CSS.
  await expect(await searchRows(page, clinicalCase.pseudonym)).toContainText(/followup/i);
});
