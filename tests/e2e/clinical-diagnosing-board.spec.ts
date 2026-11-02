import type { Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalScreeningInfo, clinicalSessionAttendance } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { createClinicalCase, required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

test.describe.configure({ mode: "serial" });

type Owner = { email: string; supervisorId: string; schoolId: string };
let owner: Owner;

test.beforeAll(async () => {
  // The cases table keys rows by case id, so the test's case keeps its expanded row across the
  // refresh that follows a status change, among the supervisor's other cases.
  const {
    rows: [row],
  } = await db.execute<Owner>(sql`
    select u.email, sv.id as "supervisorId", sc.id as "schoolId"
    from supervisors sv
    join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id
    join schools sc on sc.hub_id = sv.hub_id and sc.archived_at is null
    where ${signableMember()}
      and exists (select 1 from intervention_groups g
        where g.school_id = sc.id and g.archived_at is null)
      and exists (select 1 from clinical_screening_info c where c.current_supervisor_id = sv.id)
    order by sv.id, sc.id
    limit 1`);
  required(row, "no supervisor with clinical cases who has a school with a group");
  owner = row;
});

async function openCase(page: Page, pseudonym: string) {
  const caseRow = (await searchRows(page, pseudonym)).first();
  await caseRow.getByRole("button").first().click();
  return caseRow;
}

test("a case terminated with its row open shows and saves its endpoint issues", async ({
  page,
  context,
  undo,
}) => {
  const clinicalCase = await createClinicalCase({
    schoolId: owner.schoolId,
    currentSupervisorId: owner.supervisorId,
  });
  undo(() => clinicalCase.remove());
  await db
    .update(clinicalScreeningInfo)
    .set({ generalPresentingIssuesBaseline: { "Family issues": "true" } })
    .where(eq(clinicalScreeningInfo.id, clinicalCase.caseId));
  // Terminating a case names one of its clinical sessions; inserting one gives it a known label.
  const sessionLabel = `e2e-termination-${Date.now()}`;
  await db.insert(clinicalSessionAttendance).values({
    caseId: clinicalCase.caseId,
    session: sessionLabel,
    supervisorId: owner.supervisorId,
    attendanceStatus: true,
  });
  const familyIssues = page.getByRole("checkbox", { name: "Family issues" });
  const peerPressure = page.getByRole("checkbox", { name: "Peer pressure" });

  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));
  const caseRow = await openCase(page, clinicalCase.pseudonym);
  await expect(page.getByRole("button", { name: "Save Baseline" })).toBeVisible();
  await expect(familyIssues).toBeChecked();

  await chooseRowAction(page, caseRow, "Terminate case");
  const terminate = page.getByRole("dialog", { name: "Terminate Case" });
  await terminate.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await page.getByRole("option", { name: new RegExp(sessionLabel) }).click();
  await terminate.getByRole("textbox", { name: /Termination Explanation/ }).fill("E2E");
  await terminate.getByRole("button", { name: "Terminate Case" }).click();
  await expect(terminate).toBeHidden();

  await expect(page.getByRole("button", { name: "Save Endpoint" })).toBeVisible();
  await expect(familyIssues).not.toBeChecked();
  await peerPressure.click();
  await page.getByRole("button", { name: "Save Endpoint" }).click();
  await expect(
    page.getByText("Endpoint presenting issues updated successfully", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await openCase(page, clinicalCase.pseudonym);
  await expect(page.getByRole("button", { name: "Save Endpoint" })).toBeVisible();
  await expect(peerPressure).toBeChecked();
  await expect(familyIssues).not.toBeChecked();
});
