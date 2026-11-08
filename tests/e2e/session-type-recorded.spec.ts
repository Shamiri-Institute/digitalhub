import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, school } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { scheduleUrl, waitForHydration } from "#/tests/pages/helpers";

type Fixture = {
  email: string;
  hubId: string;
  sessionNameId: string;
  sessionName: string;
  sessionLabel: string;
};

// A hub coordinator whose hub has a clinical session type with a label unique in the hub, which
// "Schedule a session" offers by that label.
async function pickCoordinator() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select u.email, h.id as "hubId", n.id as "sessionNameId", n.session_name as "sessionName",
      n.session_label as "sessionLabel"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    join session_names n on n.hub_id = h.id and n.session_type = 'CLINICAL'
      and n.session_label is not null
    where ${signableMember()}
      and (select count(*) from session_names o
        where o.hub_id = h.id and o.session_label = n.session_label) = 1
    order by u.email, n.session_name
    limit 1`);
  required(row, "a hub coordinator whose hub has a clinical session type");
  return row;
}

async function createSchool(hubId: string, undo: Undo) {
  const schoolId = objectId("sch");
  const schoolName = `E2E session type school ${Date.now()}`;
  await db.insert(school).values({ id: schoolId, visibleId: objectId("sch"), schoolName, hubId });
  undo(async () => {
    await db.delete(interventionSession).where(eq(interventionSession.schoolId, schoolId));
    await db.delete(school).where(eq(school.id, schoolId));
  });
  return { schoolId, schoolName };
}

test("a session scheduled in the app stores its session name as its type", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await pickCoordinator();
  const { schoolId, schoolName } = await createSchool(fixture.hubId, undo);
  await signInWithEmail(context, fixture.email);

  await page.goto(await scheduleUrl(context, "/hc/schedule", new Date()));
  const scheduleButton = page.getByRole("button", { name: "Schedule a session" });
  await waitForHydration(scheduleButton);
  await scheduleButton.click();
  const dialog = page.getByRole("dialog", { name: "Schedule a session" });
  await dialog.getByRole("combobox", { name: "Select a session type" }).click();
  await page.getByRole("option", { name: `Clinical session - ${fixture.sessionLabel}` }).click();
  await dialog.getByRole("combobox", { name: /^Select school/ }).click();
  await page.getByRole("option", { name: schoolName, exact: true }).click();
  await dialog.getByRole("button", { name: "Pick a date" }).click();
  await page.getByRole("gridcell").getByRole("button").filter({ hasText: /^15$/ }).first().click();
  await dialog.getByRole("button", { name: "Pick a time" }).click();
  await page.getByRole("spinbutton", { name: "Hour" }).fill("9");
  await page.getByRole("spinbutton", { name: "Minutes" }).fill("30");
  await page.getByRole("button", { name: "Save" }).click();
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Successfully created new session").first()).toBeVisible();

  // The hub's charts group sessions by this stored copy of the name and draw it only as bars,
  // so the copy is read here.
  const stored = await db
    .select({ sessionType: interventionSession.sessionType })
    .from(interventionSession)
    .where(eq(interventionSession.schoolId, schoolId));
  expect(stored).toEqual([{ sessionType: fixture.sessionName }]);
});
