import { db } from "#/db/client";
import { expect, test } from "#/tests/fixtures";
import { required, signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import {
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  removeSurvey,
} from "#/tests/survey-fixtures";
import { PRINT_FORM } from "#/tests/unit/fixtures/survey-print-form";

// Each worker loads this file on its own, so each makes a survey with a code of its own.
const surveyCode = `H${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

test("R-SURV-REVIEW: a hub coordinator reviews their hub's answers on their own Surveys page", async ({
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
  const scope = { hubId: coordinatorHubId, implementerId, projectId, userId: coordinator.id };
  const school = await createPrintSchool({
    hubId: coordinatorHubId,
    schoolName: `Hub review ${surveyCode}`,
  });
  undo(school.remove);
  const { versionId, id: surveyId } = await createPublishedSurvey({
    code: surveyCode,
    implementerId,
    projectId,
    createdBy: coordinator.id,
    form: PRINT_FORM,
  });
  undo(() => removeSurvey({ code: surveyCode }));
  const copy = await createScannedCopy({ scope, versionId, schoolId: school.schoolId });
  undo(copy.remove);

  await page.goto(getUrl(`/hc/surveys/review?survey=${surveyId}&answer=${copy.answerId("mood")}`));
  const panel = page.getByRole("article");
  await expect(panel.getByRole("heading", { name: "How are you feeling today?" })).toBeVisible();
  // Their queue is their hub's, so there is no hub to choose.
  await expect(page.getByRole("combobox", { name: "Hub" })).not.toBeVisible();

  await panel.getByRole("radio", { name: "3" }).click();
  await panel.getByRole("button", { name: "Save correction" }).click();
  await expect(panel.getByRole("heading", { name: "How old are you?" })).toBeVisible();

  await page.goto(getUrl(`/hc/surveys/review?survey=${surveyId}&answer=${copy.answerId("mood")}`));
  await expect(panel.getByRole("radio", { name: "3" })).toBeChecked();
  await expect(panel.getByText("Corrected", { exact: true })).toBeVisible();
});
