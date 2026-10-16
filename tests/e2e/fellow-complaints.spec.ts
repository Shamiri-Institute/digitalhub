import { expect, type Page, test } from "@playwright/test";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellowComplaints } from "#/db/schema";
import { signableMember, signInWithEmail, uniqueFellowName, required } from "#/tests/helpers";
import { expandRow, getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

test.describe.configure({ mode: "serial" });

const complaintComment = `E2E complaint ${Date.now()}`;
const editedComplaint = `Edited complaint ${Date.now()}`;

let supervisorEmail: string;
let targetFellow: { fellowId: string; fellowName: string };
let otherSupervisorEmail: string;

// Same organisation, so the only reason the complaint is hidden is who supervises the fellow.
async function pickSameOrgSupervisorOfOtherFellows(
  implementerId: string,
  excludedEmail: string,
  fellowId: string,
) {
  const {
    rows: [otherSupervisor],
  } = await db.execute<{ email: string }>(sql`
    select u.email
    from implementer_members m
    join users u on u.id = m.user_id
    join supervisors s on s.id = m.identifier
    where m.role = 'SUPERVISOR' and m.implementer_id = ${implementerId}
      and u.email <> ${excludedEmail}
      and not exists (select 1 from fellows f where f.id = ${fellowId}
        and f.supervisor_id = s.id)
      and ${signableMember()}
    order by u.email
    limit 1`);
  if (!otherSupervisor) throw new Error("No second supervisor in the same organisation");
  return otherSupervisor;
}

test.beforeAll(async () => {
  const {
    rows: [supervisedFellow],
  } = await db.execute<{
    email: string;
    fellowId: string;
    fellowName: string;
    implementerId: string;
  }>(sql`
    select u.email, f.id as "fellowId", f.fellow_name as "fellowName",
      m.implementer_id as "implementerId"
    from users u
    join implementer_members m on m.user_id = u.id and m.role = 'SUPERVISOR'
    join fellows f on f.supervisor_id = m.identifier and f.fellow_name is not null
    where ${signableMember()}
      and ${uniqueFellowName()}
    order by u.email, f.id
    limit 1`);
  required(supervisedFellow, "no supervised fellow");
  supervisorEmail = supervisedFellow.email;

  const otherSupervisor = await pickSameOrgSupervisorOfOtherFellows(
    supervisedFellow.implementerId,
    supervisorEmail,
    supervisedFellow.fellowId,
  );

  targetFellow = supervisedFellow;
  otherSupervisorEmail = otherSupervisor.email;
});

test.afterAll(async () => {
  if (!targetFellow) return;
  await db
    .delete(fellowComplaints)
    .where(
      and(
        eq(fellowComplaints.fellowId, targetFellow.fellowId),
        eq(fellowComplaints.comments, complaintComment),
      ),
    );
});

async function expandedComplaintRow(page: Page) {
  const fellowRows = await searchRows(page, targetFellow.fellowName);
  const complaints = await expandRow(page, fellowRows.first());
  return complaints.locator("tbody tr").filter({ hasText: complaintComment });
}

test("a supervisor edits a complaint about their fellow and sees it after a reload", async ({
  context,
  page,
}) => {
  await signInWithEmail(context, supervisorEmail);

  await page.goto(getUrl("/sc/fellows"));
  const fellowRows = await searchRows(page, targetFellow.fellowName);
  await chooseRowAction(page, fellowRows.first(), "Submit Complaint");
  const submitDialog = page.getByRole("dialog").filter({ hasText: "Submit complaint" });
  await submitDialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Other" }).click();
  await submitDialog.getByLabel("Additional comments").fill(complaintComment);
  await submitDialog.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Complaint submitted successfully.").first()).toBeVisible();

  await page.goto(getUrl("/sc/reporting/fellow-reports/complaints"));
  const complaintRow = await expandedComplaintRow(page);
  await chooseRowAction(page, complaintRow, "Edit fellow complaint");
  const editDialog = page.getByRole("dialog", { name: "Edit Fellow Complaint" });
  await editDialog.getByRole("textbox").fill(editedComplaint);
  await editDialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Complaint updated successfully").first()).toBeVisible();

  await page.reload();
  await expect(await expandedComplaintRow(page)).toContainText(editedComplaint);
});

test("a supervisor who does not supervise the fellow does not see the complaint", async ({
  context,
  page,
}) => {
  await signInWithEmail(context, otherSupervisorEmail);
  await page.goto(getUrl("/sc/reporting/fellow-reports/complaints"));
  await expect(await searchRows(page, targetFellow.fellowName)).toHaveCount(0);
});
