import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellowGroupReport, interventionGroup, interventionSession, school } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

type Fixture = { email: string; fellowId: string; hubId: string; projectId: string };

async function pickFellow() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select u.email, f.id as "fellowId", h.id as "hubId", h.project_id as "projectId"
    from fellows f
    join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
    join users u on u.id = m.user_id
    join hubs h on h.id = f.hub_id
    where ${signableMember()} and coalesce(f.dropped_out, false) = false
      and (select count(distinct n.session_name) from session_names n
        where n.hub_id = h.id and n.session_name in ('s1', 's2', 's3', 's4')) = 4
    order by u.email
    limit 1`);
  return row;
}

/** A new school and group led by the fellow, and a way to hold its s1-s4 sessions. */
async function createReportGroup(undo: Undo) {
  const fixture = await pickFellow();
  required(fixture, "a fellow whose hub has the s1-s4 session names");
  const { hubId, projectId } = fixture;
  const schoolId = objectId("sch");
  const visibleId = objectId("sch");
  await db.insert(school).values({
    id: schoolId,
    visibleId,
    schoolName: `E2E group report school ${Date.now()}`,
    hubId: fixture.hubId,
  });
  const groupId = objectId("group");
  await db.insert(interventionGroup).values({
    id: groupId,
    groupName: `E2E report group ${Date.now()}`,
    schoolId,
    leaderId: fixture.fellowId,
    projectId: fixture.projectId,
  });
  undo(async () => {
    await db.delete(fellowGroupReport).where(eq(fellowGroupReport.groupId, groupId));
    await db.delete(interventionSession).where(eq(interventionSession.schoolId, schoolId));
    await db.delete(interventionGroup).where(eq(interventionGroup.id, groupId));
    await db.delete(school).where(eq(school.id, schoolId));
  });
  const sessionNames = await db.query.sessionName.findMany({
    where: (n, { and, eq, inArray }) =>
      and(eq(n.hubId, fixture.hubId), inArray(n.sessionName, ["s1", "s2", "s3", "s4"])),
    columns: { id: true, sessionName: true },
    orderBy: (n, { asc }) => asc(n.sessionName),
  });
  // Held sessions without the legacy session_type, which the unlock does not read.
  async function holdSession(name: string, daysAgo: number) {
    const sessionNameId = sessionNames.find((n) => n.sessionName === name)?.id;
    required(sessionNameId, `the hub's ${name} session name`);
    const sessionDate = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
    await db.insert(interventionSession).values({
      id: objectId("isess"),
      sessionId: sessionNameId,
      sessionDate,
      yearOfImplementation: sessionDate.getFullYear(),
      schoolId,
      hubId,
      projectId,
      occurred: true,
    });
  }
  return { email: fixture.email, visibleId, holdSession };
}

test("a group's report opens and saves once its school has held four sessions scheduled in the app", async ({
  page,
  context,
  undo,
}) => {
  const { email, visibleId, holdSession } = await createReportGroup(undo);
  await holdSession("s1", 28);
  await holdSession("s2", 21);
  await holdSession("s3", 14);
  await signInWithEmail(context, email);

  const reportButton = page.getByRole("button", { name: "Complete Group Report" });
  await page.goto(getUrl(`/fel/schools/${visibleId}/group`));
  await expect(page.getByText(/E2E report group/).first()).toBeVisible();
  await expect(reportButton).toHaveCount(0);

  await holdSession("s4", 7);
  await page.reload();
  await reportButton.click();

  // Every question answered with its first option, which reveals no follow-up question.
  const report = page.getByRole("dialog", { name: "Group Report" });
  const questions = report.getByRole("radiogroup");
  await expect(questions.first()).toBeVisible();
  for (let index = 0; index < (await questions.count()); index++) {
    await questions.nth(index).getByRole("radio").first().click();
  }
  const answers = report.getByRole("textbox");
  for (let index = 0; index < (await answers.count()); index++) {
    await answers.nth(index).fill("E2E answer");
  }
  await report.getByRole("button", { name: "Submit Report" }).click();
  await expect(page.getByText(/Group Report submitted for/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "View report" })).toBeVisible();
});

test("the group report opens at its first section after it was closed further down", async ({
  page,
  context,
  undo,
}) => {
  const { email, visibleId, holdSession } = await createReportGroup(undo);
  await holdSession("s1", 28);
  await holdSession("s2", 21);
  await holdSession("s3", 14);
  await holdSession("s4", 7);
  await signInWithEmail(context, email);

  await page.goto(getUrl(`/fel/schools/${visibleId}/group`));
  const reportButton = page.getByRole("button", { name: "Complete Group Report" });
  const report = page.getByRole("dialog", { name: "Group Report" });
  await reportButton.click();
  await report.getByText("Section 9 — Supervision and Support").scrollIntoViewIfNeeded();
  await expect(report).not.toContainText("Section 1 of 9");
  await report.getByRole("button", { name: "Cancel" }).click();
  await expect(report).toBeHidden();

  await reportButton.click();
  await expect(report).toContainText("Section 1 of 9");
});
