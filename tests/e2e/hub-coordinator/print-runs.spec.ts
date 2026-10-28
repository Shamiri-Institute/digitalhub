import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "#/db/client";
import {
  hub,
  hubCoordinator,
  implementerMember,
  school,
  session,
  student,
  survey,
  surveyAuditEvent,
  surveyQuestionnaire,
  user,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signInAs, signInWithEmail } from "#/tests/helpers";
import { getUrl, setViewerTimeZone } from "#/tests/pages/helpers";
import { createPublishedSurvey, formWithPages } from "#/tests/survey-fixtures";

test("a hub coordinator prints 10 numbered copies for one school and voids one", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  await setViewerTimeZone(context);
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
  const hubSchoolCopies = dialog.getByLabel(`${hubSchool.schoolName} copies`);
  await expect(hubSchoolCopies).toBeVisible();
  await expect(dialog.getByText(otherHubSchool.schoolName, { exact: true })).toHaveCount(0);
  await hubSchoolCopies.fill("10");
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

test("going back from the confirm step keeps the students a coordinator left out", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  await setViewerTimeZone(context);
  const profile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    with: { assignedHub: { columns: { id: true, implementerId: true, projectId: true } } },
  });
  required(profile?.assignedHub, "a hub coordinator with a hub");
  const coordinatorHub = profile.assignedHub;

  const code = `S${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  // Its own school, sorted first, with three students, so no other spec's rows are printed.
  const schoolId = objectId("school");
  const schoolName = `0 Print ${code}`;
  const [amy, ben, cat] = [`Amy ${code}`, `Ben ${code}`, `Cat ${code}`];
  const studentRows = [amy, ben, cat].map((studentName) => {
    const id = objectId("student");
    return { id, studentName, visibleId: id, schoolId };
  });
  // Undo runs last-registered first: the survey (with its copies), then the students and school.
  undo(async () => {
    await db.delete(student).where(
      inArray(
        student.id,
        studentRows.map((s) => s.id),
      ),
    );
    await db.delete(school).where(eq(school.id, schoolId));
  });
  await db
    .insert(school)
    .values({ id: schoolId, schoolName, visibleId: schoolId, hubId: coordinatorHub.id });
  await db.insert(student).values(studentRows);
  undo(() => db.delete(survey).where(eq(survey.code, code)));
  await createPublishedSurvey({
    code,
    implementerId: coordinatorHub.implementerId,
    projectId: coordinatorHub.projectId,
    createdBy: coordinator.id,
    prefill: "STUDENT",
  });

  await page.goto(getUrl("/hc/surveys"));
  await page.getByRole("button", { name: `Print copies of ${code} v1` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(`${schoolName} (3 active students)`)).toBeVisible();
  await dialog.getByRole("button", { name: `Choose students at ${schoolName}` }).click();
  await dialog.getByRole("checkbox", { name: ben }).click();
  await expect(dialog.getByText("2 copies, serials assigned on create")).toBeVisible();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog.getByText(`Print about 2 copies of ${code} v1`)).toBeVisible();

  await dialog.getByRole("button", { name: "Back" }).click();
  await expect(
    dialog.getByRole("button", { name: `Choose students at ${schoolName}` }),
  ).toHaveCount(0);
  await expect(dialog.getByRole("checkbox", { name: ben })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: amy })).toBeChecked();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByRole("button", { name: "Create print run" }).click();

  await expect(page).toHaveURL(/\/hc\/surveys\/runs\/surveyprintrun_/);
  await page.reload();
  await expect(page.getByRole("cell", { name: new RegExp(`^[A-Z][a-z]+ ${code}$`) })).toHaveText([
    amy,
    cat,
  ]);
});

test("a coordinator whose hub is archived can't open the print page", async ({
  page,
  context,
  undo,
}) => {
  const seeded = await signInAs(context, "HUB_COORDINATOR");
  const seededProfile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, seeded.identifier ?? ""),
    with: { assignedHub: { columns: { implementerId: true, projectId: true } } },
  });
  required(seededProfile?.assignedHub, "a hub coordinator with a hub");
  const { implementerId, projectId } = seededProfile.assignedHub;

  const label = `e2e-archived-hub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${label}@example.com`;
  const hubId = objectId("hub");
  const coordinatorId = objectId("hc");
  const [created] = await db
    .insert(user)
    .values({ email, name: "E2E Coordinator" })
    .returning({ id: user.id });
  required(created, "a new user");
  undo(async () => {
    await db.delete(session).where(eq(session.userId, created.id));
    await db.delete(implementerMember).where(eq(implementerMember.userId, created.id));
    await db.delete(hubCoordinator).where(eq(hubCoordinator.id, coordinatorId));
    await db.delete(user).where(eq(user.id, created.id));
    await db.delete(hub).where(eq(hub.id, hubId));
  });
  await db
    .insert(hub)
    .values({ id: hubId, hubName: label, implementerId, projectId, archivedAt: new Date() });
  await db.insert(hubCoordinator).values({
    id: coordinatorId,
    visibleId: label,
    coordinatorName: "E2E Coordinator",
    coordinatorEmail: email,
    implementerId,
    assignedHubId: hubId,
  });
  await db.insert(implementerMember).values({
    implementerId,
    userId: created.id,
    role: "HUB_COORDINATOR",
    identifier: coordinatorId,
  });
  await context.clearCookies();
  await signInWithEmail(context, email);

  await page.goto(getUrl("/hc/surveys"));
  await expect(page.getByText("Not a hub coordinator with an active hub")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready to print" })).toHaveCount(0);
});
