import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signInAs, uniqueFellowName } from "#/tests/helpers";
import { getUrl, chooseRowAction } from "#/tests/pages/helpers";

async function pickSchoolWithStudentsAndSchoolWithGroups(coordinatorId: string | null) {
  const {
    rows: [fixture],
  } = await db.execute<{ fromVisibleId: string; toSchoolId: string; toSchoolName: string }>(sql`
    select src.visible_id as "fromVisibleId", dst.id as "toSchoolId", dst.school_name as "toSchoolName"
    from hub_coordinators hc
    join schools src on src.hub_id = hc.assigned_hub_id and src.archived_at is null
    join schools dst on dst.hub_id = hc.assigned_hub_id and dst.archived_at is null and dst.id <> src.id
    where hc.id = ${coordinatorId}
      and exists (select 1 from students st where st.school_id = src.id)
      and exists (select 1 from intervention_groups g where g.school_id = dst.id and g.archived_at is null)
      and (select count(*) from schools o where o.school_name = dst.school_name) = 1
    order by src.visible_id, dst.visible_id
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no hub with two schools and groups");
  return fixture;
}

test("a hub coordinator picks a school and sees its groups in the move-school form", async ({
  page,
  context,
}) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const fixture = await pickSchoolWithStudentsAndSchoolWithGroups(coordinator.identifier);
  const groups = await db.query.interventionGroup.findMany({
    where: (g, { and, eq, isNull }) =>
      and(eq(g.schoolId, fixture.toSchoolId), isNull(g.archivedAt)),
    columns: { groupName: true },
    with: { leader: { columns: { fellowName: true } } },
    orderBy: (g, { asc }) => asc(g.groupName),
  });

  await page.goto(getUrl(`/hc/schools/${fixture.fromVisibleId}/students`));
  await chooseRowAction(page, page.locator("table tbody tr").first(), "Move to another school");

  const dialog = page.getByRole("dialog", { name: "Move student to another school" });
  await dialog.getByRole("combobox", { name: /^Destination school/ }).click();
  await page.getByRole("option", { name: fixture.toSchoolName, exact: true }).click();
  const groupSelect = dialog.getByRole("combobox", { name: /^Group \/ Fellow/ });
  await expect(groupSelect).toBeEnabled();
  await groupSelect.click();
  await expect(page.getByRole("option")).toHaveText(
    groups.map((g) => `${g.groupName} · ${g.leader.fellowName}`),
  );
});

async function pickUniquelyNamedFellowLeadingGroupAtSchoolWithSessions(
  supervisorId: string | null,
) {
  const {
    rows: [fixture],
  } = await db.execute<{ fellowId: string; fellowName: string }>(sql`
    select f.id as "fellowId", f.fellow_name as "fellowName"
    from fellows f
    where f.supervisor_id = ${supervisorId} and f.fellow_name is not null
      and ${uniqueFellowName()}
      and exists (select 1 from intervention_groups g
        join intervention_sessions s on s.school_id = g.school_id and s.occurred
        where g.leader_id = f.id)
    order by f.id
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no fellow who leads a group");
  return fixture;
}

test("a supervisor picks a fellow and a group and sees the group's sessions", async ({
  page,
  context,
}) => {
  const supervisor = await signInAs(context, "SUPERVISOR");
  const fixture = await pickUniquelyNamedFellowLeadingGroupAtSchoolWithSessions(
    supervisor.identifier,
  );
  const groups = await db.query.interventionGroup.findMany({
    where: (g, { eq }) => eq(g.leaderId, fixture.fellowId),
    columns: { groupName: true },
    with: { school: { columns: { schoolName: true } } },
    orderBy: (g, { asc }) => asc(g.groupName),
  });

  await page.goto(getUrl("/sc/reporting/recordings"));
  await page.getByRole("button", { name: "Upload recording" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Select a fellow" }).click();
  await page.getByPlaceholder("Search fellows...").fill(fixture.fellowName);
  await page.getByRole("option", { name: fixture.fellowName, exact: true }).click();
  const groupSelect = dialog.getByRole("combobox", { name: /^Group/ });
  await expect(groupSelect).toBeEnabled();
  await groupSelect.click();
  await expect(page.getByRole("option")).toHaveText(
    groups.map((g) => `${g.groupName} (${g.school.schoolName})`),
  );
  await page.getByRole("option").first().click();
  const sessionSelect = dialog.getByRole("combobox", { name: /^Session/ });
  await expect(sessionSelect).toBeEnabled();
  await sessionSelect.click();
  await expect(page.getByRole("option").first()).toBeVisible();
});
