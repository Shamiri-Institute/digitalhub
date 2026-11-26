import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "#/db/client";
import { hub, project } from "#/db/schema";
import { researchAdminEmail } from "#/db/seed/fixtures";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signInAs, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { createPrintSchool, createPublishedSurvey, removeSurvey } from "#/tests/survey-fixtures";
import { createMixedOutcomeUpload } from "#/tests/survey-scan-fixtures";
import { PRINT_FORM } from "#/tests/unit/fixtures/survey-print-form";

const MIXED_SUMMARY = "1 matched · 1 duplicate · 1 unidentified · 1 rejected (unknown code)";

// Each worker loads this file on its own, so each makes surveys with codes of its own.
const surveyCode = `O${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

async function mixedUploadIn(
  scope: { hubId: string; implementerId: string; projectId: string; userId: string },
  code: string,
  undo: Undo,
) {
  const school = await createPrintSchool({
    hubId: scope.hubId,
    schoolName: `Outcomes school ${code}`,
  });
  undo(school.remove);
  const { versionId } = await createPublishedSurvey({
    code,
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    form: PRINT_FORM,
  });
  undo(() => removeSurvey({ code }));
  const fileName = `outcomes-${code}.pdf`;
  const upload = await createMixedOutcomeUpload({
    scope,
    versionId,
    schoolId: school.schoolId,
    fileName,
  });
  undo(upload.remove);
  return fileName;
}

test("a Research admin sees what happened to each page of a processed upload", async ({
  page,
  context,
  undo,
}) => {
  const [user, admin] = await Promise.all([
    db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, researchAdminEmail) }),
    db.query.adminUser.findFirst({ where: (a, { eq }) => eq(a.email, researchAdminEmail) }),
  ]);
  required(user, "a Research team admin");
  required(admin, "a Research team admin profile");
  const [researchHub] = await db
    .select({ hubId: hub.id, projectId: hub.projectId })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(
      and(
        eq(project.isDefault, true),
        eq(hub.implementerId, admin.implementerId),
        isNull(hub.archivedAt),
      ),
    )
    .orderBy(asc(hub.id))
    .limit(1);
  required(researchHub, "a hub of the admin's implementer in the default project");
  const fileName = await mixedUploadIn(
    { ...researchHub, implementerId: admin.implementerId, userId: user.id },
    `${surveyCode}A`,
    undo,
  );

  await signInWithEmail(context, researchAdminEmail);
  await page.goto(getUrl("/admin/surveys/scans"));

  const uploadRow = page.getByRole("row").filter({ hasText: fileName });
  await expect(uploadRow).toContainText("Processed");
  await expect(uploadRow).toContainText(MIXED_SUMMARY);
});

test("a hub coordinator sees what happened to each page of their hub's processed upload", async ({
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
  const fileName = await mixedUploadIn(
    { hubId: coordinatorHubId, implementerId, projectId, userId: coordinator.id },
    `${surveyCode}H`,
    undo,
  );

  await page.goto(getUrl("/hc/surveys/scans"));

  const uploadRow = page.getByRole("row").filter({ hasText: fileName });
  await expect(uploadRow).toContainText("Processed");
  await expect(uploadRow).toContainText(MIXED_SUMMARY);
});
