import { expect, test } from "@playwright/test";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { supervisorComplaints } from "#/db/schema";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

const complaintComment = `E2E supervisor complaint ${Date.now()}`;

let coordinatorEmail: string;
let targetSupervisor: { supervisorId: string; supervisorName: string };

test.beforeAll(async () => {
  const {
    rows: [match],
  } = await db.execute<{ email: string; supervisorId: string; supervisorName: string }>(sql`
    select u.email, s.id as "supervisorId", s.supervisor_name as "supervisorName"
    from users u
    join implementer_members m on m.user_id = u.id and m.role = 'HUB_COORDINATOR'
    join hub_coordinators hc on hc.id = m.identifier
    join supervisors s on s.hub_id = hc.assigned_hub_id and s.supervisor_name is not null
      and s.dropped_out is not true
    where u.email is not null and ${signableMember()}
      and (select count(*) from supervisors o where o.supervisor_name = s.supervisor_name) = 1
    order by u.email, s.id desc
    limit 1`);
  if (!match) throw new Error("seed the database first: no supervisor in a coordinator's hub");
  coordinatorEmail = match.email;
  targetSupervisor = match;
});

test.afterAll(async () => {
  if (!targetSupervisor) return;
  await db
    .delete(supervisorComplaints)
    .where(
      and(
        eq(supervisorComplaints.supervisorId, targetSupervisor.supervisorId),
        eq(supervisorComplaints.comments, complaintComment),
      ),
    );
});

test("a hub coordinator submits a complaint about a supervisor from the complaint types", async ({
  context,
  page,
}) => {
  await signInWithEmail(context, coordinatorEmail);
  await page.goto(getUrl("/hc/supervisors"));

  const row = await searchRows(page, targetSupervisor.supervisorName);
  await chooseRowAction(page, row.first(), "Submit complaint");
  const dialog = page.getByRole("dialog").filter({ hasText: "Submit complaint" });
  await dialog.getByRole("combobox").click();
  await expect(page.getByRole("option")).toHaveText(["Dress Code", "Prolonged Absence", "Other"]);
  await page.getByRole("option", { name: "Dress Code" }).click();
  await dialog.getByLabel("Additional comments").fill(complaintComment);
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Complaint submitted successfully.").first()).toBeVisible();

  // No page lists supervisor complaints yet.
  const stored = await db.query.supervisorComplaints.findFirst({
    where: (c, { and, eq }) =>
      and(eq(c.supervisorId, targetSupervisor.supervisorId), eq(c.comments, complaintComment)),
    columns: { complaint: true },
  });
  expect(stored?.complaint).toBe("Dress Code");
});
