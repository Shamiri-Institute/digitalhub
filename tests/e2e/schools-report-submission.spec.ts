import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, school } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, getUrl, searchRows } from "#/tests/pages/helpers";

async function pickCoordinatorWithClinicalSessionType() {
  const {
    rows: [row],
  } = await db.execute<{
    email: string;
    hubId: string;
    sessionNameId: string;
    sessionName: string;
    earlierSessionNameId: string;
  }>(sql`
    select u.email, h.id as "hubId", n.id as "sessionNameId", n.session_name as "sessionName",
      e.id as "earlierSessionNameId"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    join session_names n on n.hub_id = h.id and n.session_type = 'CLINICAL'
    join session_names e on e.hub_id = h.id and e.session_type = 'INTERVENTION'
      and e.session_name <> n.session_name
    where ${signableMember()}
    order by u.email, n.session_name, e.session_name
    limit 1`);
  required(row, "a hub coordinator whose hub has clinical and intervention session types");
  return row;
}

test("the schools table names a school's latest held session that has no report", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await pickCoordinatorWithClinicalSessionType();
  const schoolId = objectId("sch");
  const schoolName = `E2E report submission school ${schoolId}`;
  await db
    .insert(school)
    .values({ id: schoolId, visibleId: objectId("sch"), schoolName, hubId: fixture.hubId });
  undo(async () => {
    await db.delete(interventionSession).where(eq(interventionSession.schoolId, schoolId));
    await db.delete(school).where(eq(school.id, schoolId));
  });
  // Held sessions as "Schedule a session" saves them, without the legacy session_type. The clinical
  // one is the latest held; a later session that has not occurred does not count.
  const heldDaysAgo = (sessionNameId: string, daysAgo: number, occurred = true) => {
    const sessionDate = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
    return {
      id: objectId("isess"),
      sessionId: sessionNameId,
      sessionDate,
      yearOfImplementation: sessionDate.getFullYear(),
      schoolId,
      hubId: fixture.hubId,
      occurred,
    };
  };
  await db
    .insert(interventionSession)
    .values([
      heldDaysAgo(fixture.earlierSessionNameId, 8),
      heldDaysAgo(fixture.sessionNameId, 1),
      heldDaysAgo(fixture.earlierSessionNameId, -7, false),
    ]);
  await signInWithEmail(context, fixture.email);

  await page.goto(getUrl("/hc/schools"));
  const row = await searchRows(page, schoolName);
  await expect(await cellUnder(page, row, "Report submission")).toHaveText(
    `${fixture.sessionName.toUpperCase()} - Not submitted`,
  );
});
