import { expect, test } from "@playwright/test";
import { inArray, like } from "drizzle-orm";

import { db } from "#/db/client";
import { hub, sessionName } from "#/db/schema";
import { hubSessionTypes } from "#/lib/app-constants/hub-session-types";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * Super admins create and edit the hubs of their implementer, in the active project: the name and
 * the label and amount of each session type. Other
 * admins, with or without a team, see the hubs but get no way to add or edit one.
 * The seed makes admin@shamiri.institute a super admin, care.admin@shamiri.institute a Care admin
 * and plain.admin@shamiri.institute a plain admin (db/seed/seed.ts).
 */
const SUPER_ADMIN = "admin@shamiri.institute";
const CARE_ADMIN = "care.admin@shamiri.institute";
const PLAIN_ADMIN = "plain.admin@shamiri.institute";
const RUN_ID = Date.now();
const HUB_PREFIX = `E2E Hub ${RUN_ID}`;
const HUB_NAME = `${HUB_PREFIX} Nairobi`;
const RENAMED_HUB_NAME = `${HUB_PREFIX} Mombasa`;

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ timeout: 3 * 60 * 1000 });

test.afterAll(async () => {
  const createdHubs = await db.query.hub.findMany({
    where: (h, { like }) => like(h.hubName, `${HUB_PREFIX}%`),
    columns: { id: true },
  });
  const hubIds = createdHubs.map((h) => h.id);
  if (hubIds.length > 0) {
    // A hub cannot be deleted while it has session names.
    await db.delete(sessionName).where(inArray(sessionName.hubId, hubIds));
  }
  await db.delete(hub).where(like(hub.hubName, `${HUB_PREFIX}%`));
});

test("a super admin adds a hub, cannot add a duplicate, and edits its name and session types", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, SUPER_ADMIN);
  await page.goto(getUrl("/admin/hubs"));

  await page.getByRole("button", { name: "Add hub" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("Hub name").fill(HUB_NAME);

  // Session types live in collapsed groups; expand intervention to review and edit amounts.
  await addDialog.getByRole("button", { name: "Intervention sessions" }).click();
  await expect(addDialog.getByLabel("s1 label")).toHaveValue("Session 1");
  await expect(addDialog.getByLabel("s1 amount")).toHaveValue("1500");
  await addDialog.getByRole("button", { name: "Supervision sessions" }).click();
  await expect(addDialog.getByLabel("sv1 amount")).toHaveValue("500");
  await addDialog.getByLabel("s1 amount").fill("1750");
  await addDialog.getByRole("button", { name: "Save" }).click();
  const createConfirm = page.getByRole("dialog", { name: "Create hub?" });
  await expect(createConfirm).toContainText(HUB_NAME);
  // The confirmation lists what differs from the standard, and says nothing about edits to attendance.
  await expect(createConfirm).toContainText("1 session type with custom values");
  // Rows name the session type by its label, and the old and new amounts are both announced.
  const changedRow = createConfirm.getByRole("row", { name: /Session 1/ });
  await expect(changedRow).toContainText("was 1,500");
  await expect(changedRow).toContainText("now 1,750");
  await expect(createConfirm).not.toContainText("attendance");
  await createConfirm.getByRole("button", { name: "Create hub", exact: true }).click();
  await expect(createConfirm).toBeHidden();
  await expect(addDialog).toBeHidden();

  let row = (await searchRows(page, HUB_NAME)).first();
  await expect(row).toBeVisible();

  // The hub was stored without a visible ID, which is deprecated.
  const created = await db.query.hub.findFirst({
    where: (h, { eq }) => eq(h.hubName, HUB_NAME),
    columns: { id: true, visibleId: true, projectId: true },
  });
  expect(created?.visibleId).toBeNull();
  expect(created?.projectId).not.toBeNull();

  // The hub got every standard session type, with the amount that was changed in the dialog.
  const createdSessionNames = await db.query.sessionName.findMany({
    where: (n, { eq }) => eq(n.hubId, created?.id ?? ""),
    columns: { sessionName: true, sessionLabel: true, sessionType: true, amount: true },
  });
  expect(createdSessionNames).toHaveLength(hubSessionTypes.length);
  expect(createdSessionNames.find((n) => n.sessionName === "s1")?.amount).toBe(1750);
  expect(createdSessionNames.find((n) => n.sessionName === "s0")).toMatchObject({
    sessionLabel: "Pre-session",
    sessionType: "INTERVENTION",
    amount: 1000,
  });

  // The same name in another case clashes within the implementer and project.
  await page.getByRole("button", { name: "Add hub" }).click();
  const duplicateDialog = page.getByRole("dialog");
  await duplicateDialog.getByLabel("Hub name").fill(HUB_NAME.toUpperCase());
  await duplicateDialog.getByRole("button", { name: "Save" }).click();
  const duplicateConfirm = page.getByRole("dialog", { name: "Create hub?" });
  await expect(duplicateConfirm).toContainText(
    "Labels and fellow pay amounts will be saved as shown.",
  );
  await duplicateConfirm.getByRole("button", { name: "Create hub", exact: true }).click();
  // The rejected create closes the confirmation and leaves the form open.
  await expect(duplicateConfirm).toBeHidden();
  await expect(page.getByText("A hub with this name already exists").first()).toBeVisible();
  await duplicateDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(duplicateDialog).toBeHidden();
  expect(await db.$count(hub, like(hub.hubName, `${HUB_PREFIX}%`))).toBe(1);

  await row.locator('[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem", { name: "Edit hub details", exact: true }).click();
  const editDialog = page.getByRole("dialog");
  await expect(editDialog.getByLabel("Hub name")).toHaveValue(HUB_NAME);
  // The payout note belongs to the confirmation; the form only describes its inputs.
  await expect(editDialog).toContainText("the amount paid to fellows per lesson");
  await expect(editDialog).not.toContainText("Payouts already recorded keep their amount");
  // The dialog starts from the hub's stored session names, including the amount changed on create.
  await editDialog.getByRole("button", { name: "Intervention sessions" }).click();
  await expect(editDialog.getByLabel("s1 label")).toHaveValue("Session 1");
  await expect(editDialog.getByLabel("s1 amount")).toHaveValue("1750");
  await editDialog.getByLabel("Hub name").fill(RENAMED_HUB_NAME);
  await editDialog.getByLabel("s1 label").fill("Lesson 1");
  await editDialog.getByLabel("s1 amount").fill("1800");
  await editDialog.getByRole("button", { name: "Save" }).click();

  // The edit is confirmed first: the rename, the session type that changes, and what an amount
  // change means for payouts.
  const saveConfirm = page.getByRole("dialog", { name: "Save changes to hub?" });
  await expect(saveConfirm).toContainText(`${HUB_NAME} will be renamed to ${RENAMED_HUB_NAME}`);
  await expect(saveConfirm).toContainText("1 session type will change");
  const editedRow = saveConfirm.getByRole("row", { name: /Lesson 1/ });
  await expect(editedRow).toContainText("was Session 1");
  await expect(editedRow).toContainText("was 1,750");
  await expect(editedRow).toContainText("now 1,800");
  await expect(saveConfirm).toContainText("Payouts already recorded keep their amount");
  await saveConfirm.getByRole("button", { name: "Save changes" }).click();
  await expect(saveConfirm).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  row = (await searchRows(page, RENAMED_HUB_NAME)).first();
  await expect(row).toBeVisible();
  await expect(await searchRows(page, HUB_NAME)).toHaveCount(0);

  // The label and amount were saved. The code, the type and the other session names were not touched.
  const editedSessionNames = await db.query.sessionName.findMany({
    where: (n, { eq }) => eq(n.hubId, created?.id ?? ""),
    columns: { sessionName: true, sessionLabel: true, sessionType: true, amount: true },
  });
  expect(editedSessionNames).toHaveLength(hubSessionTypes.length);
  expect(editedSessionNames.find((n) => n.sessionName === "s1")).toMatchObject({
    sessionLabel: "Lesson 1",
    sessionType: "INTERVENTION",
    amount: 1800,
  });
  expect(editedSessionNames.find((n) => n.sessionName === "s0")).toMatchObject({
    sessionLabel: "Pre-session",
    amount: 1000,
  });
});

test("clearing an amount leaves it empty, and typing a value clears the error", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, SUPER_ADMIN);
  await page.goto(getUrl("/admin/hubs"));
  await page.getByRole("button", { name: "Add hub" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Hub name").fill(`${HUB_PREFIX} Empty amount`);
  await dialog.getByRole("button", { name: "Intervention sessions" }).click();

  // The field stays empty instead of snapping back to the standard amount.
  await dialog.getByLabel("s1 amount").fill("");
  await expect(dialog.getByLabel("s1 amount")).toHaveValue("");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Please enter an amount")).toBeVisible();

  // Typing a value, even the standard one, lets the form be saved.
  await dialog.getByLabel("s1 amount").fill("1500");
  await expect(dialog.getByText("Please enter an amount")).toBeHidden();
  await dialog.getByRole("button", { name: "Save" }).click();
  const confirm = page.getByRole("dialog", { name: "Create hub?" });
  await expect(confirm).toContainText("Labels and fellow pay amounts will be saved as shown.");
  await confirm.getByRole("button", { name: "Go back" }).click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect(await db.$count(hub, like(hub.hubName, `${HUB_PREFIX} Empty amount`))).toBe(0);
});

test("an error inside a collapsed group opens the group and shows the error", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, SUPER_ADMIN);
  await page.goto(getUrl("/admin/hubs"));
  await page.getByRole("button", { name: "Add hub" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Hub name").fill(`${HUB_PREFIX} Hidden error`);

  const group = dialog.getByRole("button", { name: /Intervention sessions/ });
  await group.click();
  await dialog.getByLabel("s1 label").fill("");
  await group.click();
  await expect(dialog.getByLabel("s1 label")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Please enter a label")).toBeVisible();
  await expect(group).toContainText("1 to fix");
  await expect(page.getByRole("dialog", { name: "Create hub?" })).toHaveCount(0);

  await dialog.getByLabel("s1 label").fill("Session 1");
  await expect(group).not.toContainText("to fix");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

for (const email of [CARE_ADMIN, PLAIN_ADMIN]) {
  test(`${email} sees the hubs but cannot add or edit one`, async ({ page, context }) => {
    await signInWithEmail(context, email);
    await page.goto(getUrl("/admin/hubs"));

    await expect(page.getByRole("heading", { name: "Hubs" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add hub" })).toHaveCount(0);

    // A seeded hub has a coordinator, so its row has a menu, and the menu has no edit action.
    await page.locator('tbody [aria-haspopup="menu"]').first().click();
    await expect(page.getByRole("menuitem", { name: "Edit hub details", exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("menuitem", { name: "View hub coordinator profile" }),
    ).toBeVisible();
  });
}
