import { expect, type Page, test } from "@playwright/test";
import { ilike, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { careAdminEmail, plainAdminEmail, superAdminEmail } from "#/db/seed/fixtures";
import {
  fellowAttendance,
  hub,
  interventionGroup,
  interventionSession,
  school,
  sessionName,
  student,
} from "#/db/schema";
import { hubSessionTypes } from "#/lib/app-constants/hub-session-types";
import { objectId } from "#/lib/crypto";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { dataRows, getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * Super admins create and edit the hubs of their implementer, in the active project: the name and
 * the label and amount of each session type. Other admins, with or without a team, see the hubs
 * and open each hub's page, but get no way to add or edit one.
 */
// Each worker loads this file, and its afterAll deletes every hub with its prefix, so two
// workers that start in the same millisecond must still get different prefixes.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const HUB_PREFIX = `E2E Hub ${RUN_ID}`;
const HUB_NAME = `${HUB_PREFIX} Nairobi`;
const RENAMED_HUB_NAME = `${HUB_PREFIX} Mombasa`;

test.afterAll(async () => {
  const createdHubs = await db.query.hub.findMany({
    where: (h, { ilike }) => ilike(h.hubName, `${HUB_PREFIX}%`),
    columns: { id: true },
  });
  const hubIds = createdHubs.map((h) => h.id);
  if (hubIds.length > 0) {
    const hubSessionIds = db
      .select({ id: interventionSession.id })
      .from(interventionSession)
      .where(inArray(interventionSession.hubId, hubIds));
    const hubSchoolIds = db
      .select({ id: school.id })
      .from(school)
      .where(inArray(school.hubId, hubIds));
    await db.delete(fellowAttendance).where(inArray(fellowAttendance.sessionId, hubSessionIds));
    await db.delete(interventionGroup).where(inArray(interventionGroup.schoolId, hubSchoolIds));
    await db.delete(interventionSession).where(inArray(interventionSession.hubId, hubIds));
    await db.delete(school).where(inArray(school.hubId, hubIds));
    await db.delete(sessionName).where(inArray(sessionName.hubId, hubIds));
    await db
      .delete(student)
      .where(
        inArray(
          student.schoolId,
          db.select({ id: school.id }).from(school).where(inArray(school.hubId, hubIds)),
        ),
      );
    await db.delete(school).where(inArray(school.hubId, hubIds));
  }
  await db.delete(hub).where(ilike(hub.hubName, `${HUB_PREFIX}%`));
});

test("a super admin adds a hub, cannot add a duplicate, and edits its name and session types", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl("/admin/hubs"));

  await page.getByRole("button", { name: "Add hub" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("Hub name").fill(HUB_NAME);

  await addDialog.getByRole("button", { name: "Intervention sessions" }).click();
  await expect(addDialog.getByLabel("s1 label")).toHaveValue("Session 1");
  await expect(addDialog.getByLabel("s1 amount")).toHaveValue("1500");
  await addDialog.getByRole("button", { name: "Supervision sessions" }).click();
  await expect(addDialog.getByLabel("sv1 amount")).toHaveValue("500");
  await addDialog.getByLabel("s1 amount").fill("1750");
  await addDialog.getByRole("button", { name: "Save" }).click();
  const createConfirm = page.getByRole("dialog", { name: "Create hub?" });
  await expect(createConfirm).toContainText(HUB_NAME);
  await expect(createConfirm).toContainText("1 session type differs from the standard list");
  const changedRow = createConfirm.getByRole("row", { name: /Session 1/ });
  await expect(changedRow).toContainText("was 1,500");
  await expect(changedRow).toContainText("now 1,750");
  await expect(createConfirm).not.toContainText("attendance");
  await createConfirm.getByRole("button", { name: "Create hub", exact: true }).click();
  await expect(createConfirm).toBeHidden();
  await expect(addDialog).toBeHidden();

  // No page shows the project the new hub is stored in.
  const created = await db.query.hub.findFirst({
    where: (h, { eq }) => eq(h.hubName, HUB_NAME),
    columns: { id: true, projectId: true },
  });
  expect(created?.projectId).not.toBeNull();
  expect(await codesInHubSettings(page, HUB_NAME)).toEqual(
    hubSessionTypes.map((type) => type.name).toSorted(),
  );

  await page.goto(getUrl("/admin/hubs"));
  const row = (await searchRows(page, HUB_NAME)).first();
  await expect(row).toBeVisible();

  await page.getByRole("button", { name: "Add hub" }).click();
  const duplicateDialog = page.getByRole("dialog");
  await duplicateDialog.getByLabel("Hub name").fill(HUB_NAME.toUpperCase());
  await duplicateDialog.getByRole("button", { name: "Save" }).click();
  const duplicateConfirm = page.getByRole("dialog", { name: "Create hub?" });
  await expect(duplicateConfirm).toContainText(
    "Labels and fellow pay amounts will be saved as shown.",
  );
  await duplicateConfirm.getByRole("button", { name: "Create hub", exact: true }).click();
  await expect(duplicateConfirm).toBeHidden();
  await expect(page.getByText("A hub with this name already exists").first()).toBeVisible();
  await duplicateDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(duplicateDialog).toBeHidden();
  // A write that must not happen; `ilike`, as the duplicate differs only in case.
  expect(await db.$count(hub, ilike(hub.hubName, `${HUB_PREFIX}%`))).toBe(1);

  await row.getByRole("link", { name: HUB_NAME, exact: true }).click();
  await expect(page.getByRole("heading", { name: HUB_NAME })).toBeVisible();
  await expect(page.getByRole("link", { name: /Schools\s*0/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("No schools found for this hub")).toBeVisible();
  await page.getByRole("link", { name: "Hub settings" }).click();
  await expect(page.getByLabel("Hub name")).toHaveValue(HUB_NAME);
  await expect(page.getByText("Payouts already recorded keep their amount")).toBeVisible();
  await expect(page.getByLabel("s0 label")).toHaveValue("Pre-session");
  await expect(page.getByLabel("s0 amount")).toHaveValue("1000");
  await expect(page.getByLabel("s1 label")).toHaveValue("Session 1");
  await expect(page.getByLabel("s1 amount")).toHaveValue("1750");
  await expect(page.getByRole("button", { name: "Review and save" })).toHaveCount(0);
  await page.getByLabel("Hub name").fill(RENAMED_HUB_NAME);
  await page.getByLabel("s1 label").fill("Lesson 1");
  await page.getByLabel("s1 amount").fill("1800");
  await expect(page.getByText(`was ${HUB_NAME}`)).toBeVisible();
  await expect(page.getByText("was Session 1")).toBeVisible();
  await expect(page.getByText("was 1,750")).toBeVisible();
  await expect(page.getByText("2 unsaved changes")).toBeVisible();

  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.getByRole("link", { name: /^Schools/ }).click();
  await expect(page.getByLabel("Hub name")).toHaveValue(RENAMED_HUB_NAME);

  await page.getByRole("button", { name: "Review and save" }).click();

  const saveConfirm = page.getByRole("dialog", { name: "Save changes to hub?" });
  await expect(saveConfirm).toContainText(`${HUB_NAME} will be renamed to ${RENAMED_HUB_NAME}`);
  await expect(saveConfirm).toContainText("1 session type will change");
  const editedRow = saveConfirm.getByRole("row", { name: /Lesson 1/ });
  await expect(editedRow).toContainText("was Session 1");
  await expect(editedRow).toContainText("was 1,750");
  await expect(editedRow).toContainText("now 1,800");
  await saveConfirm.getByRole("button", { name: "Save changes" }).click();
  await expect(saveConfirm).toBeHidden();
  await expect(page.getByText(/unsaved change/)).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: RENAMED_HUB_NAME })).toBeVisible();
  await page.goto(getUrl("/admin/hubs"));
  await expect((await searchRows(page, RENAMED_HUB_NAME)).first()).toBeVisible();
  await expect(await searchRows(page, HUB_NAME)).toHaveCount(0);

  expect(await codesInHubSettings(page, RENAMED_HUB_NAME)).toEqual(
    hubSessionTypes.map((type) => type.name).toSorted(),
  );
  await expect(page.getByLabel("s1 label")).toHaveValue("Lesson 1");
  await expect(page.getByLabel("s1 amount")).toHaveValue("1800");
  await expect(page.getByLabel("s0 label")).toHaveValue("Pre-session");
  await expect(page.getByLabel("s0 amount")).toHaveValue("1000");
});

test("a super admin picks a hub's session types, and cannot remove one that sessions use", async ({
  page,
  context,
}) => {
  const hubName = `${HUB_PREFIX} Custom types`;
  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl("/admin/hubs"));
  await page.getByRole("button", { name: "Add hub" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("Hub name").fill(hubName);

  await addDialog.getByRole("button", { name: /Clinical sessions/ }).click();
  await expect(addDialog.getByText("This hub has no clinical sessions.")).toBeVisible();
  await addDialog.getByRole("button", { name: "Add clinical session" }).click();
  await addDialog.getByRole("button", { name: "Add clinical session" }).click();
  await expect(addDialog.getByLabel("cl2 label")).toHaveValue("Clinical 2");
  await addDialog.getByRole("button", { name: "Remove all clinical sessions" }).click();
  await expect(addDialog.getByText("This hub has no clinical sessions.")).toBeVisible();

  await addDialog.getByRole("button", { name: /Data follow-up sessions/ }).click();
  await addDialog.getByRole("button", { name: "Add data follow-up session" }).click();
  await expect(addDialog.getByLabel("dfu1 label")).toHaveValue("Data Follow Up 1");
  await expect(addDialog.getByLabel("dfu1 amount")).toHaveValue("500");

  await addDialog.getByRole("button", { name: /Intervention sessions/ }).click();
  await expect(addDialog.getByRole("button", { name: "Remove s3" })).toBeDisabled();
  await addDialog.getByRole("button", { name: "Remove s4" }).click();
  await expect(addDialog.getByLabel("s4 label")).toHaveCount(0);

  await addDialog.getByRole("button", { name: /Supervision sessions/ }).click();
  await addDialog.getByRole("button", { name: "Add supervision session" }).click();
  await expect(addDialog.getByLabel("sv6 label")).toHaveValue("Supervision 6");
  await expect(addDialog.getByLabel("sv6 amount")).toHaveValue("500");
  await addDialog.getByLabel("sv6 amount").fill("0");
  await addDialog.getByRole("button", { name: "Save" }).click();

  const createConfirm = page.getByRole("dialog", { name: "Create hub?" });
  await expect(createConfirm.getByRole("row", { name: /sv6/ })).toContainText("Added");
  await expect(createConfirm.getByRole("row", { name: /dfu1/ })).toContainText("Added");
  await expect(createConfirm.getByRole("row", { name: /s4/ })).toContainText("Removed");
  await createConfirm.getByRole("button", { name: "Create hub", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  expect(await codesInHubSettings(page, hubName)).toEqual(
    [
      "s0",
      "s1",
      "s2",
      "s3",
      "sv1",
      "sv2",
      "sv3",
      "sv4",
      "sv5",
      "sv6",
      "t1",
      "t2",
      "t3",
      "t4",
      "t5",
      "dfu1",
    ].toSorted(),
  );

  // The spec needs the hub's id and project to insert a session; the page shows neither.
  const created = await db.query.hub.findFirst({
    where: (h, { eq }) => eq(h.hubName, hubName),
    columns: { id: true, projectId: true },
  });
  if (!created) throw new Error("the hub was not created");

  await test.step("a type that a session uses stays while others are added and removed", async () => {
    // Sessions are not scheduled from this page, so the spec inserts one.
    const sv6 = await db.query.sessionName.findFirst({
      where: (n, { and, eq }) => and(eq(n.hubId, created.id), eq(n.sessionName, "sv6")),
      columns: { id: true },
    });
    await db.insert(interventionSession).values({
      id: objectId("session"),
      hubId: created.id,
      sessionId: sv6?.id,
      projectId: created.projectId,
      occurred: false,
      yearOfImplementation: new Date().getFullYear(),
      sessionDate: new Date(),
    });

    await openHubSettings(page, hubName);
    const removeSv6 = page.getByRole("button", { name: "Remove sv6" });
    await expect(removeSv6).toBeDisabled();
    await expect(removeSv6).toHaveAccessibleDescription(
      "sv6 is used by 1 session, so it cannot be removed.",
    );
    await expect(page.getByRole("button", { name: "Remove s2" })).toHaveAccessibleDescription(
      "Only the last intervention session can be removed.",
    );
    await expect(page.getByText("No clinical sessions at this hub.")).toBeVisible();

    await page.getByRole("button", { name: "Add clinical session" }).click();
    await expect(page.getByLabel("cl1 label")).toHaveValue("Clinical 1");
    await page.getByRole("button", { name: "Remove s3" }).click();
    await page.getByRole("button", { name: "Review and save" }).click();
    const saveConfirm = page.getByRole("dialog", { name: "Save changes to hub?" });
    await expect(saveConfirm).toContainText("2 session types will change");
    await saveConfirm.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(/unsaved change/)).toHaveCount(0);

    const editedCodes = await codesInHubSettings(page, hubName);
    expect(editedCodes).toContain("cl1");
    expect(editedCodes).toContain("sv6");
    expect(editedCodes).not.toContain("s3");
    expect(editedCodes).toContain("s2");
  });

  await test.step("a form opened before another admin saved cannot save", async () => {
    await openHubSettings(page, hubName);
    const other = await context.newPage();
    await openHubSettings(other, hubName);
    await other.getByRole("button", { name: "Add training session" }).click();
    await other.getByRole("button", { name: "Review and save" }).click();
    await other
      .getByRole("dialog", { name: "Save changes to hub?" })
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(other.getByRole("dialog")).toHaveCount(0);
    await expect(other.getByText(/unsaved change/)).toHaveCount(0);
    await other.close();
    await page.getByLabel("Hub name").fill(`${hubName} renamed`);
    await page.getByRole("button", { name: "Review and save" }).click();
    await page
      .getByRole("dialog", { name: "Save changes to hub?" })
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(
      page.getByText("This hub's session types changed since you opened it").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Discard" }).click();
    expect(await codesInHubSettings(page, hubName)).toContain("t6");
  });

  await test.step("the server refuses to remove a type that a session starts using after the form opened", async () => {
    await openHubSettings(page, hubName);
    const s2 = await db.query.sessionName.findFirst({
      where: (n, { and, eq }) => and(eq(n.hubId, created.id), eq(n.sessionName, "s2")),
      columns: { id: true },
    });
    await db.insert(interventionSession).values({
      id: objectId("session"),
      hubId: created.id,
      sessionId: s2?.id,
      projectId: created.projectId,
      occurred: false,
      yearOfImplementation: new Date().getFullYear(),
      sessionDate: new Date(),
    });
    await page.getByRole("button", { name: "Remove s2" }).click();
    await page.getByRole("button", { name: "Review and save" }).click();
    await page
      .getByRole("dialog", { name: "Save changes to hub?" })
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(
      page.getByText("A session type you removed already has intervention sessions").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Discard" }).click();
    expect(await codesInHubSettings(page, hubName)).toContain("s2");
  });
});

async function openHubPage(page: Page, hubName: string) {
  await page.goto(getUrl("/admin/hubs"));
  const row = (await searchRows(page, hubName)).first();
  await row.getByRole("link", { name: `Open ${hubName}` }).click();
  await expect(page.getByRole("heading", { name: hubName })).toBeVisible();
}

async function openHubSettings(page: Page, hubName: string) {
  await openHubPage(page, hubName);
  await page.getByRole("link", { name: "Hub settings" }).click();
  await expect(page.getByLabel("Hub name")).toHaveValue(hubName);
}

async function codesInHubSettings(page: Page, hubName: string) {
  await openHubSettings(page, hubName);
  const names = await page
    .getByRole("textbox", { name: / label$/ })
    .evaluateAll((inputs) => inputs.map((input) => input.getAttribute("aria-label") ?? ""));
  return names.map((name) => name.replace(/ label$/, "")).toSorted();
}

test("clearing an amount leaves it empty, and typing a value clears the error", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl("/admin/hubs"));
  await page.getByRole("button", { name: "Add hub" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a new hub" });
  await dialog.getByLabel("Hub name").fill(`${HUB_PREFIX} Empty amount`);
  await dialog.getByRole("button", { name: "Intervention sessions" }).click();

  await dialog.getByLabel("s1 amount").fill("");
  await expect(dialog.getByLabel("s1 amount")).toHaveValue("");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Please enter an amount")).toBeVisible();

  await dialog.getByLabel("s1 amount").fill("1500");
  await expect(dialog.getByText("Please enter an amount")).toBeHidden();
  await dialog.getByRole("button", { name: "Save" }).click();
  const confirm = page.getByRole("dialog", { name: "Create hub?" });
  await expect(confirm).toContainText("Labels and fellow pay amounts will be saved as shown.");
  await confirm.getByRole("button", { name: "Go back" }).click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect(await db.$count(hub, ilike(hub.hubName, `${HUB_PREFIX} Empty amount`))).toBe(0);
});

test("an error inside a collapsed group opens the group and shows the error", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, superAdminEmail);
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

for (const email of [careAdminEmail, plainAdminEmail]) {
  test(`${email} sees the hubs and their settings but cannot add or edit one`, async ({
    page,
    context,
  }) => {
    await signInWithEmail(context, email);
    await page.goto(getUrl("/admin/hubs"));

    await expect(page.getByRole("heading", { name: "Hubs" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add hub" })).toHaveCount(0);

    await page
      .getByRole("link", { name: /^Open / })
      .first()
      .click();
    await expect(page.getByRole("link", { name: /^Schools/ })).toBeVisible();

    await page.getByRole("link", { name: "Hub settings" }).click();
    const hubDetails = page.getByRole("region", { name: "Hub details" });
    const sessionTypes = page.getByRole("region", { name: "Session types" });
    await expect(hubDetails).toContainText("Hub name");
    await expect(sessionTypes).toContainText("Intervention sessions");
    await expect(hubDetails.getByRole("textbox")).toHaveCount(0);
    await expect(sessionTypes.getByRole("textbox")).toHaveCount(0);
    await expect(sessionTypes.getByRole("spinbutton")).toHaveCount(0);
    await expect(sessionTypes.getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Review and save" })).toHaveCount(0);
  });
}

test("a hub page lists its schools and steps to the hubs beside it by name", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, plainAdminEmail);
  await page.goto(getUrl("/admin/hubs"));
  const hubLinks = page.getByRole("link", { name: /^Open / });
  await expect(hubLinks.first()).toBeVisible();
  const hubNames = (
    await hubLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("aria-label") ?? ""),
    )
  ).map((label) => label.replace(/^Open /, ""));
  test.skip(hubNames.length < 2, "the admin sees a single hub");
  const [firstHub = "", secondHub = ""] = hubNames;

  await page.getByRole("link", { name: firstHub, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/hubs\/[^/]+\/schools$/);
  await expect(page.getByRole("heading", { name: firstHub })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Hubs");
  await expect(page.getByRole("button", { name: "Previous hub", exact: true })).toBeDisabled();

  await expect(dataRows(page).first()).toBeVisible();

  await page.getByRole("link", { name: `Next hub: ${secondHub}` }).click();
  await expect(page.getByRole("heading", { name: secondHub })).toBeVisible();
  await page.getByRole("link", { name: `Previous hub: ${firstHub}` }).click();
  await expect(page.getByRole("heading", { name: firstHub })).toBeVisible();
});

test("a hub page counts its sessions as marked attended, unmarked, upcoming and cancelled, its tabs count active rows, and the hubs list counts the same", async ({
  page,
  context,
}) => {
  const {
    rows: [seededHub],
  } = await db.execute<{ implementerId: string; projectId: string }>(sql`
    select h.implementer_id as "implementerId", h.project_id as "projectId"
    from hubs h
    join projects p on p.id = h.project_id and p.is_default
    join implementer_members m on m.implementer_id = h.implementer_id
    join users u on u.id = m.user_id and u.email = ${superAdminEmail}
    order by h.id
    limit 1`);
  required(seededHub, "a hub of the super admin's implementer in the default project");
  const [leader, previousLeader] = await db.query.fellow.findMany({
    columns: { id: true },
    orderBy: (f, { asc }) => asc(f.id),
    limit: 2,
  });
  required(leader, "a seeded fellow to lead the group");
  required(previousLeader, "a seeded fellow who led the group before");
  // Sessions, groups and attendance are not made from the admin pages, so the spec inserts them.
  const [statsHub] = await db
    .insert(hub)
    .values({ id: objectId("hub"), hubName: `${HUB_PREFIX} Stats`, ...seededHub })
    .returning({ id: hub.id });
  required(statsHub, "the inserted hub");
  const schoolId = objectId("school");
  await db.insert(school).values({
    id: schoolId,
    schoolName: `${HUB_PREFIX} School`,
    visibleId: schoolId,
    hubId: statsHub.id,
  });
  const groupId = objectId("group");
  await db.insert(interventionGroup).values({
    id: groupId,
    groupName: "Stats group",
    leaderId: leader.id,
    schoolId,
    projectId: seededHub.projectId,
  });
  const [s0, s1] = await db
    .insert(sessionName)
    .values([
      {
        hubId: statsHub.id,
        sessionName: "s0",
        sessionLabel: "Pre-session",
        sessionType: "INTERVENTION",
        amount: 0,
      },
      {
        hubId: statsHub.id,
        sessionName: "s1",
        sessionLabel: "Session 1",
        sessionType: "INTERVENTION",
        amount: 0,
      },
    ])
    .returning({ id: sessionName.id });
  required(s0, "the inserted pre-session type");
  required(s1, "the inserted session type");
  const day = 24 * 60 * 60 * 1000;
  const session = (occurred: boolean, daysFromNow: number, status?: "Cancelled" | null) => ({
    id: objectId("session"),
    sessionId: s1.id,
    hubId: statsHub.id,
    schoolId,
    projectId: seededHub.projectId,
    occurred,
    status,
    yearOfImplementation: new Date().getFullYear(),
    sessionDate: new Date(Date.now() + daysFromNow * day),
  });
  await db.insert(interventionSession).values({ ...session(true, -8), sessionId: s0.id });

  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl(`/admin/hubs/${statsHub.id}/schools`));
  const stats = page.getByRole("region", { name: "Hub stats" });
  await expect(stats).toContainText("Pre-sessions are not counted");

  const [markedForGroup, alsoMarkedForGroup, markedWithoutGroup] = [-7, -6, -3].map((daysAgo) =>
    session(true, daysAgo),
  );
  required(markedForGroup, "a held session");
  required(alsoMarkedForGroup, "a held session");
  required(markedWithoutGroup, "a held session");
  await db
    .insert(interventionSession)
    .values([
      markedForGroup,
      alsoMarkedForGroup,
      markedWithoutGroup,
      session(false, -5),
      session(false, 5),
      session(false, 6, null),
      session(false, -4, "Cancelled"),
    ]);
  // Only rows carrying the group's id count, whoever marked them.
  await db.insert(fellowAttendance).values([
    { fellowId: previousLeader.id, groupId, sessionId: markedForGroup.id, attended: true },
    { fellowId: previousLeader.id, groupId, sessionId: alsoMarkedForGroup.id, attended: false },
    { fellowId: leader.id, sessionId: markedWithoutGroup.id, attended: true },
  ]);
  const droppedOutSchoolId = objectId("school");
  await db.insert(school).values({
    id: droppedOutSchoolId,
    schoolName: `${HUB_PREFIX} Dropped out school`,
    visibleId: droppedOutSchoolId,
    hubId: statsHub.id,
    droppedOut: true,
  });
  const statsStudent = (droppedOut: boolean) => {
    const id = objectId("student");
    return { id, visibleId: id, schoolId, droppedOut };
  };
  await db.insert(student).values([statsStudent(false), statsStudent(true)]);

  await page.reload();
  await expect(stats).toContainText("marked attended of 7 scheduled");
  for (const segment of ["4 attended", "1 unmarked", "2 upcoming", "1 cancelled"]) {
    await expect(stats).toContainText(segment);
  }
  await expect(stats).toContainText("1 past session needs marking");
  await expect(stats).toContainText("67%");
  await expect(stats).toContainText("2 of 3 attendances");
  await expect(stats).toContainText("1 fellow attendance not marked");

  // The tables list every row; the badges leave out the cancelled session and dropped-out rows.
  await expect(dataRows(page)).toHaveCount(2);
  const tabs = page.getByRole("navigation", { name: "Hub sections" });
  await expect(tabs.getByRole("link", { name: /^Schools/ })).toHaveText(/^Schools\s*1$/);
  await expect(tabs.getByRole("link", { name: /^Sessions/ })).toHaveText(/^Sessions\s*7$/);
  await expect(tabs.getByRole("link", { name: /^Students/ })).toHaveText(/^Students\s*1$/);

  await page.goto(getUrl("/admin/hubs"));
  const listRow = (await searchRows(page, `${HUB_PREFIX} Stats`)).first();
  await expect(listRow.getByRole("cell")).toHaveText([
    `${HUB_PREFIX} Stats`,
    "",
    "1",
    "0",
    "0",
    "1",
    "4 of 7",
    "",
  ]);
});

test("a hub of another implementer is not found", async ({ page, context }) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; ownHub: string; foreignHub: string | null }>(sql`
    select u.email,
      (select h.id from hubs h join projects p on p.id = h.project_id and p.is_default
        where h.implementer_id = m.implementer_id order by h.id limit 1) as "ownHub",
      (select h.id from hubs h where h.implementer_id <> m.implementer_id
        order by h.id limit 1) as "foreignHub"
    from implementer_members m
    join users u on u.id = m.user_id
    where m.role = 'ADMIN' and ${signableMember()}
    order by u.email
    limit 1`);
  required(fixture?.foreignHub, "a hub of an implementer the admin is not a member of");
  await signInWithEmail(context, fixture.email);

  const own = await page.goto(getUrl(`/admin/hubs/${fixture.ownHub}/schools`));
  expect(own?.status()).toBe(200);
  const foreign = await page.goto(getUrl(`/admin/hubs/${fixture.foreignHub}/schools`));
  expect(foreign?.status()).toBe(404);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
