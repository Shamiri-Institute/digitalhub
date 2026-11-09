import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { school } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

async function pickHubMember(role: "HUB_COORDINATOR" | "SUPERVISOR") {
  const {
    rows: [row],
  } = await db.execute<{ email: string; hubId: string }>(sql`
    select u.email, coalesce(hc.assigned_hub_id, sv.hub_id) as "hubId"
    from implementer_members m
    join users u on u.id = m.user_id
    left join hub_coordinators hc on hc.id = m.identifier and m.role = 'HUB_COORDINATOR'
    left join supervisors sv on sv.id = m.identifier and m.role = 'SUPERVISOR'
    where m.role = ${role} and coalesce(hc.assigned_hub_id, sv.hub_id) is not null
      and ${signableMember()}
    order by u.email
    limit 1`);
  required(row, `a ${role} with a hub`);
  return row;
}

async function createSchool(hubId: string, undo: Undo, boardingDay: "Day" | null = "Day") {
  const schoolId = objectId("sch");
  const schoolName = `E2E school rules ${schoolId}`;
  await db.insert(school).values({
    // The edit form saves only a school whose details pass its checks.
    schoolDemographics: "Mixed",
    schoolCounty: "Nairobi",
    schoolSubCounty: "Westlands",
    schoolType: "National",
    boardingDay,
    id: schoolId,
    visibleId: objectId("sch"),
    schoolName,
    hubId,
    numbersExpected: 40,
  });
  undo(() => db.delete(school).where(eq(school.id, schoolId)));
  return schoolName;
}

test("a supervisor's school menu offers only View school", async ({ page, context, undo }) => {
  const supervisor = await pickHubMember("SUPERVISOR");
  const schoolName = await createSchool(supervisor.hubId, undo);
  await signInWithEmail(context, supervisor.email);

  await page.goto(getUrl("/sc/schools"));
  await (
    await searchRows(page, schoolName)
  )
    .getByRole("button", { name: `Actions for ${schoolName}` })
    .click();
  await expect(page.getByRole("menuitem")).toHaveText(["View school"]);
});

test("a school's boarding status is Day, Boarding or Both", async ({ page, context, undo }) => {
  const coordinator = await pickHubMember("HUB_COORDINATOR");
  const schoolName = await createSchool(coordinator.hubId, undo);
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl("/hc/schools"));
  await chooseRowAction(page, await searchRows(page, schoolName), "Edit school information");
  const edit = page.getByRole("dialog", { name: "Edit school information" });
  await edit.getByRole("combobox").filter({ hasText: "Day" }).click();
  await expect(page.getByRole("option")).toHaveText(["Day", "Boarding", "Both"]);
  await page.getByRole("option", { name: "Both" }).click();
  await edit.getByRole("button", { name: "Save Changes" }).click();
  await expect(edit).toBeHidden();

  await page.reload();
  await chooseRowAction(page, await searchRows(page, schoolName), "Edit school information");
  await expect(edit.getByRole("combobox").filter({ hasText: "Both" })).toBeVisible();
});

test("a school with no boarding status saves its other details", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await pickHubMember("HUB_COORDINATOR");
  const schoolName = await createSchool(coordinator.hubId, undo, null);
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl("/hc/schools"));
  await chooseRowAction(page, await searchRows(page, schoolName), "Edit school information");
  const edit = page.getByRole("dialog", { name: "Edit school information" });
  await edit.getByLabel("Principal name").fill("E2E Principal");
  await edit.getByRole("button", { name: "Save Changes" }).click();
  await expect(edit).toBeHidden();

  await page.reload();
  await chooseRowAction(page, await searchRows(page, schoolName), "Edit school information");
  await expect(edit.getByLabel("Principal name")).toHaveValue("E2E Principal");
  await expect(
    edit.getByRole("combobox").filter({ hasText: "Select boarding status" }),
  ).toBeVisible();
});

test("the hub coordinator assigns a school's point supervisor", async ({ page, context, undo }) => {
  const coordinator = await pickHubMember("HUB_COORDINATOR");
  const schoolName = await createSchool(coordinator.hubId, undo);
  const pointSupervisor = await db.query.supervisor.findFirst({
    where: (s, { and, eq, isNotNull, or, isNull }) =>
      and(
        eq(s.hubId, coordinator.hubId),
        isNotNull(s.supervisorName),
        or(isNull(s.droppedOut), eq(s.droppedOut, false)),
      ),
    columns: { supervisorName: true },
    orderBy: (s, { asc }) => asc(s.id),
  });
  required(pointSupervisor?.supervisorName, "an active supervisor in the coordinator's hub");
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl("/hc/schools"));
  await chooseRowAction(page, await searchRows(page, schoolName), "Assign point supervisor");
  const dialog = page.getByRole("dialog", { name: "Assign point supervisor" });
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: pointSupervisor.supervisorName, exact: true }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  const row = await searchRows(page, schoolName);
  await expect(await cellUnder(page, row, "Point supervisor")).toHaveText(
    pointSupervisor.supervisorName,
  );
});
