import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { hub, school, student } from "#/db/schema";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

type Fixture = { email: string; projectId: string; otherImplementerId: string; expected: number };

let created: { hubId: string; schoolId: string; studentId: string } | null = null;
test.afterEach(async () => {
  if (!created) return;
  await db.delete(student).where(eq(student.id, created.studentId));
  await db.delete(school).where(eq(school.id, created.schoolId));
  await db.delete(hub).where(eq(hub.id, created.hubId));
  created = null;
});

test("the admin students page counts only the students of the admin's implementer", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<Fixture>(sql`
    select u.email, p.id as "projectId", other.id as "otherImplementerId",
      (select count(*)::int from students st
        join schools sc on sc.id = st.school_id
        join hubs h on h.id = sc.hub_id
        where st.archived_at is null and h.implementer_id = m.implementer_id
          and h.project_id = p.id) as expected
    from implementer_members m
    join users u on u.id = m.user_id and u.email is not null and u.archived_at is null
    join projects p on p.id = coalesce(u.active_project_id, (select id from projects where is_default))
    join implementers other on other.id <> m.implementer_id
    where m.role = 'ADMIN' and ${signableMember()}
      and exists (select 1 from hubs h where h.implementer_id = m.implementer_id and h.project_id = p.id)
    order by u.email, other.id
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no admin and a second implementer");

  const suffix = Date.now();
  created = {
    hubId: `hub_e2e_${suffix}`,
    schoolId: `sch_e2e_${suffix}`,
    studentId: `stu_e2e_${suffix}`,
  };
  await db.insert(hub).values({
    id: created.hubId,
    visibleId: `E2E_HUB_${suffix}`,
    hubName: "E2E other implementer hub",
    implementerId: fixture.otherImplementerId,
    projectId: fixture.projectId,
  });
  await db.insert(school).values({
    id: created.schoolId,
    visibleId: `E2E_SCH_${suffix}`,
    schoolName: "E2E other implementer school",
    hubId: created.hubId,
  });
  await db.insert(student).values({
    id: created.studentId,
    visibleId: `E2E_STU_${suffix}`,
    studentName: "E2E other implementer student",
    schoolId: created.schoolId,
  });

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/admin/students"));
  const totalCard = page.getByText("Total no. of students", { exact: true }).locator("xpath=../..");
  await expect(totalCard).toHaveText(new RegExp(`Total no. of students\\s*${fixture.expected}$`));
});
