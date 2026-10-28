import { and, eq, ne } from "drizzle-orm";

import { db } from "#/db/client";
import { school, survey, surveyAuditEvent, surveyQuestionnaire } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { required, signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { createPublishedSurvey, formWithPages } from "#/tests/survey-fixtures";

test("a hub coordinator prints 10 numbered copies for one school and voids one", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const profile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    with: { assignedHub: { columns: { id: true, implementerId: true, projectId: true } } },
  });
  required(profile?.assignedHub, "a hub coordinator with a hub");
  const coordinatorHub = profile.assignedHub;
  const [hubSchool, otherHubSchool] = await Promise.all([
    db.query.school.findFirst({
      where: (s, { and, eq, isNull }) => and(eq(s.hubId, coordinatorHub.id), isNull(s.archivedAt)),
      orderBy: (s, { asc }) => [asc(s.schoolName), asc(s.id)],
      columns: { id: true, schoolName: true },
    }),
    db
      .select({ schoolName: school.schoolName })
      .from(school)
      .where(ne(school.hubId, coordinatorHub.id))
      .orderBy(school.schoolName)
      .limit(1)
      .then(([row]) => row),
  ]);
  required(hubSchool, "a school in the coordinator's hub");
  required(otherHubSchool, "a school in another hub");

  const code = `H${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  // Deleting the survey removes its print runs, copies and pages with it.
  undo(() => db.delete(survey).where(eq(survey.code, code)));
  const published = await createPublishedSurvey({
    code,
    implementerId: coordinatorHub.implementerId,
    projectId: coordinatorHub.projectId,
    createdBy: coordinator.id,
    form: formWithPages(2),
  });

  await page.goto(getUrl("/hc/schedule"));
  await page.getByRole("link", { name: "Surveys", exact: true }).click();
  await expect(page).toHaveURL(/\/hc\/surveys$/);
  await page.getByRole("button", { name: `Print copies of ${code} v1` }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(otherHubSchool.schoolName, { exact: true })).toHaveCount(0);
  await dialog.getByLabel(`${hubSchool.schoolName} copies`).fill("10");
  await expect(dialog.getByText("10 copies, serials assigned on create")).toBeVisible();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog.getByText(`Print 10 copies of ${code} v1`)).toBeVisible();
  await dialog.getByRole("button", { name: "Create print run" }).click();

  await expect(page).toHaveURL(/\/hc\/surveys\/runs\/surveyprintrun_/);
  await page.reload();
  const serialCells = page.getByRole("cell", { name: new RegExp(`^${code}-\\d{6}$`) });
  await expect(serialCells).toHaveCount(10);
  const serials = await serialCells.allTextContents();
  expect(new Set(serials).size).toBe(10);

  const pageCodes = await page
    .getByRole("listitem")
    .filter({ hasText: new RegExp(`^${code}-\\d{6}-P[12]$`) })
    .allTextContents();
  expect(pageCodes).toHaveLength(10 * published.pageCount);
  expect(new Set(pageCodes).size).toBe(pageCodes.length);
  expect(pageCodes.toSorted()).toEqual(serials.flatMap((s) => [`${s}-P1`, `${s}-P2`]).toSorted());

  const [voidedSerial] = serials;
  required(voidedSerial, "a printed copy");
  await page.getByRole("button", { name: `Void ${voidedSerial}` }).click();
  await page.getByLabel("Reason").fill("Torn in transit");
  await page.getByRole("button", { name: "Void copy" }).click();
  await expect(page.getByText("The copy is void").first()).toBeVisible();

  await page.reload();
  const voidedRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: voidedSerial, exact: true }) });
  await expect(voidedRow).toContainText("Void");
  await expect(page.getByRole("button", { name: `Void ${voidedSerial}` })).toHaveCount(0);

  // No page shows a void copy's reason; it is kept only in the audit history.
  const voided = await db
    .select({ reason: surveyAuditEvent.reason })
    .from(surveyAuditEvent)
    .innerJoin(surveyQuestionnaire, eq(surveyQuestionnaire.id, surveyAuditEvent.entityId))
    .where(
      and(
        eq(surveyQuestionnaire.serial, voidedSerial),
        eq(surveyAuditEvent.action, "QUESTIONNAIRE_VOIDED"),
      ),
    );
  expect(voided).toEqual([{ reason: "Torn in transit" }]);
});
