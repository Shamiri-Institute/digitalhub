import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession } from "#/db/schema";
import { sessionDisplayName } from "#/lib/utils";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, chooseRowAction } from "#/tests/pages/helpers";

/**
 * The school panel shows the school's counts. After a hub coordinator cancels a session on the
 * school's sessions tab, the panel shows the session as cancelled without a reload. The test puts
 * the session's status back afterwards.
 */

type Fixture = {
  email: string;
  sessionId: string;
  status: (typeof interventionSession.$inferSelect)["status"];
  visibleId: string;
  schoolName: string;
  sessionName: string;
  sessionsCount: number;
  groupsCount: number;
  studentsCount: number;
};

test("the school panel renders on the server and shows a session cancelled on the tab", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<Fixture>(sql`
    select u.email, i.id as "sessionId", i.status, s.visible_id as "visibleId", s.school_name as "schoolName",
      n.session_name as "sessionName",
      (select count(*)::int from intervention_sessions o where o.school_id = s.id) as "sessionsCount",
      (select count(*)::int from intervention_groups g where g.school_id = s.id) as "groupsCount",
      (select count(*)::int from students st where st.school_id = s.id and st.archived_at is null)
        as "studentsCount"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.hub_id = hc.assigned_hub_id
    join intervention_sessions i on i.school_id = s.id and not i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names n on n.id = i.session_id and n.session_type = 'INTERVENTION'
    where ${signableMember()}
      and (select count(*) from intervention_sessions o where o.school_id = s.id) <= 10
      and (select count(*) from intervention_sessions o
        where o.school_id = s.id and o.session_id = i.session_id) = 1
    order by u.email, s.visible_id, i.session_date
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no school with an open session");
  const sessionLabel = sessionDisplayName(fixture.sessionName);

  const schoolUrl = getUrl(`/hc/schools/${fixture.visibleId}/sessions`);
  await signInWithEmail(context, fixture.email);

  await page.goto(schoolUrl);
  const panel = page.getByRole("complementary");
  await expect(panel.getByText(fixture.schoolName, { exact: true })).toBeVisible();
  await expect(panel).toContainText(
    `Sessions${fixture.sessionsCount.toLocaleString()}Groups` +
      `${fixture.groupsCount.toLocaleString()}Students${fixture.studentsCount.toLocaleString()}`,
  );
  await expect(panel.getByTitle(`${sessionLabel}: Not yet occurred`)).toBeVisible();

  const sessionRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: sessionLabel, exact: true }) });
  await chooseRowAction(page, sessionRow, "Cancel session");
  try {
    await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
    await expect(panel.getByTitle(`${sessionLabel}: Cancelled`)).toBeVisible();
  } finally {
    await db
      .update(interventionSession)
      .set({ status: fixture.status })
      .where(eq(interventionSession.id, fixture.sessionId));
  }
});
