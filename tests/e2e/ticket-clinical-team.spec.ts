import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  adminUser,
  clinicalTeam,
  implementerMember,
  session,
  ticketEvents,
  tickets,
  user,
} from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import {
  deleteTickets,
  oldestAdminName,
  required,
  signableMember,
  signIn,
  uniqueSuffix,
} from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import {
  createTicket,
  fillAction,
  heldBy,
  openTicket,
  submitAction,
  takeAction,
} from "#/tests/pages/tickets";

// The specs share the hub's clinical lead and clinical team, so they take turns.
test.describe.configure({ mode: "serial" });

type Hub = {
  implementerId: string;
  hubId: string;
  teamEmail: string;
  teamName: string;
  leadEmail: string;
  leadUserId: string;
  supervisorUserId: string;
};

const subjectPrefix = `E2E clinical team tickets ${uniqueSuffix()}`;
let hub: Hub;

// A clinical team member and the one clinical lead of their hub, each able to sign in, and a
// supervisor of the hub to raise tickets for the clinical lead.
test.beforeAll(async () => {
  const {
    rows: [row],
  } = await db.execute<Hub>(sql`
    select tm.implementer_id as "implementerId", ct.assigned_hub_id as "hubId",
      tu.email as "teamEmail", ct.name as "teamName",
      lu.email as "leadEmail", lu.id as "leadUserId", sm.user_id as "supervisorUserId"
    from clinical_teams ct
    join implementer_members tm on tm.identifier = ct.id and tm.role = 'CLINICAL_TEAM'
      and ${signableMember("tm")}
    join users tu on tu.id = tm.user_id
    join clinical_leads cl on cl.assigned_hub_id = ct.assigned_hub_id and cl.dropped_out is not true
      and cl.clinical_lead_name is not null
    join implementer_members lm on lm.identifier = cl.id and lm.role = 'CLINICAL_LEAD'
      and ${signableMember("lm")}
    join users lu on lu.id = lm.user_id
    join supervisors s on s.hub_id = ct.assigned_hub_id
    join implementer_members sm on sm.identifier = s.id and sm.role = 'SUPERVISOR'
    where (select count(*) from clinical_leads o where o.assigned_hub_id = ct.assigned_hub_id) = 1
    order by ct.id
    limit 1`);
  required(row, "a clinical team member in a hub with one clinical lead and a supervisor");
  hub = row;
});

test.afterAll(() => deleteTickets(subjectPrefix));

// Another clinical team member, in `hubId` or in no hub.
async function createTeamMember(hubId: string | null) {
  const email = `e2e-clinical-team-${uniqueSuffix()}@example.com`;
  const name = `E2E Clinical Team ${uniqueSuffix()}`;
  const [created] = await db.insert(user).values({ email, name }).returning({ id: user.id });
  required(created, "a new user");
  const [profile] = await db
    .insert(clinicalTeam)
    .values({ name, email, assignedHubId: hubId, implementerId: hub.implementerId })
    .returning({ id: clinicalTeam.id });
  required(profile, "a new clinical team profile");
  await db.insert(implementerMember).values({
    implementerId: hub.implementerId,
    userId: created.id,
    role: "CLINICAL_TEAM",
    identifier: profile.id,
  });
  const remove = async () => {
    await db.delete(session).where(eq(session.userId, created.id));
    await db.delete(implementerMember).where(eq(implementerMember.userId, created.id));
    await db.delete(clinicalTeam).where(eq(clinicalTeam.id, profile.id));
    await db.delete(user).where(eq(user.id, created.id));
  };
  return { email, name, remove };
}

/** A ticket held by the hub's clinical lead, as if a supervisor had raised it. */
async function ticketHeldByClinicalLead(subject: string) {
  const [ticket] = await db
    .insert(tickets)
    .values({
      createdById: hub.supervisorUserId,
      subject,
      description: "Raised by the clinical team ticket spec.",
      category: "CLINICAL",
      holderId: hub.leadUserId,
      status: "OPEN",
    })
    .returning({ id: tickets.id });
  required(ticket, "the clinical lead's ticket");
  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    kind: "CREATED",
    actorId: hub.supervisorUserId,
    assigneeId: hub.leadUserId,
    reason: "Raised by the clinical team ticket spec.",
  });
}

test("a clinical team member's Tech ticket goes to the Tech team, not their clinical lead", async ({
  page,
  context,
}) => {
  const subject = `${subjectPrefix} raised`;
  const oldest = await oldestAdminName(hub.implementerId, eq(adminUser.team, "TECH"));
  await signIn(context, hub.teamEmail);
  await createTicket(page, "/ct/tickets", subject, "TECH");
  await expect(await heldBy(page, "/ct/tickets", subject)).toContainText(oldest);
});

test("a clinical lead sends a ticket to their clinical team, who reassign it and escalate it to the Care team", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} handed down`;
  const oldest = await oldestAdminName(hub.implementerId, eq(adminUser.team, "CARE"));
  const teammate = await createTeamMember(hub.hubId);
  // The ticket's events name the teammate, so it goes first.
  undo(teammate.remove, () => deleteTickets(subject));

  await signIn(context, hub.leadEmail);
  await createTicket(page, "/cl/tickets", subject, "CLINICAL", hub.teamName);

  await signIn(context, hub.teamEmail);
  await expect(await heldBy(page, "/ct/tickets", subject)).toHaveText("You");
  await openTicket(page, "/ct/tickets", subject);
  const reassign = await fillAction(page, "Reassign", "On leave.");
  await reassign.getByRole("combobox").click();
  await page.getByRole("option", { name: new RegExp(teammate.name) }).click();
  await submitAction(page, "Reassign");

  await signIn(context, teammate.email);
  await expect(await heldBy(page, "/ct/tickets", subject)).toHaveText("You");
  await openTicket(page, "/ct/tickets", subject);
  await takeAction(page, "Escalate", "Needs the Care team.");
  await expect(await heldBy(page, "/ct/tickets", subject)).toContainText(oldest);
});

test("a clinical lead escalates a ticket to their clinical team", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} escalated down`;
  const teammate = await createTeamMember(hub.hubId);
  undo(teammate.remove, () => deleteTickets(subject));
  await ticketHeldByClinicalLead(subject);

  await signIn(context, hub.leadEmail);
  await openTicket(page, "/cl/tickets", subject);
  const escalate = await fillAction(page, "Escalate", "Needs a second look.");
  await escalate.getByRole("combobox").click();
  await page.getByRole("option", { name: new RegExp(teammate.name) }).click();
  await submitAction(page, "Escalate");

  await signIn(context, teammate.email);
  await expect(await heldBy(page, "/ct/tickets", subject)).toHaveText("You");
});

test("a clinical team member with no hub can raise a ticket, but is never offered to a clinical lead", async ({
  page,
  context,
  undo,
}) => {
  const subject = `${subjectPrefix} no hub`;
  const oldest = await oldestAdminName(hub.implementerId, eq(adminUser.team, "TECH"));
  const unplaced = await createTeamMember(null);
  // The ticket's events name the member, so it goes first.
  undo(unplaced.remove, () => deleteTickets(subject));

  await signIn(context, unplaced.email);
  await createTicket(page, "/ct/tickets", subject, "TECH");
  await expect(await heldBy(page, "/ct/tickets", subject)).toContainText(oldest);

  await signIn(context, hub.leadEmail);
  await page.goto(getUrl("/cl/tickets"));
  await page.getByRole("button", { name: "New ticket" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new ticket" });
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "CLINICAL", exact: true }).click();
  await dialog.getByRole("button", { name: "Assign to" }).click();
  await page.getByPlaceholder("Search by name").fill(unplaced.name);
  await expect(page.getByRole("option", { name: unplaced.name })).toHaveCount(0);
});
