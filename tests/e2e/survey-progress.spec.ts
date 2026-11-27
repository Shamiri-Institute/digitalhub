import { readFile } from "node:fs/promises";

import { and, asc, eq, isNull, ne } from "drizzle-orm";

import { db } from "#/db/client";
import { hub, surveyQuestionnaire } from "#/db/schema";
import { researchAdminEmail } from "#/db/seed/fixtures";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { pickUser } from "#/tests/platform-routes";
import {
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  issueCopy,
  removeSurvey,
} from "#/tests/survey-fixtures";
import type { FieldRead } from "#/lib/survey/scan-wire";
import { PRINT_FORM } from "#/tests/unit/fixtures/survey-print-form";

const ok = (field: string, value: NonNullable<FieldRead["value"]>): FieldRead => ({
  field,
  value,
  status: "ok",
  confidence: 0.99,
});

/** A name as the CSV writes it: quoted when it holds a comma or a quote. */
const csvName = (name: string) => (/[",]/.test(name) ? `"${name.replaceAll('"', '""')}"` : name);

const CLEAN_READS: Record<number, FieldRead[]> = {
  1: [ok("mood", "3"), ok("home", "1"), ok("sport", ["football", "netball"])],
  2: [
    ...["1", "2", "3", "4", "5"].map((row) => ok(`phq.${row}`, "0")),
    ok("age", "14"),
    ok("dob", "2011-02-28"),
  ],
  3: [{ field: "notes", value: null, status: "blank", confidence: null }, ok("sign", true)],
};

/**
 * A survey with four copies at a school of a hub coordinator's hub, one at each stage (printed only,
 * one page of three scanned, scanned with unsure answers, scanned clean), and one copy at a school of
 * another hub, which the coordinator must not see.
 */
async function surveyWithCopiesAtEachStage(undo: Undo) {
  const code = `G${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const coordinator = await pickUser("HUB_COORDINATOR");
  const profile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    with: {
      assignedHub: { columns: { id: true, hubName: true, implementerId: true, projectId: true } },
    },
  });
  required(profile?.assignedHub, "a hub coordinator with a hub");
  const coordinatorHub = profile.assignedHub;
  const [otherHub] = await db
    .select({ id: hub.id })
    .from(hub)
    .where(
      and(
        eq(hub.implementerId, coordinatorHub.implementerId),
        eq(hub.projectId, coordinatorHub.projectId),
        ne(hub.id, coordinatorHub.id),
        isNull(hub.archivedAt),
      ),
    )
    .orderBy(asc(hub.id))
    .limit(1);
  required(otherHub, "a second hub in the coordinator's project");
  const scope = {
    hubId: coordinatorHub.id,
    implementerId: coordinatorHub.implementerId,
    projectId: coordinatorHub.projectId,
    userId: coordinator.id,
  };

  const school = await createPrintSchool({ hubId: scope.hubId, schoolName: `Progress ${code}` });
  const otherSchool = await createPrintSchool({
    hubId: otherHub.id,
    schoolName: `Progress elsewhere ${code}`,
  });
  undo(school.remove, otherSchool.remove);
  const published = await createPublishedSurvey({
    code,
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    form: PRINT_FORM,
  });
  undo(() => removeSurvey({ code }));
  const at = { scope, versionId: published.versionId, schoolId: school.schoolId };

  await issueCopy(at);
  const partial = await createScannedCopy({ ...at, pageNumbers: [1] });
  const unsure = await createScannedCopy(at);
  const clean = await createScannedCopy({ ...at, reads: CLEAN_READS });
  undo(partial.remove, unsure.remove, clean.remove);
  await issueCopy({
    ...at,
    scope: { ...scope, hubId: otherHub.id },
    schoolId: otherSchool.schoolId,
  });

  const [cleanCopy] = await db
    .select({ serial: surveyQuestionnaire.serial })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, clean.questionnaireId));
  required(cleanCopy, "the clean copy");
  return {
    published,
    coordinatorEmail: coordinator.email,
    hubName: coordinatorHub.hubName,
    schoolName: school.schoolName,
    otherSchoolName: otherSchool.schoolName,
    cleanSerial: cleanCopy.serial,
  };
}

test("R-SURV-PROGRESS: a Research admin sees each school's progress and exports the answers", async ({
  page,
  context,
  undo,
}) => {
  const setup = await surveyWithCopiesAtEachStage(undo);
  await signInWithEmail(context, researchAdminEmail);

  await page.goto(getUrl(`/admin/surveys/${setup.published.id}`));
  const progress = page.getByRole("table", { name: "Progress by school" });
  // Hub, school, then printed, scanned, missing pages, needs review, ready and verified.
  await expect(progress.getByRole("row", { name: setup.schoolName }).getByRole("cell")).toHaveText([
    setup.hubName,
    setup.schoolName,
    "4",
    "3",
    "1",
    "2",
    "1",
    "0",
  ]);
  await expect(
    progress.getByRole("row", { name: setup.otherSchoolName }).getByRole("cell").nth(2),
  ).toHaveText("1");

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Answers CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`${setup.published.code}-answers.csv`);
  const lines = (await readFile(await file.path(), "utf8")).split("\r\n");
  expect(lines[0]).toBe(
    "serial,hub,school,student_id,version,status,mood,home,sport,phq.1,phq.2,phq.3,phq.4,phq.5,age,dob,notes,sign",
  );
  expect(lines).toContain(
    `${setup.cleanSerial},${csvName(setup.hubName)},${csvName(setup.schoolName)},,1,READY,3,1,football;netball,0,0,0,0,0,14,2011-02-28,,1`,
  );
});

test("R-SURV-PROGRESS: a hub coordinator sees only their hub's progress and cannot export", async ({
  page,
  context,
  undo,
}) => {
  const setup = await surveyWithCopiesAtEachStage(undo);
  await signInWithEmail(context, setup.coordinatorEmail);

  await page.goto(getUrl("/hc/surveys"));
  await page.getByRole("button", { name: "Select Progress" }).click();
  await expect(page).toHaveURL(/\/hc\/surveys\/progress$/);
  const section = page.locator("section", {
    has: page.getByRole("heading", { name: setup.published.title }),
  });
  const progress = section.getByRole("table", { name: "Progress by school" });
  // School, then printed, scanned, missing pages, needs review, ready and verified.
  await expect(progress.getByRole("row", { name: setup.schoolName }).getByRole("cell")).toHaveText([
    setup.schoolName,
    "4",
    "3",
    "1",
    "2",
    "1",
    "0",
  ]);
  await expect(progress.getByText(setup.otherSchoolName)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Answers CSV" })).toHaveCount(0);

  // The proxy sends a hub coordinator back to their own pages before the route runs; either way,
  // no CSV comes back.
  const exported = await page.request.get(
    getUrl(`/api/surveys/${setup.published.id}/export/answers`),
  );
  expect(exported.headers()["content-type"]).not.toContain("text/csv");
  expect(await exported.text()).not.toContain("serial,hub,school");
});
