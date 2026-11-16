import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalCaseReopening, clinicalCaseTermination, clinicalScreeningInfo } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import {
  addClinicalSession,
  caseMenu,
  createSupervisorCase,
  openCaseAction,
  pickHubTeam,
} from "#/tests/clinical-helpers";
import { required, signInAs, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

test("a case is terminated at a session the student attended, not at a missed one", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  await addClinicalSession(clinicalCase.caseId, "S1", {
    supervisorId: team.supervisorId,
    attended: false,
    date: new Date("2026-02-02T09:00:00Z"),
  });
  await addClinicalSession(clinicalCase.caseId, "S2", {
    supervisorId: team.supervisorId,
    date: new Date("2026-02-09T09:00:00Z"),
  });

  await signInWithEmail(context, team.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));
  await openCaseAction(page, clinicalCase.pseudonym, "Terminate case");
  const dialog = page.getByRole("dialog", { name: "Terminate Case" });
  await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await expect(page.getByRole("option", { name: /^S2 / })).toBeVisible();
  await expect(page.getByRole("option", { name: /^S1 / })).toHaveCount(0);
});

test("a case keeps every termination, and its list row shows the newest one not reopened", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  const sessionId = await addClinicalSession(clinicalCase.caseId, "S1", {
    supervisorId: team.supervisorId,
  });
  const supervisorUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, team.supervisorEmail),
    columns: { id: true },
  });
  required(supervisorUser, "the supervisor's user");
  const terminate = (explanation: string, terminationDate: Date) =>
    db
      .insert(clinicalCaseTermination)
      .values({
        caseId: clinicalCase.caseId,
        sessionId,
        terminationDate,
        createdAt: terminationDate,
        terminationReason: "Student refused to return to sessions",
        terminationReasonExplanation: explanation,
        createdBy: supervisorUser.id,
      })
      .returning({ id: clinicalCaseTermination.id });
  const [reopenedTermination] = await terminate("e2e first", new Date("2026-02-10T09:00:00Z"));
  required(reopenedTermination, "the first termination");
  await db.insert(clinicalCaseReopening).values({
    caseId: clinicalCase.caseId,
    terminationId: reopenedTermination.id,
    reason: "e2e reopened",
    createdBy: supervisorUser.id,
  });
  await terminate("e2e second", new Date("2026-02-20T09:00:00Z"));
  await db
    .update(clinicalScreeningInfo)
    .set({ caseStatus: "Terminated" })
    .where(eq(clinicalScreeningInfo.id, clinicalCase.caseId));

  await signInAs(context, "CLINICAL_TEAM");
  await page.goto(getUrl("/ct/clinical"));
  const caseRows = await searchRows(page, clinicalCase.pseudonym);
  await expect(caseRows).toHaveCount(1);
  await chooseRowAction(page, caseRows, "View termination reasons");
  const reasons = page.getByRole("dialog");
  await expect(reasons).toContainText("e2e second");
  await expect(reasons).not.toContainText("e2e first");

  // A terminated case cannot be terminated again, and only a clinical lead can reopen it.
  await context.clearCookies();
  await signInWithEmail(context, team.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));
  const menu = await caseMenu(page, clinicalCase.pseudonym);
  await expect(menu.getByRole("menuitem", { name: "Terminate case" })).toBeDisabled();
  await expect(menu.getByText("Un-terminate case")).toHaveCount(0);
});
