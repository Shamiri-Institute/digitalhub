import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { supervisor, user } from "#/db/schema";
import { emailForProfile, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * A hub coordinator edits the supervisors of their own hub through the UI. The edit form also
 * writes the supervisor's login email, so the test checks that the login email stays the same.
 */

let target: typeof supervisor.$inferSelect;
let targetEmail: string;
let targetUserId: string;
let ownHubEmail: string;
let otherHubEmail: string;

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

test.beforeAll(async () => {
  const [supervisors, coordinators] = await Promise.all([
    db.query.supervisor.findMany({
      where: (s, { isNotNull }) => isNotNull(s.hubId),
      orderBy: (s, { asc }) => asc(s.id),
    }),
    db.query.hubCoordinator.findMany({
      where: (hc, { isNotNull }) => isNotNull(hc.assignedHubId),
      columns: { id: true, assignedHubId: true },
      orderBy: (hc, { asc }) => asc(hc.id),
    }),
  ]);

  for (const candidate of supervisors) {
    const email = await emailForProfile(candidate.id, "SUPERVISOR");
    const own = coordinators.find((hc) => hc.assignedHubId === candidate.hubId);
    const other = coordinators.find((hc) => hc.assignedHubId !== candidate.hubId);
    const ownEmail = own && (await emailForProfile(own.id, "HUB_COORDINATOR"));
    const otherEmail = other && (await emailForProfile(other.id, "HUB_COORDINATOR"));
    if (email && ownEmail && otherEmail) {
      target = candidate;
      targetEmail = email;
      ownHubEmail = ownEmail;
      otherHubEmail = otherEmail;
      break;
    }
  }
  if (!target) throw new Error("seed the database first: no supervisor with coordinators");

  const member = await db.query.implementerMember.findFirst({
    where: (m, { and, eq }) => and(eq(m.identifier, target.id), eq(m.role, "SUPERVISOR")),
    columns: { userId: true },
  });
  if (!member) throw new Error(`supervisor ${target.id} has no user`);
  targetUserId = member.userId;
});

test.afterAll(async () => {
  await db.update(supervisor).set(target).where(eq(supervisor.id, target.id));
  await db.update(user).set({ email: targetEmail }).where(eq(user.id, targetUserId));
});

test("a hub coordinator edits a supervisor in their hub", async ({ page, context }) => {
  const supervisorName = `${target.supervisorName} E2E`;
  await signInWithEmail(context, ownHubEmail);
  await page.goto(getUrl("/hc/supervisors"));

  const row = page.getByRole("row").filter({ hasText: target.supervisorName ?? "" });
  await row.getByRole("cell").last().click();
  await page.getByRole("menuitem", { name: "Edit supervisor information" }).click();
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
  await expect(page.getByRole("row").filter({ hasText: supervisorName })).toBeVisible();
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
  await expect(page.getByRole("row").filter({ hasText: target.supervisorName ?? "" })).toHaveCount(
    0,
  );
});
