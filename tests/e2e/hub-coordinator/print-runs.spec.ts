import { and, eq, ne } from "drizzle-orm";

import { db } from "#/db/client";
import {
  hub,
  hubCoordinator,
  implementerMember,
  school,
  session,
  survey,
  surveyAuditEvent,
  surveyQuestionnaire,
  user,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import type { BrowserContext, Page } from "@playwright/test";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signInAs, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { createPrintSchool, createPublishedSurvey, formWithPages } from "#/tests/survey-fixtures";

test("a hub coordinator prints 12 numbered copies for one school and voids the last", async ({
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
  const otherHubSchool = await db
    .select({ schoolName: school.schoolName })
    .from(school)
    .where(ne(school.hubId, coordinatorHub.id))
    .orderBy(school.schoolName)
    .limit(1)
    .then(([row]) => row);
  required(otherHubSchool, "a school in another hub");

  const code = `H${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const hubSchool = await createPrintSchool({
    hubId: coordinatorHub.id,
    schoolName: `Print school ${code}`,
  });
  // Undo runs last-registered first: the survey, with its runs, copies and pages, then the school.
  undo(hubSchool.remove, () => db.delete(survey).where(eq(survey.code, code)));
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
  await hubSchoolCopies.fill("12");
  await expect(dialog.getByText("12 copies, serials assigned on create")).toBeVisible();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog.getByText(`Print 12 copies of ${code} v1`)).toBeVisible();
  await dialog.getByRole("button", { name: "Create print run" }).click();
  await expect(page.getByText("Created 12 copies").first()).toBeVisible();

  await expect(page).toHaveURL(/\/hc\/surveys\/runs\/surveyprintrun_/);
  await page.reload();
  const serials = Array.from(
    { length: 12 },
    (_, index) => `${code}-${String(index + 1).padStart(6, "0")}`,
  );
  await expect(page.getByRole("cell", { name: new RegExp(`^${code}-\\d{6}$`) })).toHaveText(
    serials,
  );
  await expect(page.getByText(`${serials[0]} to ${serials[11]}`)).toBeVisible();

  const pageCodes = await page
    .getByRole("listitem")
    .filter({ hasText: new RegExp(`^${code}-\\d{6}-P[12]$`) })
    .allTextContents();
  expect(pageCodes).toHaveLength(12 * published.pageCount);
  expect(new Set(pageCodes).size).toBe(pageCodes.length);
  expect(pageCodes.toSorted()).toEqual(serials.flatMap((s) => [`${s}-P1`, `${s}-P2`]).toSorted());

  const voidedSerial = serials[11];
  required(voidedSerial, "a twelfth copy");
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
  const profile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    with: { assignedHub: { columns: { id: true, implementerId: true, projectId: true } } },
  });
  required(profile?.assignedHub, "a hub coordinator with a hub");
  const coordinatorHub = profile.assignedHub;

  const code = `S${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const [amy, ben, cat] = [`Amy ${code}`, `Ben ${code}`, `Cat ${code}`];
  const { schoolName, remove } = await createPrintSchool({
    hubId: coordinatorHub.id,
    schoolName: `Print school ${code}`,
    studentNames: [amy, ben, cat],
  });
  // Undo runs last-registered first: the survey, with its copies, then the school.
  undo(remove, () => db.delete(survey).where(eq(survey.code, code)));
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
  await expect(page.getByText("Not a hub coordinator", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready to print" })).toHaveCount(0);
});

/** A school of the coordinator's hub, and a fresh published survey to print there. */
async function printSetup(context: BrowserContext, undo: Undo) {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const profile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    with: { assignedHub: { columns: { id: true, implementerId: true, projectId: true } } },
  });
  required(profile?.assignedHub, "a hub coordinator with a hub");
  const coordinatorHub = profile.assignedHub;
  const code = `L${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { schoolName, remove } = await createPrintSchool({
    hubId: coordinatorHub.id,
    schoolName: `Print school ${code}`,
  });
  undo(remove, () => db.delete(survey).where(eq(survey.code, code)));
  await createPublishedSurvey({
    code,
    implementerId: coordinatorHub.implementerId,
    projectId: coordinatorHub.projectId,
    createdBy: coordinator.id,
  });
  return { code, schoolName };
}

/**
 * The next print run create reaches the server, which commits it, but its reply is held until
 * `dropReply` and then dropped.
 */
async function loseNextCreateReply(page: Page) {
  let replyHeld = false;
  let dropReply = () => {};
  const dropped = new Promise<void>((resolve) => {
    dropReply = resolve;
  });
  await page.route(
    (url) => url.pathname === "/hc/surveys",
    async (route) => {
      const request = route.request();
      if (!replyHeld && request.method() === "POST" && request.postData()?.includes("printRunId")) {
        replyHeld = true;
        await route.fetch();
        await dropped;
        await route.abort();
        return;
      }
      await route.fallback();
    },
  );
  return { replyHeld: () => replyHeld, dropReply };
}

test("changing the copies after a lost reply makes a new run, not the lost one", async ({
  page,
  context,
  undo,
}) => {
  const { code, schoolName } = await printSetup(context, undo);

  await page.goto(getUrl("/hc/surveys"));
  await page.getByRole("button", { name: `Print copies of ${code} v1` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(`${schoolName} copies`).fill("10");
  await dialog.getByRole("button", { name: "Continue" }).click();

  const { replyHeld, dropReply } = await loseNextCreateReply(page);
  await dialog.getByRole("button", { name: "Create print run" }).click();
  await expect.poll(replyHeld).toBe(true);
  dropReply();
  await expect(dialog.getByText(`Print 10 copies of ${code} v1`)).toBeVisible();

  await dialog.getByRole("button", { name: "Back" }).click();
  await dialog.getByLabel(`${schoolName} copies`).fill("20");
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog.getByText(`Print 20 copies of ${code} v1`)).toBeVisible();
  await dialog.getByRole("button", { name: "Create print run" }).click();

  await expect(page).toHaveURL(/\/hc\/surveys\/runs\/surveyprintrun_/);
  await page.reload();
  await expect(page.getByText(`${code}-000011 to ${code}-000030`)).toBeVisible();
  await expect(page.getByRole("cell", { name: new RegExp(`^${code}-\\d{6}$`) })).toHaveCount(20);
});

test("asking again for a request whose reply was lost opens its run, not a second one", async ({
  page,
  context,
  undo,
}) => {
  const { code, schoolName } = await printSetup(context, undo);

  await page.goto(getUrl("/hc/surveys"));
  await page.getByRole("button", { name: `Print copies of ${code} v1` }).click();
  const dialog = page.getByRole("dialog");
  const copies = dialog.getByLabel(`${schoolName} copies`);
  await copies.fill("10");
  await dialog.getByRole("button", { name: "Continue" }).click();

  const { replyHeld, dropReply } = await loseNextCreateReply(page);
  await dialog.getByRole("button", { name: "Create print run" }).click();
  await expect.poll(replyHeld).toBe(true);
  // While the create is in flight, the request can't be changed or the dialog closed.
  await expect(dialog.getByRole("button", { name: "Back" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  dropReply();
  await expect(dialog.getByRole("button", { name: "Back" })).toBeEnabled();

  // Another request in between, then the dialog closed and opened again, then the lost one.
  await dialog.getByRole("button", { name: "Back" }).click();
  await copies.fill("20");
  await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByRole("button", { name: "Back" }).click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: `Print copies of ${code} v1` }).click();
  await copies.fill("10");
  await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByRole("button", { name: "Create print run" }).click();

  await expect(page).toHaveURL(/\/hc\/surveys\/runs\/surveyprintrun_/);
  await expect(page.getByText(`${code}-000001 to ${code}-000010`)).toBeVisible();
  await page.goto(getUrl("/hc/surveys"));
  await expect(page.getByRole("row").filter({ hasText: `Published ${code}` })).toHaveCount(2);
});
