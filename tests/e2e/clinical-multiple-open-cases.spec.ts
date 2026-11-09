import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalScreeningInfo } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import {
  createClinicalCase,
  emailForProfile,
  required,
  signInAs,
  signInWithEmail,
} from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

test("the clinical lead and the clinical team see which students have more than one open case", async ({
  page,
  context,
  undo,
}) => {
  const leads = await db.query.clinicalLead.findMany({
    where: (cl, { isNotNull }) => isNotNull(cl.assignedHubId),
    columns: { id: true, assignedHubId: true },
    orderBy: (cl, { asc }) => asc(cl.id),
  });
  let leadEmail: string | null = null;
  let leadHubId: string | null = null;
  for (const lead of leads) {
    leadEmail = await emailForProfile(lead.id, "CLINICAL_LEAD");
    leadHubId = lead.assignedHubId;
    if (leadEmail) break;
  }
  required(leadEmail, "a clinical lead who can sign in");
  required(leadHubId, "the clinical lead's hub");
  const hubId = leadHubId;

  const [hubSupervisor, hubSchool] = await Promise.all([
    db.query.supervisor.findFirst({
      where: (s, { eq }) => eq(s.hubId, hubId),
      columns: { id: true },
      orderBy: (s, { asc }) => asc(s.id),
    }),
    db.query.school.findFirst({
      where: (s, { eq }) => eq(s.hubId, hubId),
      columns: { id: true },
      orderBy: (s, { asc }) => asc(s.id),
    }),
  ]);
  required(hubSupervisor, "a supervisor in the clinical lead's hub");
  required(hubSchool, "a school in the clinical lead's hub");
  const caseOwner = { schoolId: hubSchool.id, currentSupervisorId: hubSupervisor.id };

  const studentWithTwoCases = await createClinicalCase(caseOwner);
  undo(studentWithTwoCases.remove);
  const studentWithOneCase = await createClinicalCase(caseOwner);
  undo(studentWithOneCase.remove);

  const firstCase = await db.query.clinicalScreeningInfo.findFirst({
    where: (c, { eq }) => eq(c.id, studentWithTwoCases.caseId),
    columns: { studentId: true },
  });
  required(firstCase, "the first case");
  // "Add clinical case" refuses a second open case, so the duplicate can only come from the DB.
  const secondCasePseudonym = `${studentWithTwoCases.pseudonym}-second`;
  await db.insert(clinicalScreeningInfo).values({
    studentId: firstCase.studentId,
    currentSupervisorId: hubSupervisor.id,
    caseStatus: "Active",
    riskStatus: "No",
    pseudonym: secondCasePseudonym,
  });
  undo(() =>
    db
      .delete(clinicalScreeningInfo)
      .where(eq(clinicalScreeningInfo.pseudonym, secondCasePseudonym)),
  );

  await signInWithEmail(context, leadEmail);
  await page.goto(getUrl("/cl/clinical"));

  const duplicateRows = await searchRows(page, studentWithTwoCases.pseudonym);
  await expect(duplicateRows).toHaveCount(2);
  for (const row of await duplicateRows.all()) {
    await expect(row.getByText("Multiple open cases")).toBeVisible();
  }

  const singleRow = await searchRows(page, studentWithOneCase.pseudonym);
  await expect(singleRow).toHaveCount(1);
  await expect(singleRow.getByText("Multiple open cases")).toHaveCount(0);

  await context.clearCookies();
  await signInAs(context, "CLINICAL_TEAM");
  await page.goto(getUrl("/ct/clinical"));
  const teamRows = await searchRows(page, studentWithTwoCases.pseudonym);
  await expect(teamRows).toHaveCount(2);
  for (const row of await teamRows.all()) {
    await expect(row.getByText("Multiple open cases")).toBeVisible();
  }
});
