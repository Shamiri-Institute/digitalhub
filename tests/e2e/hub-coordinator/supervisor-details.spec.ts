import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { supervisor, user } from "#/db/schema";
import { emailForProfile, signInWithEmail } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

let target: typeof supervisor.$inferSelect;
let targetEmail: string;
let targetUserId: string;
let ownHubEmail: string;
let otherHubEmail: string;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const [supervisors, coordinators] = await Promise.all([
    // From the last supervisor down: other specs pick supervisors from the first, by name.
    db.query.supervisor.findMany({
      where: (s, { isNotNull }) => isNotNull(s.hubId),
      orderBy: (s, { desc }) => desc(s.id),
    }),
    db.query.hubCoordinator.findMany({
      where: (hc, { isNotNull }) => isNotNull(hc.assignedHubId),
      columns: { id: true, assignedHubId: true },
      orderBy: (hc, { asc }) => asc(hc.id),
    }),
  ]);

  for (const candidate of supervisors) {
    // The form writes the login email of the profile's user, so skip profiles shared by users.
    const members = await db.query.implementerMember.findMany({
      where: (m, { and, eq }) => and(eq(m.identifier, candidate.id), eq(m.role, "SUPERVISOR")),
      columns: { userId: true },
    });
    const [onlyMember] = members;
    if (members.length !== 1 || !onlyMember) continue;
    const email = await emailForProfile(candidate.id, "SUPERVISOR");
    const own = coordinators.find((hc) => hc.assignedHubId === candidate.hubId);
    const other = coordinators.find((hc) => hc.assignedHubId !== candidate.hubId);
    const ownEmail = own && (await emailForProfile(own.id, "HUB_COORDINATOR"));
    const otherEmail = other && (await emailForProfile(other.id, "HUB_COORDINATOR"));
    if (email && ownEmail && otherEmail) {
      target = candidate;
      targetEmail = email;
      targetUserId = onlyMember.userId;
      ownHubEmail = ownEmail;
      otherHubEmail = otherEmail;
      break;
    }
  }
  if (!target) throw new Error("seed the database first: no supervisor with coordinators");
});

test.afterAll(async () => {
  await db.update(supervisor).set(target).where(eq(supervisor.id, target.id));
  await db.update(user).set({ email: targetEmail }).where(eq(user.id, targetUserId));
});

test("a hub coordinator edits a supervisor in their hub", async ({ page, context }) => {
  const supervisorName = `${target.supervisorName} E2E`;
  await signInWithEmail(context, ownHubEmail);
  await page.goto(getUrl("/hc/supervisors"));

  const row = await searchRows(page, target.supervisorName ?? "");
  await chooseRowAction(page, row, "Edit supervisor information");
  const dialog = page.getByRole("dialog", { name: "Edit supervisor information" });
  await dialog.getByRole("textbox", { name: "Full name *" }).first().fill(supervisorName);
  // The form writes this to the login email, so keep the current one.
  await dialog.getByRole("textbox", { name: "Email address *" }).fill(targetEmail);
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
