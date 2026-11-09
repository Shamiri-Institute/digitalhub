import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalFollowUpTreatmentPlan, clinicalScreeningInfo } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { caseMenu, createSupervisorCase, pickHubTeam } from "#/tests/clinical-helpers";
import { createClinicalCase, signInAs, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

function setStatus(caseId: string, caseStatus: "Active" | "FollowUp" | "Terminated") {
  return db
    .update(clinicalScreeningInfo)
    .set({ caseStatus })
    .where(eq(clinicalScreeningInfo.id, caseId));
}

test("a supervisor refers their case; no one is offered the retired expert consult", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  await signInWithEmail(context, team.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));

  const menu = await caseMenu(page, clinicalCase.pseudonym);
  await expect(menu.getByRole("menuitem", { name: "Refer case" })).toBeEnabled();
  await expect(menu.getByText("Un-terminate case")).toHaveCount(0);
  await expect(menu.getByText(/consult/i)).toHaveCount(0);
});

test("a clinical lead does not refer cases and reopens only a terminated one", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const leadCase = await createClinicalCase({
    schoolId: team.schoolId,
    currentSupervisorId: team.supervisorId,
  });
  undo(leadCase.remove);
  await db
    .update(clinicalScreeningInfo)
    .set({ currentSupervisorId: null, clinicalLeadId: team.leadId })
    .where(eq(clinicalScreeningInfo.id, leadCase.caseId));
  await signInWithEmail(context, team.leadEmail);
  await page.goto(getUrl("/cl/clinical"));

  let menu = await caseMenu(page, leadCase.pseudonym);
  await expect(menu.getByText("Edit student information")).toBeVisible();
  await expect(menu.getByText("Refer case")).toHaveCount(0);
  await expect(menu.getByText("Un-terminate case")).toHaveCount(0);
  await expect(menu.getByText(/consult/i)).toHaveCount(0);

  await setStatus(leadCase.caseId, "Terminated");
  await page.reload();
  menu = await caseMenu(page, leadCase.pseudonym);
  await expect(menu.getByText("Un-terminate case").first()).toBeVisible();
});

test("the treatment plan is offered once, for a case in follow-up", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  await signInWithEmail(context, team.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));
  const treatmentPlan = page.getByRole("menuitem", { name: /^Treatment plan/ });

  await caseMenu(page, clinicalCase.pseudonym);
  await expect(treatmentPlan).toBeDisabled();

  await setStatus(clinicalCase.caseId, "FollowUp");
  await page.reload();
  await caseMenu(page, clinicalCase.pseudonym);
  await expect(treatmentPlan).toBeEnabled();

  await db.insert(clinicalFollowUpTreatmentPlan).values({
    caseId: clinicalCase.caseId,
    currentORSScore: 20,
    plannedSessions: 4,
    sessionFrequency: "Weekly",
    plannedTreatmentIntervention: ["Interpersonal Therapy"],
    plannedTreatmentInterventionExplanation: "e2e",
  });
  await page.reload();
  await caseMenu(page, clinicalCase.pseudonym);
  await expect(treatmentPlan).toHaveText(/Uploaded/);
  await expect(treatmentPlan).toBeDisabled();
});

test("the clinical team reads cases but is offered nothing that changes them", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  await setStatus(clinicalCase.caseId, "Terminated");
  await signInAs(context, "CLINICAL_TEAM");
  await page.goto(getUrl("/ct/clinical"));

  const menu = await caseMenu(page, clinicalCase.pseudonym);
  await expect(menu.getByText("View termination reasons")).toBeVisible();
  await expect(menu.getByText("Un-terminate case")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New case" })).toHaveCount(0);
});
