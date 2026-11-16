import type { Page } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, interventionGroup } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { createSupervisedSession } from "#/tests/delivery-helpers";
import { expect, test, type Undo } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

type SupervisedSession = Awaited<ReturnType<typeof createSupervisedSession>>;

/** A fellow of the supervisor with no group, and a way to give them groups at the school. */
async function addFellowWithoutGroup(
  supervised: SupervisedSession,
  undo: Undo,
  { droppedOut = false }: { droppedOut?: boolean } = {},
) {
  const fellowId = objectId("fellow");
  const fellowName = `${supervised.supervisorName} fellow ${fellowId.slice(-6)}`;
  await db.insert(fellow).values({
    id: fellowId,
    fellowName,
    hubId: supervised.hubId,
    implementerId: supervised.implementerId,
    supervisorId: supervised.supervisorId,
    droppedOut,
    dropOutReason: droppedOut ? "Left the programme" : null,
  });
  undo(async () => {
    await db.delete(interventionGroup).where(eq(interventionGroup.leaderId, fellowId));
    await db.delete(fellow).where(eq(fellow.id, fellowId));
  });
  return { fellowId, fellowName };
}

/** Groups at schools other than the session's, created on the fly, since a fellow leads one group per school. */
async function addGroup(
  supervised: SupervisedSession,
  leaderId: string,
  { archived = false }: { archived?: boolean } = {},
) {
  const groupId = objectId("group");
  const groupName = `E2E dropout group ${groupId.slice(-6)}`;
  await db.insert(interventionGroup).values({
    id: groupId,
    groupName,
    schoolId: supervised.schoolId,
    leaderId,
    projectId: supervised.projectId,
    archivedAt: archived ? new Date() : null,
  });
  return { groupId, groupName };
}

async function openDropout(page: Page, fellowName: string) {
  await page.goto(getUrl("/hc/fellows"));
  await chooseRowAction(page, await searchRows(page, fellowName), "Drop-out fellow");
  return page.getByRole("dialog").filter({ hasText: "Drop out fellow" });
}

async function fellowStatus(page: Page, fellowName: string) {
  await page.goto(getUrl("/hc/fellows"));
  return cellUnder(page, await searchRows(page, fellowName), "Status");
}

test("a fellow drops out with a reason once each active group has a new leader", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const leaving = await addFellowWithoutGroup(supervised, undo);
  const replacement = await addFellowWithoutGroup(supervised, undo);
  const activeGroup = await addGroup(supervised, leaving.fellowId);
  await signInWithEmail(context, supervised.coordinatorEmail);

  const dropout = await openDropout(page, leaving.fellowName);
  await dropout.getByRole("button", { name: "Submit" }).click();
  await expect(dropout.getByText("Please select reason for drop out.")).toBeVisible();
  await dropout.getByRole("combobox", { name: /^Select reason/ }).click();
  await page.getByRole("option").first().click();
  await dropout.getByRole("button", { name: "Submit" }).click();
  await page
    .getByRole("dialog")
    .filter({ hasText: "Confirm drop out" })
    .getByRole("button", { name: "Confirm" })
    .click();

  const replaceStep = page
    .getByRole("dialog")
    .filter({ hasText: "assign a replacement or archive" });
  await expect(replaceStep).toContainText(activeGroup.groupName);
  await replaceStep.getByRole("button", { name: "Replace", exact: true }).click();
  const replace = page.getByRole("dialog").filter({ hasText: "Select replacement fellow" });
  await replace.getByRole("combobox", { name: "Select supervisor" }).click();
  await page.getByRole("option", { name: supervised.supervisorName, exact: true }).click();
  await replace.getByRole("combobox", { name: "Select replacement fellow" }).click();
  await page.getByRole("option", { name: replacement.fellowName, exact: true }).click();
  await replace.getByRole("button", { name: "Replace", exact: true }).click();
  await expect(
    page.getByText(`successfully assigned to ${replacement.fellowName}`).first(),
  ).toBeVisible();

  await page
    .getByRole("dialog")
    .filter({ hasText: "Confirm drop out" })
    .getByRole("button", { name: "Confirm" })
    .click();
  await expect(
    page.getByText(`${leaving.fellowName} successfully dropped out.`).first(),
  ).toBeVisible();

  await expect(await fellowStatus(page, leaving.fellowName)).not.toHaveText("Active");
  // The fellows table does not show the dropout reason.
  const stored = await db.query.fellow.findFirst({
    where: (f, { eq }) => eq(f.id, leaving.fellowId),
    columns: { dropOutReason: true },
  });
  expect(stored?.dropOutReason).toBeTruthy();
});

test("a fellow whose groups are all archived drops out without a replacement", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const leaving = await addFellowWithoutGroup(supervised, undo);
  await addGroup(supervised, leaving.fellowId, { archived: true });
  await signInWithEmail(context, supervised.coordinatorEmail);

  const dropout = await openDropout(page, leaving.fellowName);
  await dropout.getByRole("combobox", { name: /^Select reason/ }).click();
  await page.getByRole("option").first().click();
  await dropout.getByRole("button", { name: "Submit" }).click();
  await page
    .getByRole("dialog")
    .filter({ hasText: "Confirm drop out" })
    .getByRole("button", { name: "Confirm" })
    .click();
  await expect(
    page.getByText(`${leaving.fellowName} successfully dropped out.`).first(),
  ).toBeVisible();

  await expect(await fellowStatus(page, leaving.fellowName)).not.toHaveText("Active");
});

test("a hub coordinator creates and archives a group, but not one led by a dropped-out fellow", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const activeFellow = await addFellowWithoutGroup(supervised, undo);
  const droppedFellow = await addFellowWithoutGroup(supervised, undo, { droppedOut: true });
  undo(() =>
    db
      .delete(interventionGroup)
      .where(inArray(interventionGroup.leaderId, [activeFellow.fellowId, droppedFellow.fellowId])),
  );
  await signInWithEmail(context, supervised.coordinatorEmail);
  const groupsPage = getUrl(`/hc/schools/${supervised.schoolVisibleId}/groups`);

  async function createGroupLedBy(fellowName: string) {
    await page.goto(groupsPage);
    await page.getByRole("button", { name: "New group" }).click();
    const create = page.getByRole("dialog", { name: "Create new group" });
    await create.getByRole("combobox").first().click();
    await page.getByRole("option", { name: supervised.supervisorName, exact: true }).click();
    await create.getByRole("combobox").last().click();
    await page.getByRole("option", { name: fellowName, exact: true }).click();
    await create.getByRole("button", { name: "Submit" }).click();
  }

  await createGroupLedBy(droppedFellow.fellowName);
  await expect(
    page.getByText("has dropped out, so they cannot lead a group").first(),
  ).toBeVisible();

  await createGroupLedBy(activeFellow.fellowName);
  await expect(page.getByText("Successfully created new group").first()).toBeVisible();

  await page.reload();
  const groupRow = await searchRows(page, activeFellow.fellowName);
  await expect(groupRow).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: droppedFellow.fellowName })).toHaveCount(0);
  await chooseRowAction(page, groupRow, "Archive group");
  await page
    .getByRole("dialog", { name: "Confirm group archive" })
    .getByRole("button", { name: "Confirm" })
    .click();
  await expect(page.getByText("Successfully archived group").first()).toBeVisible();

  await page.reload();
  await expect(
    await cellUnder(page, await searchRows(page, activeFellow.fellowName), "Active Status"),
  ).toHaveText("Inactive");
});

test("a fellow who drops out while chosen as a group's new leader is refused", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const leader = await supervised.addFellow();
  const replacement = await addFellowWithoutGroup(supervised, undo);
  await signInWithEmail(context, supervised.coordinatorEmail);

  await page.goto(getUrl(`/hc/schools/${supervised.schoolVisibleId}/groups`));
  await chooseRowAction(page, await searchRows(page, leader.fellowName), "Replace fellow");
  const replace = page.getByRole("dialog").filter({ hasText: "Select replacement fellow" });
  await replace.getByRole("combobox", { name: "Select supervisor" }).click();
  await page.getByRole("option", { name: supervised.supervisorName, exact: true }).click();
  await replace.getByRole("combobox", { name: "Select replacement fellow" }).click();
  await page.getByRole("option", { name: replacement.fellowName, exact: true }).click();
  await db
    .update(fellow)
    .set({ droppedOut: true, dropOutReason: "Left the programme", droppedOutAt: new Date() })
    .where(eq(fellow.id, replacement.fellowId));
  await replace.getByRole("button", { name: "Replace", exact: true }).click();
  await expect(
    page.getByText("has dropped out, so they cannot lead a group").first(),
  ).toBeVisible();

  await page.reload();
  await expect(await searchRows(page, leader.fellowName)).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: replacement.fellowName })).toHaveCount(0);
});
