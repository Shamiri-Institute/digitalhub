import { and, eq, isNull, ne } from "drizzle-orm";

import { db } from "#/db/client";
import { hub, surveyQuestionnaire } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { required, signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import {
  CLEAN_PRINT_FORM_READS,
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  removeSurvey,
} from "#/tests/survey-fixtures";
import { PRINT_FORM } from "#/tests/unit/fixtures/survey-print-form";

// Each worker loads this file on its own, so each makes a survey with a code of its own.
const surveyCode = `J${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

test("R-SURV-COPY: a hub coordinator verifies their hub's copy, can't reopen or void it, and can't open another hub's", async ({
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
  const { id: coordinatorHubId, implementerId, projectId } = profile.assignedHub;
  const [otherHub] = await db
    .select({ id: hub.id })
    .from(hub)
    .where(and(ne(hub.id, coordinatorHubId), eq(hub.projectId, projectId), isNull(hub.archivedAt)))
    .orderBy(hub.id)
    .limit(1);
  required(otherHub, "another hub in the coordinator's project");

  const [school, otherHubSchool] = await Promise.all([
    createPrintSchool({ hubId: coordinatorHubId, schoolName: `Hub copy ${surveyCode}` }),
    createPrintSchool({ hubId: otherHub.id, schoolName: `Other hub copy ${surveyCode}` }),
  ]);
  undo(school.remove, otherHubSchool.remove);
  const { versionId } = await createPublishedSurvey({
    code: surveyCode,
    implementerId,
    projectId,
    createdBy: coordinator.id,
    form: PRINT_FORM,
  });
  undo(() => removeSurvey({ code: surveyCode }));
  const scope = { hubId: coordinatorHubId, implementerId, projectId, userId: coordinator.id };
  const [copy, otherHubCopy] = await Promise.all([
    createScannedCopy({
      scope,
      versionId,
      schoolId: school.schoolId,
      reads: CLEAN_PRINT_FORM_READS,
    }),
    createScannedCopy({
      scope: { ...scope, hubId: otherHub.id },
      versionId,
      schoolId: otherHubSchool.schoolId,
      reads: CLEAN_PRINT_FORM_READS,
    }),
  ]);
  undo(copy.remove, otherHubCopy.remove);
  const [stored] = await db
    .select({ serial: surveyQuestionnaire.serial })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, copy.questionnaireId));
  required(stored, "the copy's serial");

  await page.goto(getUrl(`/hc/surveys/copies/${copy.questionnaireId}`));
  await expect(page.getByRole("heading", { name: stored.serial, level: 1 })).toBeVisible();
  const state = page.getByRole("region", { name: "Copy status" });
  await state.getByRole("button", { name: "Verify copy" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Verify copy" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await page.reload();
  await expect(state).toContainText("Verified by");
  await expect(state).toContainText("The Research team can reopen it.");
  await expect(page.getByRole("button", { name: "Reopen" })).not.toBeVisible();

  await page.getByRole("link", { name: /^Print run/ }).click();
  await expect(page.getByRole("link", { name: stored.serial })).toBeVisible();
  await expect(page.getByRole("button", { name: `Void ${stored.serial}` })).not.toBeVisible();

  const otherHubPage = await page.goto(
    getUrl(`/hc/surveys/copies/${otherHubCopy.questionnaireId}`),
  );
  expect(otherHubPage?.status()).toBe(404);
});
