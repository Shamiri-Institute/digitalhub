import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, supervisor, user } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import {
  addFellowWithLogin,
  createSupervisedSession,
  otherHubOf,
  validPersonDetails,
} from "#/tests/delivery-helpers";
import { expect, test } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell, searchRows } from "#/tests/pages/helpers";

/** The login email is not shown on any page, so it is read from the database. */
async function loginEmailOf(userId: string) {
  const row = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { email: true },
  });
  return row?.email;
}

async function openFellowEdit(page: Page, fellowName: string) {
  await page.goto(getUrl("/hc/fellows"));
  await chooseRowAction(page, await searchRows(page, fellowName), "Edit fellow information");
  return page.getByRole("dialog", { name: "Edit fellow information" });
}

async function openSupervisorEdit(page: Page, supervisorName: string) {
  await page.goto(getUrl("/hc/supervisors"));
  await chooseRowAction(
    page,
    await searchRows(page, supervisorName),
    "Edit supervisor information",
  );
  return page.getByRole("dialog", { name: "Edit supervisor information" });
}

test("a hub coordinator does not see another hub's fellows", async ({ page, context, undo }) => {
  const supervised = await createSupervisedSession(undo);
  const otherHubId = await otherHubOf(supervised.hubId);
  const otherHubFellow = await addFellowWithLogin(supervised, undo, otherHubId);
  const ownHubFellow = await addFellowWithLogin(supervised, undo);
  await signInWithEmail(context, supervised.coordinatorEmail);

  await page.goto(getUrl("/hc/fellows"));
  await expect(await searchRows(page, ownHubFellow.fellowName)).toHaveCount(1);
  await expect(await searchRows(page, otherHubFellow.fellowName)).toHaveCount(0);
});

test("a fellow's new email is their login email too", async ({ page, context, undo }) => {
  const supervised = await createSupervisedSession(undo);
  const editedFellow = await addFellowWithLogin(supervised, undo);
  const newEmail = `e2e-new-${editedFellow.fellowId.slice(-10).toLowerCase()}@example.com`;
  await signInWithEmail(context, supervised.coordinatorEmail);

  const edit = await openFellowEdit(page, editedFellow.fellowName);
  await edit.locator('input[name="fellowEmail"]').fill(newEmail);
  await edit.getByRole("button", { name: "Update & Save" }).click();
  await expect(edit).toBeHidden();

  await page.reload();
  const reopened = await openFellowEdit(page, editedFellow.fellowName);
  await expect(reopened.locator('input[name="fellowEmail"]')).toHaveValue(newEmail);
  expect(await loginEmailOf(editedFellow.userId)).toBe(newEmail);
});

test("a fellow moved to another hub while their details are open is not changed", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const movedFellow = await addFellowWithLogin(supervised, undo);
  const otherHubId = await otherHubOf(supervised.hubId);
  await signInWithEmail(context, supervised.coordinatorEmail);

  const edit = await openFellowEdit(page, movedFellow.fellowName);
  await edit.locator('input[name="fellowEmail"]').fill(`moved-${movedFellow.fellowEmail}`);
  await db.update(fellow).set({ hubId: otherHubId }).where(eq(fellow.id, movedFellow.fellowId));
  await edit.getByRole("button", { name: "Update & Save" }).click();
  await expect(page.getByText("Fellow not found").first()).toBeVisible();

  // The fellow now belongs to a hub whose pages the coordinator cannot open.
  const stored = await db.query.fellow.findFirst({
    where: (f, { eq }) => eq(f.id, movedFellow.fellowId),
    columns: { fellowEmail: true },
  });
  expect(stored?.fellowEmail).toBe(movedFellow.fellowEmail);
  expect(await loginEmailOf(movedFellow.userId)).toBe(movedFellow.fellowEmail);
});

test("a fellow moved to another hub is not given a supervisor", async ({ page, context, undo }) => {
  const supervised = await createSupervisedSession(undo);
  const movedFellow = await addFellowWithLogin(supervised, undo);
  const otherHubId = await otherHubOf(supervised.hubId);
  const newSupervisorId = objectId("sup");
  const newSupervisorName = `${supervised.supervisorName} new`;
  await db.insert(supervisor).values({
    id: newSupervisorId,
    supervisorName: newSupervisorName,
    hubId: supervised.hubId,
    implementerId: supervised.implementerId,
  });
  undo(() => db.delete(supervisor).where(eq(supervisor.id, newSupervisorId)));
  await signInWithEmail(context, supervised.coordinatorEmail);

  await page.goto(getUrl("/hc/fellows"));
  const fellowRow = await rowWithCell(page, page.getByRole("main"), movedFellow.fellowName);
  await db.update(fellow).set({ hubId: otherHubId }).where(eq(fellow.id, movedFellow.fellowId));
  await fellowRow.getByRole("combobox").click();
  await page.getByRole("option", { name: newSupervisorName, exact: true }).click();
  await expect(page.getByText(`Fellow ${movedFellow.fellowId} not found`).first()).toBeVisible();

  // The fellow is in a hub the coordinator's pages do not list.
  const stored = await db.query.fellow.findFirst({
    where: (f, { eq }) => eq(f.id, movedFellow.fellowId),
    columns: { supervisorId: true },
  });
  expect(stored?.supervisorId).toBe(supervised.supervisorId);
});

test("a supervisor who dropped out is not made a fellow's supervisor", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const supervisedFellow = await addFellowWithLogin(supervised, undo);
  const leavingSupervisorId = objectId("sup");
  const leavingSupervisorName = `${supervised.supervisorName} leaving`;
  await db.insert(supervisor).values({
    id: leavingSupervisorId,
    supervisorName: leavingSupervisorName,
    hubId: supervised.hubId,
    implementerId: supervised.implementerId,
  });
  undo(() => db.delete(supervisor).where(eq(supervisor.id, leavingSupervisorId)));
  await signInWithEmail(context, supervised.coordinatorEmail);

  await page.goto(getUrl("/hc/fellows"));
  const fellowRow = await rowWithCell(page, page.getByRole("main"), supervisedFellow.fellowName);
  // The supervisor drops out in another tab after this page listed them.
  await db
    .update(supervisor)
    .set({ droppedOut: true, dropOutReason: "Left the programme" })
    .where(eq(supervisor.id, leavingSupervisorId));
  await fellowRow.getByRole("combobox").click();
  await page.getByRole("option", { name: leavingSupervisorName, exact: true }).click();
  await expect(page.getByText(`${leavingSupervisorName} has dropped out`).first()).toBeVisible();

  await page.reload();
  await expect(
    (await rowWithCell(page, page.getByRole("main"), supervisedFellow.fellowName)).getByRole(
      "combobox",
    ),
  ).toHaveText(supervised.supervisorName);
});

test("a supervisor's new email is their login email too, and only in the coordinator's hub", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  await db
    .update(supervisor)
    .set({ ...validPersonDetails, personalEmail: supervised.supervisorEmail })
    .where(eq(supervisor.id, supervised.supervisorId));
  const supervisorUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, supervised.supervisorEmail),
    columns: { id: true },
  });
  if (!supervisorUser) throw new Error("the supervisor has no user");
  const newEmail = `e2e-new-${supervised.supervisorId.slice(-10).toLowerCase()}@example.com`;
  const otherHubId = await otherHubOf(supervised.hubId);
  // The helper removes the supervisor's user by the email it was created with.
  undo(() =>
    db
      .update(user)
      .set({ email: supervised.supervisorEmail })
      .where(eq(user.id, supervisorUser.id)),
  );
  await signInWithEmail(context, supervised.coordinatorEmail);

  const edit = await openSupervisorEdit(page, supervised.supervisorName);
  await edit.locator('input[name="personalEmail"]').fill(newEmail);
  await edit.getByRole("button", { name: "Update & Save" }).click();
  await expect(edit).toBeHidden();

  await page.reload();
  const reopened = await openSupervisorEdit(page, supervised.supervisorName);
  await expect(reopened.locator('input[name="personalEmail"]')).toHaveValue(newEmail);
  expect(await loginEmailOf(supervisorUser.id)).toBe(newEmail);

  await reopened.locator('input[name="personalEmail"]').fill(`moved-${newEmail}`);
  await db
    .update(supervisor)
    .set({ hubId: otherHubId })
    .where(eq(supervisor.id, supervised.supervisorId));
  await reopened.getByRole("button", { name: "Update & Save" }).click();
  await expect(page.getByText("Supervisor not found in your hub").first()).toBeVisible();
  expect(await loginEmailOf(supervisorUser.id)).toBe(newEmail);
});
