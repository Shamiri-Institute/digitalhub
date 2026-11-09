import type { Locator, Page } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import type { ClinicalSessionLabel } from "#/db/enums";
import { clinicalSessionAttendance } from "#/db/schema";
import type { Undo } from "#/tests/fixtures";
import { createClinicalCase, required, signableMember } from "#/tests/helpers";
import { chooseRowAction, searchRows } from "#/tests/pages/helpers";

export type HubTeam = {
  hubId: string;
  schoolId: string;
  supervisorId: string;
  supervisorName: string;
  supervisorEmail: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
};

/**
 * A supervisor and a clinical lead of one hub, both able to sign in, and a school of that hub with
 * a group, which a case's student needs. `offset` picks another team, so specs that change the same
 * people's lists do not share them.
 */
export async function pickHubTeam(offset = 0) {
  const {
    rows: [team],
  } = await db.execute<HubTeam>(sql`
    select sv.hub_id as "hubId", sc.id as "schoolId", sv.id as "supervisorId",
      sv.supervisor_name as "supervisorName", su.email as "supervisorEmail",
      cl.id as "leadId", cl.clinical_lead_name as "leadName", lu.email as "leadEmail"
    from supervisors sv
    join implementer_members sm on sm.identifier = sv.id and sm.role = 'SUPERVISOR'
      and ${signableMember("sm")}
    join users su on su.id = sm.user_id
    join clinical_leads cl on cl.assigned_hub_id = sv.hub_id and cl.clinical_lead_name is not null
    join implementer_members lm on lm.identifier = cl.id and lm.role = 'CLINICAL_LEAD'
      and ${signableMember("lm")}
    join users lu on lu.id = lm.user_id
    join lateral (
      select s.id from schools s
      where s.hub_id = sv.hub_id and s.archived_at is null
        and exists (select 1 from intervention_groups g
          where g.school_id = s.id and g.archived_at is null)
      order by s.id limit 1
    ) sc on true
    where sv.supervisor_name is not null
    order by sv.id, cl.id
    offset ${offset}
    limit 1`);
  required(team, "a supervisor and a clinical lead of one hub with a school that has a group");
  return team;
}

/** A new Active case held by the team's supervisor, removed when the test ends. */
export async function createSupervisorCase(team: HubTeam, undo: Undo) {
  const created = await createClinicalCase({
    schoolId: team.schoolId,
    currentSupervisorId: team.supervisorId,
  });
  undo(created.remove);
  return created;
}

/** A clinical session of the case; `attended: false` records a missed one. */
export async function addClinicalSession(
  caseId: string,
  sessionLabel: ClinicalSessionLabel,
  marked: { supervisorId?: string; attended?: boolean; date?: Date } = {},
) {
  const [created] = await db
    .insert(clinicalSessionAttendance)
    .values({
      caseId,
      session: sessionLabel,
      supervisorId: marked.supervisorId,
      attendanceStatus: marked.attended ?? true,
      date: marked.date,
    })
    .returning({ id: clinicalSessionAttendance.id });
  required(created, "the clinical session fixture");
  return created.id;
}

export async function openCaseAction(page: Page, pseudonym: string, action: string) {
  await chooseRowAction(page, await searchRows(page, pseudonym), action);
}

/** The labels of a row's action menu items, enabled or not, with the menu left open. */
export async function caseMenu(page: Page, pseudonym: string) {
  const row = await searchRows(page, pseudonym);
  await row.first().getByRole("cell").last().click();
  return page.getByRole("menu");
}

/** Opens the case's row, which holds its presenting issues and its session grid. */
export async function expandCase(page: Page, pseudonym: string, scope: Page | Locator = page) {
  const caseRow = await searchRows(page, pseudonym, scope);
  await caseRow.first().getByRole("button").first().click();
}

export function sessionRow(page: Page, sessionName: string) {
  // The grid sits inside the case's row, so the innermost matching row is the session's.
  return page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: sessionName }) })
    .last();
}

/**
 * In an open case row's grid, marks the session; `day` first picks that day of the shown month.
 * Without `day` the date picked before stays, since picking the selected day again clears it.
 */
export async function markSession(
  page: Page,
  sessionName: string,
  day: number | undefined,
  attended: boolean,
) {
  const row = sessionRow(page, sessionName);
  if (day !== undefined) {
    await row.getByRole("button").first().click();
    await page
      .getByRole("gridcell")
      .getByRole("button")
      .filter({ hasText: new RegExp(`^${day}$`) })
      .first()
      .click();
    await page.keyboard.press("Escape");
  }
  await row
    .getByRole("button")
    .nth(attended ? 1 : 2)
    .click();
}
