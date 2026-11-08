import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, school } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { sessionDisplayName } from "#/lib/utils";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, getUrl, searchRows } from "#/tests/pages/helpers";

async function pickCoordinatorWithClinicalSession() {
  const {
    rows: [row],
  } = await db.execute<{
    email: string;
    hubId: string;
    sessionNameId: string;
    sessionName: string;
  }>(sql`
    select u.email, h.id as "hubId", n.id as "sessionNameId", n.session_name as "sessionName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    join session_names n on n.hub_id = h.id and n.session_type = 'CLINICAL'
    where ${signableMember()}
    order by u.email, n.session_name
    limit 1`);
  required(row, "a hub coordinator whose hub has a clinical session type");
  return row;
}

test("the schools table names a school's latest held session that has no report", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await pickCoordinatorWithClinicalSession();
  const schoolId = objectId("sch");
  const schoolName = `E2E report submission school ${schoolId}`;
  await db
    .insert(school)
    .values({ id: schoolId, visibleId: objectId("sch"), schoolName, hubId: fixture.hubId });
  undo(async () => {
    await db.delete(interventionSession).where(eq(interventionSession.schoolId, schoolId));
    await db.delete(school).where(eq(school.id, schoolId));
  });
  // A held clinical session as "Schedule a session" saves it, without the legacy session_type.
  const sessionDate = new Date(Date.now() - 24 * 3600 * 1000);
  await db.insert(interventionSession).values({
    id: objectId("isess"),
    sessionId: fixture.sessionNameId,
    sessionDate,
    yearOfImplementation: sessionDate.getFullYear(),
    schoolId,
    hubId: fixture.hubId,
    occurred: true,
  });
  await signInWithEmail(context, fixture.email);

  await page.goto(getUrl("/hc/schools"));
  const row = await searchRows(page, schoolName);
  await expect(await cellUnder(page, row, "Report submission")).toHaveText(
    `${sessionDisplayName(fixture.sessionName)} - Not submitted`,
  );
});
