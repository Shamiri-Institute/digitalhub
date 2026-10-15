import { expect, test } from "#/tests/fixtures";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { school, weeklyHubReport } from "#/db/schema";
import { signInAs } from "#/tests/helpers";
import { getUrl, chooseRowAction, rowWithCell } from "#/tests/pages/helpers";

test("Hub Coordinator can submit a weekly hub report", async ({ page, context, undo }) => {
  const recommendations = `E2E weekly hub report ${Date.now()}`;
  undo(() =>
    db.delete(weeklyHubReport).where(eq(weeklyHubReport.recommendations, recommendations)),
  );
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  await page.goto(getUrl("/hc/schools"));
  const ratings = [
    ["Hub Related Issues and", 4],
    ["School Related Issues and", 2],
    ["Supervisor Related Issues and", 3],
    ["Fellow Related Issues and", 1],
  ] as const;

  await page.getByRole("button", { name: "Weekly Hub Report" }).click();
  const dialog = page.getByTestId("weekly-hub-report-dialog");
  await dialog.getByRole("combobox", { name: "Select week" }).click();
  await page.getByRole("option", { name: "Week 1" }).click();
  for (const [section, stars] of ratings) {
    const field = dialog.locator("label").filter({ hasText: section });
    await field.getByRole("button", { name: `${stars} out of 5` }).click();
    await dialog.getByRole("textbox", { name: section }).fill(`${section} observations`);
  }
  await dialog.getByRole("textbox", { name: "Successes" }).fill("It has generally been successful");
  await dialog.getByRole("textbox", { name: "Challenges" }).fill("No challenges to report");
  await dialog.getByRole("textbox", { name: "Recommendations" }).fill(recommendations);
  await dialog.getByRole("button", { name: "Submit" }).click();

  await expect(dialog).toBeHidden();

  // No page lists weekly hub reports, and the hub and author come from the session rather than
  // the form, so the saved report is the only place to check them.
  const coordinatorProfile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    columns: { id: true, assignedHubId: true },
  });
  const savedReport = await db.query.weeklyHubReport.findFirst({
    where: (r, { eq }) => eq(r.recommendations, recommendations),
    columns: {
      hubId: true,
      submittedBy: true,
      hubRelatedIssuesAndObservationsRating: true,
      fellowRelatedIssuesAndObservationsRating: true,
    },
  });
  expect(savedReport).toEqual({
    hubId: coordinatorProfile?.assignedHubId,
    submittedBy: coordinator.identifier,
    hubRelatedIssuesAndObservationsRating: 4,
    fellowRelatedIssuesAndObservationsRating: 1,
  });
});

test("Hub Coordinator edits a school in one dialog", async ({ page, context, undo }) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const coordinatorProfile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    columns: { assignedHubId: true },
  });
  // The last school, so this does not edit the one other specs open first.
  const targetSchool = await db.query.school.findFirst({
    where: (s, { and, eq, isNull }) =>
      and(
        eq(s.hubId, coordinatorProfile?.assignedHubId ?? ""),
        isNull(s.archivedAt),
        isNull(s.droppedOutAt),
      ),
    columns: {
      id: true,
      schoolName: true,
      numbersExpected: true,
      boardingDay: true,
      schoolType: true,
    },
    orderBy: (s, { desc }) => desc(s.visibleId),
  });
  if (!targetSchool) throw new Error("seed the database first: the hub has no open school");
  const { schoolName, id, ...originalFields } = targetSchool;
  undo(() => db.update(school).set(originalFields).where(eq(school.id, id)));
  // Four prod schools are Junior; the form must accept the stored type and save.
  await db.update(school).set({ schoolType: "Junior" }).where(eq(school.id, id));
  const newNumbersExpected = String((targetSchool.numbersExpected ?? 0) + 1);

  await page.goto(getUrl("/hc/schools"));
  const schoolRow = await rowWithCell(page, page.getByRole("main"), schoolName);
  await chooseRowAction(page, schoolRow, "Edit school information");

  const editDialog = page.getByRole("dialog", { name: "Edit school information" });
  await expect(editDialog).toHaveCount(1);
  await editDialog.getByLabel("Expected no. of students").fill(newNumbersExpected);
  await editDialog.getByRole("combobox", { name: "School boarding status" }).click();
  await page.getByRole("option", { name: "Day", exact: true }).click();
  await editDialog.getByRole("button", { name: "Save Changes" }).click();

  await expect(editDialog).toBeHidden();
  await expect(schoolRow).toContainText(newNumbersExpected);
  await page.reload();
  const reloadedRow = await rowWithCell(page, page.getByRole("main"), schoolName);
  await expect(reloadedRow).toContainText(newNumbersExpected);
});
