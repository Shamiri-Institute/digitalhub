import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { implementerMember, supervisor, user } from "#/db/schema";
import { emailForProfile, signInWithEmail, required } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

let target: typeof supervisor.$inferSelect;
let targetEmail: string;
let targetUserId: string;
let ownHubEmail: string;
let otherHubEmail: string;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const coordinators = await db.query.hubCoordinator.findMany({
    where: (hc, { isNotNull }) => isNotNull(hc.assignedHubId),
    columns: { id: true, assignedHubId: true },
    orderBy: (hc, { asc }) => asc(hc.id),
  });
  for (const own of coordinators) {
    const other = coordinators.find((hc) => hc.assignedHubId !== own.assignedHubId);
    const ownEmail = await emailForProfile(own.id, "HUB_COORDINATOR");
    const otherEmail = other && (await emailForProfile(other.id, "HUB_COORDINATOR"));
    // The form needs the details a real supervisor has, so the new one copies one of the hub.
    const template = await db.query.supervisor.findFirst({
      where: (s, { eq }) => eq(s.hubId, own.assignedHubId ?? ""),
      orderBy: (s, { asc }) => asc(s.id),
    });
    if (!ownEmail || !otherEmail || !template) continue;

    const suffix = Date.now();
    targetEmail = `e2e-supervisor-${suffix}@example.com`;
    const [createdUser] = await db
      .insert(user)
      .values({ email: targetEmail, name: "E2E Supervisor" })
      .returning({ id: user.id });
    if (!createdUser) throw new Error("could not create the supervisor's user");
    targetUserId = createdUser.id;
    const [createdSupervisor] = await db
      .insert(supervisor)
      .values({
        ...template,
        id: `sup_e2e_${suffix}`,
        supervisorName: `E2E Supervisor ${suffix}`,
        supervisorEmail: targetEmail,
        archivedAt: null,
        droppedOut: false,
      })
      .returning();
    if (!createdSupervisor) throw new Error("could not create the supervisor");
    target = createdSupervisor;
    await db.insert(implementerMember).values({
      userId: targetUserId,
      implementerId: template.implementerId,
      role: "SUPERVISOR",
      identifier: `sup_e2e_${suffix}`,
    });
    ownHubEmail = ownEmail;
    otherHubEmail = otherEmail;
    break;
  }
  required(target, "no hub with a supervisor and coordinators");
});

test.afterAll(async () => {
  if (!target) return;
  await db.delete(implementerMember).where(eq(implementerMember.userId, targetUserId));
  await db.delete(supervisor).where(eq(supervisor.id, target.id));
  await db.delete(user).where(eq(user.id, targetUserId));
});

test("a hub coordinator edits a supervisor in their hub", async ({ page, context }) => {
  const supervisorName = `${target.supervisorName} E2E`;
  await signInWithEmail(context, ownHubEmail);
  await page.goto(getUrl("/hc/supervisors"));

  const row = await searchRows(page, target.supervisorName ?? "");
  await chooseRowAction(page, row, "Edit supervisor information");
  const dialog = page.getByRole("dialog", { name: "Edit supervisor information" });
  await dialog.getByRole("textbox", { name: "Full name *" }).first().fill(supervisorName);
  // The form writes this to the login email, so keep the current one in other casing.
  await dialog.getByRole("textbox", { name: "Email address *" }).fill(targetEmail.toUpperCase());
  await dialog.getByRole("combobox", { name: "County *", exact: true }).click();
  await page.getByRole("option", { name: "Nairobi", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Sub-county *" }).click();
  await page.getByRole("option", { name: "Dagoretti North" }).click();
  await dialog.getByRole("textbox", { name: "Full name *" }).last().fill(supervisorName);
  await dialog.getByRole("button", { name: "Update & Save" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(await searchRows(page, supervisorName)).toBeVisible();
  // No page shows the login email the form writes.
  const login = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.id, targetUserId),
    columns: { email: true },
  });
  expect(login?.email).toBe(targetEmail);
});

test("a hub coordinator in another hub does not list the supervisor", async ({ page, context }) => {
  await signInWithEmail(context, otherHubEmail);
  await page.goto(getUrl("/hc/supervisors"));

  await expect(page.getByRole("button", { name: "Add supervisor" })).toBeVisible();
  await expect(await searchRows(page, target.supervisorName ?? "")).toHaveCount(0);
});
