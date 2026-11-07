import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { student, studentGroupTransferTrail } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell, searchRows } from "#/tests/pages/helpers";

type Fixture = {
  email: string;
  schoolId: string;
  visibleId: string;
  targetGroupName: string;
  sourceGroupId: string;
  sourceGroupName: string;
};

// A hub coordinator's school with two active groups whose names are unique in the school.
async function pickSchool() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select u.email, s.id as "schoolId", s.visible_id as "visibleId",
      t.group_name as "targetGroupName", f.id as "sourceGroupId", f.group_name as "sourceGroupName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join schools s on s.hub_id = hc.assigned_hub_id and s.archived_at is null
      and coalesce(s.dropped_out, false) = false
    join intervention_groups t on t.school_id = s.id and t.archived_at is null
    join intervention_groups f on f.school_id = s.id and f.archived_at is null and f.id <> t.id
    where ${signableMember()}
      and (select count(*) from intervention_groups o
        where o.school_id = s.id and o.group_name in (t.group_name, f.group_name)) = 2
    order by u.email desc, s.visible_id, t.id, f.id
    limit 1`);
  return row;
}

test("moving a student between groups of the school records each move, newest first", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fixture = await pickSchool();
  required(fixture, "a hub coordinator's school with two groups");
  const studentId = objectId("stu");
  const studentName = `E2E transfer student ${Date.now()}`;
  const admissionNumber = String(Date.now()).slice(-9);
  await db.insert(student).values({
    id: studentId,
    visibleId: objectId("stu"),
    studentName,
    schoolId: fixture.schoolId,
    assignedGroupId: fixture.sourceGroupId,
    admissionNumber,
    gender: "Female",
    form: 2,
    stream: "East",
  });
  undo(async () => {
    await db
      .delete(studentGroupTransferTrail)
      .where(eq(studentGroupTransferTrail.studentId, studentId));
    await db.delete(student).where(eq(student.id, studentId));
  });
  await signInWithEmail(context, fixture.email);

  const { visibleId } = fixture;
  // Adding a student with the same admission number to a group offers to move the student there.
  async function moveIntoGroup(groupName: string) {
    await page.goto(getUrl(`/hc/schools/${visibleId}/groups`));
    await chooseRowAction(
      page,
      await rowWithCell(page, page.getByRole("main"), groupName),
      "View students in group",
    );
    await page
      .getByRole("dialog", { name: "Students in group" })
      .getByRole("button", { name: "Add Student" })
      .click();
    const form = page.getByRole("dialog", { name: "Add student to group" });
    await form.getByLabel("Student name").fill(studentName);
    await form.getByRole("combobox", { name: /Gender/ }).click();
    await page.getByRole("option", { name: "Female" }).click();
    await form.getByLabel("Year of birth").fill("2012");
    await form.getByLabel("Admission number").fill(admissionNumber);
    await form.getByLabel("Grade/Form").fill("2");
    await form.getByLabel("Stream").fill("East");
    await form.getByRole("button", { name: "Submit" }).click();
    const transfer = page.getByRole("dialog", { name: "Confirm transfer student" });
    await transfer
      .getByRole("radio", { name: new RegExp(`Admission no. ${admissionNumber}`) })
      .click();
    await transfer.getByRole("button", { name: "Confirm transfer" }).click();
    await expect(page.getByText(/Successfully transferred/).first()).toBeVisible();
  }

  await moveIntoGroup(fixture.targetGroupName);
  await moveIntoGroup(fixture.sourceGroupName);

  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/students`));
  await chooseRowAction(page, await searchRows(page, studentName), "View group transfer history");
  const history = page
    .getByRole("dialog", { name: "View group transfer history" })
    .locator("tbody tr");
  // Newest first: back in the first group, before that the second, and first of all the first.
  await expect(history).toHaveCount(3);
  await expect(history.nth(0)).toContainText(fixture.sourceGroupName);
  await expect(history.nth(1)).toContainText(fixture.targetGroupName);
  await expect(history.nth(2)).toContainText(fixture.sourceGroupName);
});
