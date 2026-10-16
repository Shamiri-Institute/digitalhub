import type { Page } from "@playwright/test";
import { expect, test } from "#/tests/fixtures";
import { and } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionGroup } from "#/db/schema";
import { createClinicalCase, emailForProfile, signInWithEmail } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

type Supervisor = { profileId: string; name: string; email: string };

let referrer: Supervisor;
let recipient: Supervisor;
let bystander: Supervisor;
let referrerSchoolId: string;
let pseudonym: string;
let studentName: string;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const supervisors = await db.query.supervisor.findMany({
    where: (s, { isNotNull }) => and(isNotNull(s.hubId), isNotNull(s.supervisorName)),
    columns: { id: true, hubId: true, supervisorName: true },
    orderBy: (s, { asc }) => asc(s.id),
  });
  const signable: (Supervisor & { hubId: string })[] = [];
  for (const s of supervisors) {
    const email = await emailForProfile(s.id, "SUPERVISOR");
    if (email && s.supervisorName && s.hubId) {
      signable.push({ profileId: s.id, name: s.supervisorName, email, hubId: s.hubId });
    }
  }
  for (const candidate of signable) {
    const colleague = signable.find(
      (s) => s.hubId === candidate.hubId && s.profileId !== candidate.profileId,
    );
    const school = await db.query.school.findFirst({
      where: (s, { and, eq, exists, isNull }) =>
        and(
          eq(s.hubId, candidate.hubId),
          isNull(s.archivedAt),
          exists(db.select().from(interventionGroup).where(eq(interventionGroup.schoolId, s.id))),
        ),
      columns: { id: true },
      orderBy: (s, { asc }) => asc(s.id),
    });
    if (colleague && school) {
      referrer = candidate;
      recipient = colleague;
      referrerSchoolId = school.id;
      break;
    }
  }
  const other = signable.find(
    (s) => referrer && s.profileId !== referrer.profileId && s.profileId !== recipient.profileId,
  );
  if (!referrer || !other) {
    throw new Error("seed the database first: no supervisor with a school and a hub colleague");
  }
  bystander = other;
});

test.beforeEach(async ({ undo }) => {
  const created = await createClinicalCase({
    schoolId: referrerSchoolId,
    currentSupervisorId: referrer.profileId,
  });
  pseudonym = created.pseudonym;
  studentName = created.studentName;
  undo(created.remove);
});

function referredCases(page: Page) {
  return page.getByText(/^Cases referred to you/).locator("..");
}

function referralCard(page: Page) {
  return referredCases(page).getByText(studentName, { exact: true }).locator("..");
}

async function referCaseToRecipient(page: Page) {
  await signInWithEmail(page.context(), referrer.email);
  await page.goto(getUrl("/sc/clinical"));
  await chooseRowAction(page, await searchRows(page, pseudonym), "Refer case");

  const dialog = page.getByRole("dialog", { name: "Refer clinical case" });
  await dialog.getByRole("combobox", { name: "Refer to" }).click();
  await page.getByRole("option", { name: "Supervisor", exact: true }).click();
  await dialog.getByRole("button", { name: "Select a supervisor..." }).click();
  await page.getByPlaceholder("Search supervisors...").fill(recipient.name);
  await page.getByRole("option", { name: recipient.name, exact: true }).click();
  await dialog.getByRole("combobox", { name: "Referral Reason" }).click();
  await page.getByRole("option", { name: "Ethical dilemma" }).click();
  await dialog.getByRole("textbox").fill("E2E referral");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).toBeHidden();
  await page.context().clearCookies();
}

test("the recipient accepts a referred case and it becomes theirs", async ({ page }) => {
  await referCaseToRecipient(page);

  await signInWithEmail(page.context(), recipient.email);
  await page.goto(getUrl("/sc/clinical"));
  await referralCard(page).getByRole("button", { name: "Accept referred case" }).click();
  await expect(page.getByText("Referred case accepted").first()).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(referralCard(page)).toHaveCount(0);
  await expect(await searchRows(page, pseudonym)).toHaveCount(1);

  await page.context().clearCookies();
  await signInWithEmail(page.context(), referrer.email);
  await page.goto(getUrl("/sc/clinical"));
  await expect(page.getByRole("button", { name: "New case" })).toBeVisible();
  await expect(await searchRows(page, pseudonym)).toHaveCount(0);
});

test("the recipient rejects a referred case and the referrer keeps it", async ({ page }) => {
  await referCaseToRecipient(page);

  await signInWithEmail(page.context(), recipient.email);
  await page.goto(getUrl("/sc/clinical"));
  await referralCard(page).getByRole("button", { name: "Reject referred case" }).click();
  await expect(page.getByText("Referred case rejected").first()).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(referralCard(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New case" })).toBeVisible();
  await expect(await searchRows(page, pseudonym)).toHaveCount(0);

  await page.context().clearCookies();
  await signInWithEmail(page.context(), referrer.email);
  await page.goto(getUrl("/sc/clinical"));
  await expect(await searchRows(page, pseudonym)).toHaveCount(1);
});

test("a supervisor the case was not referred to does not see the referral", async ({ page }) => {
  await referCaseToRecipient(page);

  await signInWithEmail(page.context(), bystander.email);
  await page.goto(getUrl("/sc/clinical"));
  await expect(referredCases(page)).toBeVisible();
  await expect(referralCard(page)).toHaveCount(0);
});
