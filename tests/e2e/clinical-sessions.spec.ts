import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalScreeningInfo } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import {
  addClinicalSession,
  caseMenu,
  createSupervisorCase,
  expandCase,
  markSession,
  openCaseAction,
  pickHubTeam,
  sessionRow,
} from "#/tests/clinical-helpers";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

test("follow-up sessions are offered only for a case in follow-up", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  await signInWithEmail(context, team.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));

  await expandCase(page, clinicalCase.pseudonym);
  await expect(sessionRow(page, "Clinical S4")).toBeVisible();
  await expect(sessionRow(page, "Follow-Up 1")).toHaveCount(0);

  await db
    .update(clinicalScreeningInfo)
    .set({ caseStatus: "FollowUp" })
    .where(eq(clinicalScreeningInfo.id, clinicalCase.caseId));
  await page.reload();
  await expandCase(page, clinicalCase.pseudonym);
  for (const followUp of ["Follow-Up 1", "Follow-Up 2", "Follow-Up 3", "Follow-Up 4"]) {
    await expect(sessionRow(page, followUp)).toBeVisible();
  }
});

test("a missed session is held again on another day, but not marked twice for one day", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  await signInWithEmail(context, team.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));
  await expandCase(page, clinicalCase.pseudonym);

  await markSession(page, "Clinical S1", 10, false);
  await expect(page.getByText("Session attendance recorded successfully").first()).toBeVisible();
  await markSession(page, "Clinical S1", undefined, false);
  await expect(
    page.getByText("This session is already marked for that date").first(),
  ).toBeVisible();
  await markSession(page, "Clinical S1", 12, true);
  await expect(page.getByText("Session attendance recorded successfully").last()).toBeVisible();

  await page.reload();
  await openCaseAction(page, clinicalCase.pseudonym, "View attendance history");
  const history = page.getByRole("dialog", { name: "Clinical attendance history" });
  const s1Rows = history.getByRole("row").filter({ hasText: "S1" });
  await expect(s1Rows).toHaveCount(2);
  await expect(s1Rows.filter({ hasText: "Missed" })).toHaveCount(1);
  await expect(s1Rows.filter({ hasText: "Attended" })).toHaveCount(1);
});

test("case notes are written only for an attended session of an open case", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  await addClinicalSession(clinicalCase.caseId, "S1", {
    supervisorId: team.supervisorId,
    attended: false,
  });
  await addClinicalSession(clinicalCase.caseId, "S2", { supervisorId: team.supervisorId });
  await signInWithEmail(context, team.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));

  await openCaseAction(page, clinicalCase.pseudonym, "Case notes");
  const notes = page.getByRole("dialog", { name: "Case Notes" });
  await notes.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await expect(page.getByRole("option", { name: /^S1 / })).toBeDisabled();
  await expect(page.getByRole("option", { name: /^S2 / })).toBeEnabled();

  await db
    .update(clinicalScreeningInfo)
    .set({ caseStatus: "Terminated" })
    .where(eq(clinicalScreeningInfo.id, clinicalCase.caseId));
  await page.reload();
  await caseMenu(page, clinicalCase.pseudonym);
  await expect(page.getByRole("menuitem", { name: "Case notes" })).toBeDisabled();
});
