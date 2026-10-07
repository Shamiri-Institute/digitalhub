import { expect, type Page, test } from "@playwright/test";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellowComplaints } from "#/db/schema";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * A supervisor files a complaint about a fellow they supervise, edits it from the complaints
 * report, reloads and sees the new text. The edit action used to allow hub coordinators only, so
 * the supervisor's save always failed. A supervisor who does not supervise the fellow does not see
 * the complaint. The database is read only to pick fixtures and to delete the complaint.
 */

test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

const supervisorEmail = "martin.odegaard@test.com";
const complaintComment = `E2E complaint ${Date.now()}`;
const editedComplaint = `Edited complaint ${Date.now()}`;

let targetFellow: { fellowId: string; fellowName: string };
let otherSupervisorEmail: string;

test.beforeAll(async () => {
  const {
    rows: [supervisedFellow],
  } = await db.execute<{ fellowId: string; fellowName: string; implementerId: string }>(sql`
    select f.id as "fellowId", f.fellow_name as "fellowName", m.implementer_id as "implementerId"
    from users u
    join implementer_members m on m.user_id = u.id and m.role = 'SUPERVISOR'
    join fellows f on f.supervisor_id = m.identifier and f.fellow_name is not null
    where u.email = ${supervisorEmail}
      and (select count(*) from fellows o where o.fellow_name = f.fellow_name) = 1
    order by f.id
    limit 1`);
  if (!supervisedFellow)
    throw new Error(`No fellow with a unique name supervised by ${supervisorEmail}`);

  // Same organisation, so the only reason the complaint is hidden is who supervises the fellow.
  const {
    rows: [otherSupervisor],
  } = await db.execute<{ email: string }>(sql`
    select u.email
    from implementer_members m
    join users u on u.id = m.user_id and u.email is not null
    join supervisors s on s.id = m.identifier
    where m.role = 'SUPERVISOR' and m.implementer_id = ${supervisedFellow.implementerId}
      and u.email <> ${supervisorEmail}
      and not exists (select 1 from fellows f where f.id = ${supervisedFellow.fellowId}
        and f.supervisor_id = s.id)
      and ${signableMember()}
    order by u.email
    limit 1`);
  if (!otherSupervisor) throw new Error("No second supervisor in the same organisation");

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

/** The complaint row inside the expanded fellow row of the complaints report. */
async function expandedComplaintRow(page: Page) {
  const fellowRows = await searchRows(page, targetFellow.fellowName);
  await fellowRows.first().getByRole("button").first().click();
  return page.locator("table table tbody tr").filter({ hasText: complaintComment });
}

test("a supervisor edits a complaint about their fellow and sees it after a reload", async ({
  context,
  page,
}) => {
  await signInWithEmail(context, supervisorEmail);

  await page.goto(getUrl("/sc/fellows"), { waitUntil: "networkidle" });
  const fellowRows = await searchRows(page, targetFellow.fellowName);
  await fellowRows.first().locator("td").last().click();
  await page.getByText("Submit Complaint").click();
  const submitDialog = page.getByRole("dialog").filter({ hasText: "Submit complaint" });
  await submitDialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Other" }).click();
  await submitDialog.getByLabel("Additional comments").fill(complaintComment);
  await submitDialog.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Complaint submitted successfully.").first()).toBeVisible();

  await page.goto(getUrl("/sc/reporting/fellow-reports/complaints"), { waitUntil: "networkidle" });
  const complaintRow = await expandedComplaintRow(page);
  await complaintRow.locator("td").last().click();
  await page.getByText("Edit fellow complaint").click();
  const editDialog = page.getByRole("dialog").filter({ hasText: "Edit Fellow Complaint" });
  await editDialog.getByRole("textbox").fill(editedComplaint);
  await editDialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Complaint updated successfully").first()).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(await expandedComplaintRow(page)).toContainText(editedComplaint);
});

test("a supervisor who does not supervise the fellow does not see the complaint", async ({
  context,
  page,
}) => {
  await signInWithEmail(context, otherSupervisorEmail);
  await page.goto(getUrl("/sc/reporting/fellow-reports/complaints"), { waitUntil: "networkidle" });
  await expect(await searchRows(page, targetFellow.fellowName)).toHaveCount(0);
});
