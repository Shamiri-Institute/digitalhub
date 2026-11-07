import { eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, interventionGroup, interventionSession, school } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { signableMember, signInWithEmail, required } from "#/tests/helpers";
import { cellUnder, chooseRowAction, dataRows, getUrl, searchRows } from "#/tests/pages/helpers";

type Fixture = {
  email: string;
  hubId: string;
  implementerId: string;
  projectId: string;
  schoolId: string;
  visibleId: string;
};

// A hub coordinator, and a school in their hub where every fellow of the hub already leads a group,
// so a new fellow with none is the one adding a school picks first.
async function pickHub() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select u.email, h.id as "hubId", h.implementer_id as "implementerId",
      h.project_id as "projectId", s.id as "schoolId", s.visible_id as "visibleId"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    join schools s on s.hub_id = h.id and s.archived_at is null
      and coalesce(s.dropped_out, false) = false
    where ${signableMember()}
      and not exists (select 1 from fellows f where f.hub_id = h.id
        and not exists (select 1 from intervention_groups g where g.leader_id = f.id))
    order by u.email, s.visible_id
    limit 1`);
  return row;
}

async function createDroppedOutFellow(fixture: Fixture, undo: Undo) {
  const fellowId = objectId("fellow");
  const fellowName = `E2E dropped fellow ${Date.now()}`;
  await db.insert(fellow).values({
    id: fellowId,
    fellowName,
    hubId: fixture.hubId,
    implementerId: fixture.implementerId,
    droppedOut: true,
    dropOutReason: "Left the programme",
    droppedOutAt: new Date(),
  });
  undo(() => db.delete(fellow).where(eq(fellow.id, fellowId)));
  return { fellowId, fellowName };
}

test("a group whose leader dropped out stays archived", async ({ page, context, undo }) => {
  const fixture = await pickHub();
  required(fixture, "a hub coordinator whose hub's fellows all lead a group");
  const { fellowId } = await createDroppedOutFellow(fixture, undo);
  const groupId = objectId("group");
  const groupName = `E2E archived ${Date.now()}`;
  await db.insert(interventionGroup).values({
    id: groupId,
    groupName,
    schoolId: fixture.schoolId,
    leaderId: fellowId,
    projectId: fixture.projectId,
    archivedAt: new Date(),
  });
  undo(() => db.delete(interventionGroup).where(eq(interventionGroup.id, groupId)));

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/groups`));
  await chooseRowAction(page, await searchRows(page, groupName), "Unarchive group");
  const confirm = page.getByRole("dialog", { name: "Confirm group unarchive" });
  await confirm.getByRole("button", { name: "Unarchive" }).click();
  await expect(page.getByText("has dropped out").first()).toBeVisible();

  await page.reload();
  const row = await searchRows(page, groupName);
  await expect(await cellUnder(page, row, "Active Status")).toHaveText("Inactive");
});

test("adding a school leaves dropped-out fellows without groups", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fixture = await pickHub();
  required(fixture, "a hub coordinator whose hub's fellows all lead a group");
  const { fellowName } = await createDroppedOutFellow(fixture, undo);
  const schoolName = `E2E School ${Date.now()}`;
  undo(async () => {
    const created = db
      .select({ id: school.id })
      .from(school)
      .where(eq(school.schoolName, schoolName));
    await db.delete(interventionSession).where(inArray(interventionSession.schoolId, created));
    await db.delete(interventionGroup).where(inArray(interventionGroup.schoolId, created));
    await db.delete(school).where(eq(school.schoolName, schoolName));
  });

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/schools"));
  await page.getByRole("button", { name: "Add school" }).click();
  const dialog = page.getByRole("dialog", { name: "Add new school" });
  await dialog.getByRole("textbox", { name: /^School name/ }).fill(schoolName);
  await dialog.getByRole("spinbutton", { name: /^Expected no. of students/ }).fill("16");
  await dialog.getByRole("button", { name: /^Pre-session date/ }).click();
  // Adding a school leaves out fellows with a session that day. The seed schedules sessions from
  // a month before the day it runs onwards, so a day a year earlier is free for every fellow.
  const picker = page.getByRole("dialog").last();
  await picker
    .getByRole("combobox", { name: "Choose the Year" })
    .selectOption(String(new Date().getFullYear() - 1));
  await picker
    .getByRole("gridcell")
    .getByRole("button")
    .filter({ hasText: /^15$/ })
    .first()
    .click();
  await dialog.getByRole("button", { name: "Add School", exact: true }).click();
  await expect(dialog).toBeHidden();

  await chooseRowAction(page, await searchRows(page, schoolName), "View school");
  await page.getByRole("radio", { name: "Select Groups", exact: true }).click();
  // Sixteen students make one group, which goes to an active fellow.
  const groups = dataRows(page);
  await expect(groups).toHaveCount(1);
  await expect(await cellUnder(page, groups.first(), "Fellow")).not.toHaveText(fellowName);
});
