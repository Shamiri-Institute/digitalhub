import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalScreeningInfo } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { createSupervisorCase, openCaseAction, pickHubTeam } from "#/tests/clinical-helpers";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

async function flag(page: Page, pseudonym: string, reason: string) {
  await openCaseAction(page, pseudonym, "Mark as special/ambiguous");
  const dialog = page.getByRole("dialog", { name: "Reason for Flagging Clinical Case" });
  await dialog.getByRole("textbox", { name: "Reason" }).fill(reason);
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Case flagged for follow up").first()).toBeVisible();
}

async function expectFlagged(page: Page, pseudonym: string, reason: string) {
  await page.reload();
  await openCaseAction(page, pseudonym, "Mark as special/ambiguous");
  await expect(
    page
      .getByRole("dialog", { name: "Reason for Flagging Clinical Case" })
      .getByRole("textbox", { name: "Reason" }),
  ).toHaveValue(reason);
}

test("the supervisor who holds a case flags it for follow-up", async ({ page, context, undo }) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  const reason = `e2e flag ${Date.now()}`;
  await signInWithEmail(context, team.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));

  await flag(page, clinicalCase.pseudonym, reason);
  await expectFlagged(page, clinicalCase.pseudonym, reason);
});

test("a clinical lead flags a case they hold for follow-up", async ({ page, context, undo }) => {
  const team = await pickHubTeam();
  const clinicalCase = await createSupervisorCase(team, undo);
  await db
    .update(clinicalScreeningInfo)
    .set({ currentSupervisorId: null, clinicalLeadId: team.leadId })
    .where(eq(clinicalScreeningInfo.id, clinicalCase.caseId));
  const reason = `e2e lead flag ${Date.now()}`;
  await signInWithEmail(context, team.leadEmail);
  await page.goto(getUrl("/cl/clinical"));

  await flag(page, clinicalCase.pseudonym, reason);
  await expectFlagged(page, clinicalCase.pseudonym, reason);
});
