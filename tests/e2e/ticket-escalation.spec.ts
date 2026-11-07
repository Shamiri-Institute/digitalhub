import { eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { ticketEscalations, tickets } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { signableMember, signInWithEmail, required } from "#/tests/helpers";
import { chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

type Fixture = { fellowEmail: string; supervisorEmail: string; clinicalLeadEmail: string };

// A fellow, their supervisor, and the one clinical lead of the supervisor's hub, so the escalation
// has a single recipient to reach.
async function pickClinicalChain() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select fu.email as "fellowEmail", su.email as "supervisorEmail", cu.email as "clinicalLeadEmail"
    from fellows f
    join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
    join users fu on fu.id = m.user_id
    join supervisors sv on sv.id = f.supervisor_id
    join implementer_members sm on sm.identifier = sv.id and sm.role = 'SUPERVISOR'
      and ${signableMember("sm")}
    join users su on su.id = sm.user_id
    join clinical_leads cl on cl.assigned_hub_id = sv.hub_id
    join implementer_members cm on cm.identifier = cl.id and cm.role = 'CLINICAL_LEAD'
      and ${signableMember("cm")}
    join users cu on cu.id = cm.user_id
    where ${signableMember()}
      and (select count(*) from clinical_leads o
        join implementer_members om on om.identifier = o.id and om.role = 'CLINICAL_LEAD'
        where o.assigned_hub_id = sv.hub_id) = 1
      and (select count(*) from implementer_members o
        where o.identifier = sv.id and o.role = 'SUPERVISOR') = 1
    order by fu.email
    limit 1`);
  return row;
}

test("a supervisor escalates a fellow's clinical ticket to the hub's clinical lead", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fixture = await pickClinicalChain();
  required(fixture, "a fellow whose supervisor's hub has one clinical lead");
  const subject = `E2E clinical escalation ${Date.now()}`;
  undo(async () => {
    const created = db.select({ id: tickets.id }).from(tickets).where(eq(tickets.subject, subject));
    await db.delete(ticketEscalations).where(inArray(ticketEscalations.ticketId, created));
    await db.delete(tickets).where(eq(tickets.subject, subject));
  });

  await signInWithEmail(context, fixture.fellowEmail);
  await page.goto(getUrl("/fel/tickets"));
  await page.getByRole("button", { name: "New ticket" }).click();
  const newTicket = page.getByRole("dialog");
  await newTicket.getByPlaceholder("Enter ticket subject").fill(subject);
  await newTicket.getByPlaceholder("Describe the issue").fill("A student needs clinical support.");
  await newTicket.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "CLINICAL" }).click();
  await newTicket.getByRole("button", { name: "Submit" }).click();
  await expect(newTicket).toBeHidden();

  await signInWithEmail(context, fixture.supervisorEmail);
  await page.goto(getUrl("/sc/tickets"));
  await chooseRowAction(page, await searchRows(page, subject), "Escalate ticket");
  const escalate = page.getByRole("dialog", { name: "Escalate Ticket" });
  await escalate.getByRole("combobox").click();
  await page.getByRole("option", { name: "Yes" }).click();
  await escalate
    .getByPlaceholder("Explain why this ticket needs to be escalated")
    .fill("Needs a clinical lead.");
  await escalate.getByRole("button", { name: "Escalate Ticket" }).click();
  await expect(escalate).toBeHidden();

  await signInWithEmail(context, fixture.clinicalLeadEmail);
  await page.goto(getUrl("/cl/tickets"));
  await expect(await searchRows(page, subject)).toBeVisible();
});
