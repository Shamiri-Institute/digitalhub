import { expect, type Page, test } from "@playwright/test";
import { and, eq, gt } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalCaseTransferTrail, clinicalScreeningInfo } from "#/db/schema";
import { emailForProfile, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * A supervisor refers a case to another supervisor in their hub, and the recipient accepts or
 * rejects it, all through the UI. Each test reloads and checks what each supervisor's page shows;
 * the database is read only to find fixtures and to put the case back.
 */

type Supervisor = { profileId: string; name: string; email: string };

let referrer: Supervisor;
let recipient: Supervisor;
let bystander: Supervisor;
let caseId: string;
let pseudonym: string;
let studentName: string;
let originalCase: typeof clinicalScreeningInfo.$inferSelect;

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

test.beforeAll(async () => {
  const supervisors = await db.query.supervisor.findMany({
    columns: { id: true, hubId: true, supervisorName: true },
    with: {
      clinicalScreeningCases: {
        where: (c, { and, eq, isNotNull, isNull }) =>
          and(eq(c.caseStatus, "Active"), isNotNull(c.pseudonym), isNull(c.referredToSupervisorId)),
        with: { student: { columns: { studentName: true } } },
        orderBy: (c, { asc }) => asc(c.id),
      },
    },
    orderBy: (s, { asc }) => asc(s.id),
  });

  const signable: (Supervisor & { hubId: string | null })[] = [];
  for (const s of supervisors) {
    const email = s.supervisorName ? await emailForProfile(s.id, "SUPERVISOR") : null;
    if (email && s.supervisorName) {
      signable.push({ profileId: s.id, name: s.supervisorName, email, hubId: s.hubId });
    }
  }

  for (const s of supervisors) {
    const owner = signable.find((candidate) => candidate.profileId === s.id);
    const referable = s.clinicalScreeningCases.find((c) => c.student?.studentName);
    const sameHub = signable.find(
      (candidate) => candidate.hubId === s.hubId && candidate.profileId !== s.id,
    );
    if (owner && referable?.pseudonym && referable.student?.studentName && sameHub) {
      referrer = owner;
      recipient = sameHub;
      caseId = referable.id;
      pseudonym = referable.pseudonym;
      studentName = referable.student.studentName;
      break;
    }
  }
  const other = signable.find(
    (s) => referrer && s.profileId !== referrer.profileId && s.profileId !== recipient.profileId,
  );
  if (!referrer || !other) {
    throw new Error("seed the database first: no supervisor with a case and a hub colleague");
  }
  bystander = other;

  const snapshot = await db.query.clinicalScreeningInfo.findFirst({
    where: (c, { eq }) => eq(c.id, caseId),
  });
  if (!snapshot) throw new Error(`case ${caseId} is gone`);
  originalCase = snapshot;
});

let testStartedAt: Date;
test.beforeEach(() => {
  testStartedAt = new Date();
});

// Cleanup runs in afterEach, not in a finally block: when a test times out, Playwright abandons
// its body but still runs the hooks.
test.afterEach(async () => {
  const { id, ...restorable } = originalCase;
  await db.update(clinicalScreeningInfo).set(restorable).where(eq(clinicalScreeningInfo.id, id));
  await db
    .delete(clinicalCaseTransferTrail)
    .where(
      and(
        eq(clinicalCaseTransferTrail.caseId, id),
        gt(clinicalCaseTransferTrail.createdAt, testStartedAt),
      ),
    );
});

/** The "Cases referred to you" list on a supervisor's clinical page. */
function referredCases(page: Page) {
  return page.getByText(/^Cases referred to you/).locator("..");
}

/** The referral card for the case in that list. */
function referralCard(page: Page) {
  return referredCases(page).getByText(studentName, { exact: true }).locator("..");
}

async function referCaseToRecipient(page: Page) {
  await signInWithEmail(page.context(), referrer.email);
  await page.goto(getUrl("/sc/clinical"), { waitUntil: "networkidle" });
  await (await searchRows(page, pseudonym)).getByRole("cell").last().click();
  await page.getByRole("menu").getByText("Refer case", { exact: true }).click();

  // This dialog's heading is not linked to it, so it has no accessible name.
  const dialog = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { name: "Refer clinical case" }) });
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
  await page.goto(getUrl("/sc/clinical"), { waitUntil: "networkidle" });
  await referralCard(page).getByRole("button", { name: "Accept referred case" }).click();
  await expect(page.getByText("Referred case accepted").first()).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(referralCard(page)).toHaveCount(0);
  await expect(await searchRows(page, pseudonym)).toHaveCount(1);

  // The referring supervisor no longer holds the case.
  await page.context().clearCookies();
  await signInWithEmail(page.context(), referrer.email);
  await page.goto(getUrl("/sc/clinical"), { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "New case" })).toBeVisible();
  await expect(await searchRows(page, pseudonym)).toHaveCount(0);
});

test("the recipient rejects a referred case and the referrer keeps it", async ({ page }) => {
  await referCaseToRecipient(page);

  await signInWithEmail(page.context(), recipient.email);
  await page.goto(getUrl("/sc/clinical"), { waitUntil: "networkidle" });
  await referralCard(page).getByRole("button", { name: "Reject referred case" }).click();
  await expect(page.getByText("Referred case rejected").first()).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(referralCard(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New case" })).toBeVisible();
  await expect(await searchRows(page, pseudonym)).toHaveCount(0);

  await page.context().clearCookies();
  await signInWithEmail(page.context(), referrer.email);
  await page.goto(getUrl("/sc/clinical"), { waitUntil: "networkidle" });
  await expect(await searchRows(page, pseudonym)).toHaveCount(1);
});

test("a supervisor the case was not referred to does not see the referral", async ({ page }) => {
  await referCaseToRecipient(page);

  await signInWithEmail(page.context(), bystander.email);
  await page.goto(getUrl("/sc/clinical"), { waitUntil: "networkidle" });
  await expect(referredCases(page)).toBeVisible();
  await expect(referralCard(page)).toHaveCount(0);
});
