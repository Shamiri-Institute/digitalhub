import type { Page } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionGroup } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { createClinicalCase, required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

async function pickLeadAndSupervisorInOneHub() {
  const {
    rows: [row],
  } = await db.execute<{
    leadEmail: string;
    leadName: string;
    supervisorEmail: string;
    supervisorId: string;
    supervisorName: string;
    hubId: string;
  }>(sql`
    select lu.email as "leadEmail", cl.clinical_lead_name as "leadName",
      su.email as "supervisorEmail", sv.id as "supervisorId",
      sv.supervisor_name as "supervisorName", sv.hub_id as "hubId"
    from clinical_leads cl
    join implementer_members lm on lm.identifier = cl.id and lm.role = 'CLINICAL_LEAD'
    join users lu on lu.id = lm.user_id
    join supervisors sv on sv.hub_id = cl.assigned_hub_id
    join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
    join users su on su.id = m.user_id
    where cl.clinical_lead_name is not null and sv.supervisor_name is not null and ${signableMember()} and ${signableMember("lm")}
    order by cl.id, sv.id
    limit 1`);
  required(row, "no clinical lead with a supervisor in their hub");
  const school = await db.query.school.findFirst({
    where: (s, { and, eq, exists, isNull }) =>
      and(
        eq(s.hubId, row.hubId),
        isNull(s.archivedAt),
        exists(db.select().from(interventionGroup).where(eq(interventionGroup.schoolId, s.id))),
      ),
    columns: { id: true },
    orderBy: (s, { asc }) => asc(s.id),
  });
  required(school, "no school with a group in the clinical lead's hub");
  return { ...row, schoolId: school.id };
}

function myCases(page: Page) {
  return page.getByRole("heading", { name: /^My Cases/ }).locator("..");
}

test("a clinical lead accepts a referred case before it becomes theirs", async ({ page, undo }) => {
  const fixture = await pickLeadAndSupervisorInOneHub();
  const created = await createClinicalCase({
    schoolId: fixture.schoolId,
    currentSupervisorId: fixture.supervisorId,
  });
  undo(created.remove);

  await signInWithEmail(page.context(), fixture.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));
  await chooseRowAction(page, await searchRows(page, created.pseudonym), "Refer case");
  const dialog = page.getByRole("dialog", { name: "Refer clinical case" });
  await dialog.getByRole("combobox", { name: "Refer to" }).click();
  await page.getByRole("option", { name: "Clinical Lead", exact: true }).click();
  await dialog.getByRole("button", { name: "Select a clinical lead..." }).click();
  await page.getByPlaceholder("Search clinical leads...").fill(fixture.leadName);
  await page.getByRole("option", { name: fixture.leadName, exact: true }).click();
  await dialog.getByRole("combobox", { name: "Referral Reason" }).click();
  await page.getByRole("option", { name: "Severe risk case" }).click();
  await dialog.getByRole("textbox").fill("E2E clinical lead referral");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).toBeHidden();
  await page.context().clearCookies();

  await signInWithEmail(page.context(), fixture.leadEmail);
  await page.goto(getUrl("/cl/clinical"));
  const referralCard = page
    .getByText(/^Cases referred to you/)
    .locator("..")
    .getByRole("listitem")
    .filter({ hasText: created.studentName });
  await expect(referralCard).toContainText(fixture.supervisorName);
  await expect(referralCard).toContainText("Severe risk case");
  await expect(referralCard).toContainText("E2E clinical lead referral");
  await expect(await searchRows(page, created.pseudonym, myCases(page))).toHaveCount(0);

  await referralCard.getByRole("button", { name: "Accept referred case" }).click();
  await expect(page.getByText("Referred case accepted").first()).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(referralCard).toHaveCount(0);
  await expect(await searchRows(page, created.pseudonym, myCases(page))).toHaveCount(1);
});
