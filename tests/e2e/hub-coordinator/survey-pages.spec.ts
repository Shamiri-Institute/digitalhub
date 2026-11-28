import { and, eq, inArray, isNull, ne } from "drizzle-orm";

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
import { createUnidentifiedPages } from "#/tests/survey-scan-fixtures";
import { PRINT_FORM } from "#/tests/unit/fixtures/survey-print-form";

// Each worker loads this file on its own, so each makes a survey with a code of its own.
const surveyCode = `V${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

test("a hub coordinator places their hub's unidentified page, and another hub's code is refused", async ({
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
    createPrintSchool({ hubId: coordinatorHubId, schoolName: `Hub pages ${surveyCode}` }),
    createPrintSchool({ hubId: otherHub.id, schoolName: `Other hub pages ${surveyCode}` }),
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
      pageNumbers: [1],
    }),
    createScannedCopy({
      scope: { ...scope, hubId: otherHub.id },
      versionId,
      schoolId: otherHubSchool.schoolId,
      reads: CLEAN_PRINT_FORM_READS,
      pageNumbers: [1],
    }),
  ]);
  undo(copy.remove, otherHubCopy.remove);
  const fileName = `unread-${surveyCode}.pdf`;
  const unread = await createUnidentifiedPages({ scope, count: 2, fileName });
  // Removed before the copy, whose printed page one of them ends up on.
  undo(unread.remove);
  const issued = await db
    .select({ id: surveyQuestionnaire.id, serial: surveyQuestionnaire.serial })
    .from(surveyQuestionnaire)
    .where(inArray(surveyQuestionnaire.id, [copy.questionnaireId, otherHubCopy.questionnaireId]));
  const serial = issued.find((row) => row.id === copy.questionnaireId)?.serial;
  const otherHubSerial = issued.find((row) => row.id === otherHubCopy.questionnaireId)?.serial;
  required(serial, "the copy's serial");
  required(otherHubSerial, "the other hub's copy's serial");

  await page.goto(getUrl("/hc/surveys/scans"));
  await page
    .getByRole("row")
    .filter({ hasText: fileName })
    .getByRole("link", { name: "2 unidentified" })
    .click();
  await expect(page).toHaveURL(getUrl(`/hc/surveys/pages?upload=${unread.uploadId}`));
  await expect(page.getByText("2 to place")).toBeVisible();

  const cards = page.getByRole("listitem").filter({ hasText: fileName });
  const firstPage = cards.filter({ hasText: "Page 1 of the file" });
  await firstPage.getByLabel("Printed page code").fill(`${otherHubSerial}-P2`);
  await firstPage.getByRole("button", { name: "Place page" }).click();
  await expect(firstPage).toContainText("That page belongs to another hub's copy.");

  const secondPage = cards.filter({ hasText: "Page 2 of the file" });
  await secondPage.getByLabel("Printed page code").fill(`${serial}-P2`);
  await secondPage.getByRole("button", { name: "Place page" }).click();
  await expect(page.getByText(`Placed on ${serial} page 2`)).toBeVisible();

  await page.reload();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Page 1 of the file");

  await page.goto(getUrl(`/hc/surveys/copies/${copy.questionnaireId}`));
  await expect(page.getByRole("link", { name: /^Page 2/ })).toContainText("needs review");
  await expect(page.getByRole("link", { name: /^Page 3/ })).toContainText("not scanned");
  await expect(
    page.getByRole("region", { name: "History" }).getByRole("listitem").first(),
  ).toContainText("You placed page 2");
});
