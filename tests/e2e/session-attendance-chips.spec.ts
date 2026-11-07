import { expect, type Page, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";
import { sessionDisplayName } from "#/lib/utils";

type MissedAttendance = {
  visibleId: string;
  supervisorName: string;
  sessionType: string;
  email: string;
};
let missed: MissedAttendance;

test.beforeAll(async () => {
  // The chip shows the first session of its type, so the school has one session of that type.
  const {
    rows: [row],
  } = await db.execute<MissedAttendance>(sql`
    select s.visible_id as "visibleId", sv.supervisor_name as "supervisorName",
      i.session_type as "sessionType", u.email
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.archived_at is null
    join schools s on s.hub_id = hc.assigned_hub_id and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id
      and i.session_type in ('s0', 's1', 's2', 's3', 's4')
    join supervisor_attendances a on a.session_id = i.id and a.attended = false
    join supervisors sv on sv.id = a.supervisor_id and sv.hub_id = hc.assigned_hub_id
    where ${signableMember()}
      and (select count(*) from intervention_sessions o
        where o.school_id = s.id and o.session_type = i.session_type) = 1
      and (select count(*) from supervisors o
        where o.hub_id = sv.hub_id and o.supervisor_name = sv.supervisor_name) = 1
    order by s.visible_id, sv.supervisor_name, i.session_type
    limit 1`);
  required(row, "no supervisor with a missed session");
  missed = row;
});

async function missedChip(page: Page) {
  await page.goto(getUrl(`/hc/schools/${missed.visibleId}/supervisors`));
  const row = await searchRows(page, missed.supervisorName);
  return row.getByRole("button", { name: `${sessionDisplayName(missed.sessionType)}: Missed` });
}

test("a keyboard user opens an attendance chip's details", async ({ page, context }) => {
  await signInWithEmail(context, missed.email);
  const chip = await missedChip(page);

  await chip.focus();
  await page.keyboard.press("Enter");
  const details = page.getByRole("dialog");
  await expect(details).toContainText("Missed");

  await page.keyboard.press("Escape");
  await expect(details).toBeHidden();
  await expect(chip).toBeFocused();
});

test("a touch user opens an attendance chip's details", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  await signInWithEmail(context, missed.email);
  const page = await context.newPage();
  const chip = await missedChip(page);

  await chip.tap();
  await expect(page.getByRole("dialog")).toContainText("Missed");
  await context.close();
});
