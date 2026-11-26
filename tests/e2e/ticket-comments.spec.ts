import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { ticketAttachments, ticketEvents, tickets } from "#/db/schema";
import { deleteObject } from "#/lib/s3/s3.service";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signIn, uniqueSuffix } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { activity, openTicket } from "#/tests/pages/tickets";

type Fixture = {
  fellowEmail: string;
  fellowName: string;
  fellowUserId: string;
  supervisorEmail: string;
  supervisorUserId: string;
};

// A fellow and the supervisor they raise tickets with.
async function pickPair() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select fu.email as "fellowEmail", f.fellow_name as "fellowName", fu.id as "fellowUserId",
      su.email as "supervisorEmail", su.id as "supervisorUserId"
    from fellows f
    join implementer_members fm on fm.identifier = f.id and fm.role = 'FELLOW'
    join users fu on fu.id = fm.user_id
    join supervisors sv on sv.id = f.supervisor_id
    join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
    join users su on su.id = m.user_id
    where ${signableMember()} and ${signableMember("fm")} and f.fellow_name is not null
    order by fu.email, su.email
    limit 1`);
  return row;
}

/** A ticket the fellow raised and sent to their supervisor. */
async function createTicket(fixture: Fixture, undo: Undo, subject: string) {
  const [ticket] = await db
    .insert(tickets)
    .values({
      createdById: fixture.fellowUserId,
      holderId: fixture.supervisorUserId,
      subject,
      description: "Raised by the ticket comment specs.",
      category: "TECH",
    })
    .returning({ id: tickets.id });
  required(ticket, "the ticket");
  undo(async () => {
    const files = await db
      .select({ s3Key: ticketAttachments.s3Key })
      .from(ticketAttachments)
      .where(eq(ticketAttachments.ticketId, ticket.id));
    await Promise.all(files.map(({ s3Key }) => deleteObject({ Key: s3Key }, "ticket-attachments")));
    await db.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, ticket.id));
    await db.delete(ticketEvents).where(eq(ticketEvents.ticketId, ticket.id));
    await db.delete(tickets).where(eq(tickets.id, ticket.id));
  });
  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    kind: "CREATED",
    actorId: fixture.fellowUserId,
    assigneeId: fixture.supervisorUserId,
  });
  return ticket;
}

const photo = {
  name: "referral-form.png",
  mimeType: "image/png",
  buffer: Buffer.from("89504e470d0a1a0a", "hex"),
};

test("the creator and the holder comment with files, and the author hides their comment", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fixture = await pickPair();
  required(fixture, "a fellow with a supervisor");
  const subject = `E2E ticket comments ${uniqueSuffix()}`;
  await createTicket(fixture, undo, subject);

  await signIn(context, fixture.fellowEmail);
  await openTicket(page, "/fel/tickets", subject);
  const form = page.getByRole("form", { name: "Add a comment" });
  await form
    .getByLabel("Add a comment", { exact: true })
    .fill("The counsellor filled in the referral form.");
  await form.getByLabel("File", { exact: true }).setInputFiles(photo);
  await expect(form.getByRole("list", { name: "Files to attach" })).toContainText(photo.name);
  await form.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByText("Comment added").first()).toBeVisible();
  await expect(activity(page)).toContainText("The counsellor filled in the referral form.");

  await signIn(context, fixture.supervisorEmail);
  await openTicket(page, "/sc/tickets", subject);
  await expect(activity(page)).toContainText("The counsellor filled in the referral form.");
  const popup = page.waitForEvent("popup");
  await activity(page).getByRole("button", { name: photo.name }).click();
  await expect(await popup).toHaveURL(/ticket-attachments/);
  await form
    .getByLabel("Add a comment", { exact: true })
    .fill("Thanks, I'll call the fellow today.");
  await form.getByRole("button", { name: "Post comment" }).click();
  await expect(activity(page)).toContainText("Thanks, I'll call the fellow today.");

  await signIn(context, fixture.fellowEmail);
  await openTicket(page, "/fel/tickets", subject);
  await expect(activity(page)).toContainText("Thanks, I'll call the fellow today.");
  // Only the author's own comment offers Hide.
  await expect(activity(page).getByRole("button", { name: "Hide" })).toHaveCount(1);
  await activity(page).getByRole("button", { name: "Hide" }).click();
  await activity(page).getByRole("button", { name: "Hide comment" }).click();
  await expect(activity(page)).toContainText("Comment hidden by You");

  await signIn(context, fixture.supervisorEmail);
  await openTicket(page, "/sc/tickets", subject);
  await expect(activity(page)).toContainText(`Comment hidden by ${fixture.fellowName}`);
  await expect(activity(page)).not.toContainText("The counsellor filled in the referral form.");
  await expect(page.getByRole("button", { name: photo.name })).toHaveCount(0);
});

test("a closed ticket takes no more comments", async ({ page, context, undo }) => {
  const fixture = await pickPair();
  required(fixture, "a fellow with a supervisor");
  const subject = `E2E ticket comments closed ${uniqueSuffix()}`;
  const ticket = await createTicket(fixture, undo, subject);
  await db
    .update(tickets)
    .set({ status: "CLOSED", resolvedAt: new Date(), closedAt: new Date() })
    .where(eq(tickets.id, ticket.id));

  await signIn(context, fixture.supervisorEmail);
  await page.goto(getUrl(`/sc/tickets/${ticket.id}`));
  await expect(page.getByRole("heading", { level: 1, name: subject })).toBeVisible();
  await expect(
    page.getByText("This ticket is closed, so no more comments can be added."),
  ).toBeVisible();
  await expect(page.getByRole("form", { name: "Add a comment" })).toHaveCount(0);
});

test("posting waits for a comment or file, and a file that can't be attached is named in place", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await pickPair();
  required(fixture, "a fellow with a supervisor");
  const subject = `E2E ticket comments ${uniqueSuffix()}`;
  await createTicket(fixture, undo, subject);

  await signIn(context, fixture.fellowEmail);
  await openTicket(page, "/fel/tickets", subject);
  const form = page.getByRole("form", { name: "Add a comment" });
  const post = form.getByRole("button", { name: "Post comment" });
  await expect(post).toBeDisabled();

  await form
    .getByLabel("File", { exact: true })
    .setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("notes") });
  await post.click();
  await expect(form.getByRole("alert")).toHaveText(
    "Remove the files that can't be attached, then post again.",
  );
  await form.getByRole("button", { name: "Remove notes.txt" }).click();
  await expect(form.getByRole("alert")).toHaveCount(0);
  await expect(post).toBeDisabled();
});
