import type { Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalCaseReview, clinicalCaseTermination, clinicalScreeningInfo } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import {
  addClinicalSession,
  createSupervisorCase,
  expandCase,
  type HubTeam,
  markSession,
  pickHubTeam,
} from "#/tests/clinical-helpers";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

function myCases(page: Page) {
  return page.getByRole("heading", { name: /^My Cases/ }).locator("..");
}

function hubCases(page: Page) {
  return page
    .getByRole("heading", { name: /^All Supervisor Cases In This Hub/ })
    .locator("xpath=following-sibling::*[1]");
}

/** A supervisor case of the team, then handed to `owners`, as a referral to the lead leaves it. */
async function caseOwnedBy(
  team: HubTeam,
  undo: Parameters<typeof createSupervisorCase>[1],
  owners: { currentSupervisorId: string | null; clinicalLeadId: string | null },
) {
  const created = await createSupervisorCase(team, undo);
  await db
    .update(clinicalScreeningInfo)
    .set(owners)
    .where(eq(clinicalScreeningInfo.id, created.caseId));
  return created;
}

async function otherHub(team: HubTeam) {
  const {
    rows: [row],
  } = await db.execute<{ supervisorId: string; leadEmail: string }>(sql`
    select sv.id as "supervisorId", lu.email as "leadEmail"
    from supervisors sv
    join clinical_leads cl on cl.assigned_hub_id = sv.hub_id
    join implementer_members lm on lm.identifier = cl.id and lm.role = 'CLINICAL_LEAD'
      and ${signableMember("lm")}
    join users lu on lu.id = lm.user_id
    where sv.hub_id <> ${team.hubId}
    order by sv.id, cl.id
    limit 1`);
  required(row, "a supervisor and a clinical lead of another hub");
  return row;
}

test("a clinical lead's hub table holds its supervisors' cases, and My Cases holds the lead's own", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const elsewhere = await otherHub(team);
  const supervisorCase = await createSupervisorCase(team, undo);
  const leadOnlyCase = await caseOwnedBy(team, undo, {
    currentSupervisorId: null,
    clinicalLeadId: team.leadId,
  });
  const leadAndOtherHubCase = await caseOwnedBy(team, undo, {
    currentSupervisorId: elsewhere.supervisorId,
    clinicalLeadId: team.leadId,
  });
  const leadAndHubSupervisorCase = await caseOwnedBy(team, undo, {
    currentSupervisorId: team.supervisorId,
    clinicalLeadId: team.leadId,
  });

  await signInWithEmail(context, team.leadEmail);
  await page.goto(getUrl("/cl/clinical"));
  const expected = [
    [supervisorCase, 1, 0],
    [leadOnlyCase, 0, 1],
    [leadAndOtherHubCase, 0, 1],
    [leadAndHubSupervisorCase, 1, 1],
  ] as const;
  for (const [clinicalCase, inHubTable, inMyCases] of expected) {
    await expect(await searchRows(page, clinicalCase.pseudonym, hubCases(page))).toHaveCount(
      inHubTable,
    );
    await expect(await searchRows(page, clinicalCase.pseudonym, myCases(page))).toHaveCount(
      inMyCases,
    );
  }
});

test("a termination waits for review by the hub's clinical lead, not another hub's", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const elsewhere = await otherHub(team);
  const clinicalCase = await createSupervisorCase(team, undo);
  const sessionId = await addClinicalSession(clinicalCase.caseId, "S1", {
    supervisorId: team.supervisorId,
  });
  const supervisorUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, team.supervisorEmail),
    columns: { id: true },
  });
  required(supervisorUser, "the supervisor's user");
  const [termination] = await db
    .insert(clinicalCaseTermination)
    .values({
      caseId: clinicalCase.caseId,
      sessionId,
      terminationDate: new Date(),
      terminationReason: "Student refused to return to sessions",
      terminationReasonExplanation: "e2e review scope",
      createdBy: supervisorUser.id,
    })
    .returning({ id: clinicalCaseTermination.id });
  required(termination, "the termination fixture");
  await db.insert(clinicalCaseReview).values({ terminationId: termination.id });

  const review = page.getByRole("listitem").filter({ hasText: clinicalCase.pseudonym });
  await signInWithEmail(context, team.leadEmail);
  await page.goto(getUrl("/cl/clinical"));
  await expect(review).toContainText("e2e review scope");

  await context.clearCookies();
  await signInWithEmail(context, elsewhere.leadEmail);
  await page.goto(getUrl("/cl/clinical"));
  await expect(page.getByRole("heading", { name: /Cases to review/ })).toBeVisible();
  await expect(review).toHaveCount(0);
});

test("a session a clinical lead marks on a supervisor's case names the lead", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const clinicalCase = await caseOwnedBy(team, undo, {
    currentSupervisorId: team.supervisorId,
    clinicalLeadId: team.leadId,
  });

  await signInWithEmail(context, team.leadEmail);
  await page.goto(getUrl("/cl/clinical"));
  await expandCase(page, clinicalCase.pseudonym, myCases(page));
  await markSession(page, "Clinical S1", 10, true);
  await expect(page.getByText("Session attendance recorded successfully").first()).toBeVisible();

  // No page names who marked a session; it must come from the session, not the case's owners.
  const marked = await db.query.clinicalSessionAttendance.findMany({
    where: (s, { eq }) => eq(s.caseId, clinicalCase.caseId),
    columns: { supervisorId: true, clinicalLeadId: true },
  });
  expect(marked).toEqual([{ supervisorId: null, clinicalLeadId: team.leadId }]);
});
