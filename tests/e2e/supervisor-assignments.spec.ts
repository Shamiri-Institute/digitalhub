import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { school, supervisor } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

test("a dropped-out supervisor cannot be made a school's point supervisor", async ({
  page,
  context,
  undo,
}) => {
  const {
    rows: [coordinator],
  } = await db.execute<{ email: string; hubId: string; implementerId: string }>(sql`
    select u.email, h.id as "hubId", h.implementer_id as "implementerId"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    where ${signableMember()}
    order by u.email desc
    limit 1`);
  required(coordinator, "a hub coordinator with a hub");
  const supervisorId = objectId("sup");
  const supervisorName = `E2E dropped supervisor ${Date.now()}`;
  await db.insert(supervisor).values({
    id: supervisorId,
    supervisorName,
    hubId: coordinator.hubId,
    implementerId: coordinator.implementerId,
    droppedOut: true,
    dropOutReason: "Left the programme",
  });
  undo(() => db.delete(supervisor).where(eq(supervisor.id, supervisorId)));
  const schoolId = objectId("sch");
  const schoolName = `E2E point supervisor school ${Date.now()}`;
  await db
    .insert(school)
    .values({ id: schoolId, visibleId: objectId("sch"), schoolName, hubId: coordinator.hubId });
  undo(() => db.delete(school).where(eq(school.id, schoolId)));
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl("/hc/schools"));
  await chooseRowAction(page, await searchRows(page, schoolName), "Assign point supervisor");
  const dialog = page.getByRole("dialog", { name: "Assign point supervisor" });
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: supervisorName, exact: true }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("has dropped out").first()).toBeVisible();

  await page.reload();
  const row = await searchRows(page, schoolName);
  await expect(await cellUnder(page, row, "Point supervisor")).toHaveText("");
});
