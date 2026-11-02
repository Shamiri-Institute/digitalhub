import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, getUrl, rowWithCell } from "#/tests/pages/helpers";

async function pickSupervisorWithTreatmentPlans() {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; supervisorName: string; treatmentPlans: number }>(sql`
    select u.email, s.supervisor_name as "supervisorName",
      count(distinct t.id)::int as "treatmentPlans"
    from clinical_leads cl
    join implementer_members m on m.identifier = cl.id and m.role = 'CLINICAL_LEAD'
    join users u on u.id = m.user_id
    join supervisors s on s.hub_id = cl.assigned_hub_id and s.archived_at is null
      and (select count(*) from supervisors o
        where o.hub_id = s.hub_id and o.supervisor_name = s.supervisor_name) = 1
    join clinical_screening_info c on c.current_supervisor_id = s.id
    join clinical_follow_up_treatment_plan t on t.case_id = c.id
    where ${signableMember()}
    group by u.email, s.id, s.supervisor_name
    order by u.email, s.id
    limit 1`);
  required(fixture, "no clinical lead whose hub has a supervisor with a treatment plan");
  return fixture;
}

test("a clinical lead sees each supervisor's treatment plans counted", async ({
  page,
  context,
}) => {
  const fixture = await pickSupervisorWithTreatmentPlans();
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/cl/supervisors"));

  const supervisorRow = await rowWithCell(page, page.getByRole("main"), fixture.supervisorName);
  await expect(await cellUnder(page, supervisorRow, "No. of Treatment Plans")).toHaveText(
    String(fixture.treatmentPlans),
  );
});
