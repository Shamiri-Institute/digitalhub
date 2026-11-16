import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionGroup, student } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { addFellowWithLogin, createSupervisedSession } from "#/tests/delivery-helpers";
import { expect, test } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

test("a fellow sees their own groups and students at a school, not another fellow's", async ({
  page,
  context,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const otherFellow = await supervised.addFellow();
  const signedInFellow = await addFellowWithLogin(supervised, undo);
  const ownGroupId = objectId("group");
  const ownGroupName = `${signedInFellow.fellowName} group`;
  await db.insert(interventionGroup).values({
    id: ownGroupId,
    groupName: ownGroupName,
    schoolId: supervised.schoolId,
    leaderId: signedInFellow.fellowId,
    projectId: supervised.projectId,
  });
  const ownStudentName = `${signedInFellow.fellowName} student`;
  const ownStudentId = objectId("stu");
  await db.insert(student).values({
    id: ownStudentId,
    visibleId: ownStudentId,
    studentName: ownStudentName,
    schoolId: supervised.schoolId,
    assignedGroupId: ownGroupId,
    admissionNumber: "9500",
    gender: "Female",
    form: 2,
    stream: "B",
  });
  undo(() => db.delete(student).where(eq(student.id, ownStudentId)));
  const otherGroup = await db.query.interventionGroup.findFirst({
    where: (g, { eq }) => eq(g.id, otherFellow.groupId),
    columns: { groupName: true },
  });
  await signInWithEmail(context, signedInFellow.fellowEmail);

  await page.goto(getUrl(`/fel/schools/${supervised.schoolVisibleId}/group`), {
    waitUntil: "networkidle",
  });
  await expect(page.getByRole("main")).toContainText(ownGroupName);
  await expect(page.getByRole("main")).not.toContainText(otherGroup?.groupName ?? "");

  await page.goto(getUrl(`/fel/schools/${supervised.schoolVisibleId}/students`), {
    waitUntil: "networkidle",
  });
  await expect(page.getByRole("main")).toContainText(ownStudentName);
  await expect(page.getByRole("main")).not.toContainText(`${otherFellow.fellowName} student`);
});

test("a fellow views their own details but cannot edit them", async ({ page, context, undo }) => {
  const supervised = await createSupervisedSession(undo);
  const signedInFellow = await addFellowWithLogin(supervised, undo);
  await signInWithEmail(context, signedInFellow.fellowEmail);

  await page.goto(getUrl("/fel/schedule"), { waitUntil: "networkidle" });
  await page.getByRole("button", { name: signedInFellow.fellowName, exact: true }).click();
  await page.getByRole("menuitem", { name: "My Profile" }).click();
  const profile = page.getByRole("dialog", { name: "View profile" });
  await expect(profile.getByRole("textbox").first()).toHaveValue(signedInFellow.fellowName);
  for (const field of await profile.getByRole("textbox").all()) {
    await expect(field).toBeDisabled();
  }
  await expect(profile.getByRole("button", { name: "Update & Save" })).toHaveCount(0);
});
