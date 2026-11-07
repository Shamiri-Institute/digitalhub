import { expect, test } from "@playwright/test";
import { and, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { school } from "#/db/schema";
import { required, signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

test("an empty Add school submit flags every required field at once and writes nothing", async ({
  page,
  context,
}) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const coordinatorProfile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    columns: { assignedHubId: true },
  });
  const coordinatorHubId = coordinatorProfile?.assignedHubId;
  required(coordinatorHubId, "the hub coordinator has no hub");
  const unnamedSchoolsInHub = () =>
    db.$count(school, and(eq(school.hubId, coordinatorHubId), eq(school.schoolName, "")));
  const unnamedSchoolsBefore = await unnamedSchoolsInHub();

  await page.goto(getUrl("/hc/schools"));
  await page.getByRole("button", { name: "Add school" }).click();
  const dialog = page.getByRole("dialog", { name: "Add new school" });
  await dialog.getByRole("button", { name: "Add School" }).click();

  const requiredFields = [
    {
      control: dialog.getByRole("textbox", { name: "School name", exact: true }),
      message: "School name is required",
    },
    {
      control: dialog.getByRole("spinbutton", { name: "Expected no. of students", exact: true }),
      message: "Number of students is required",
    },
    {
      control: dialog.getByRole("button", { name: "Pre-session date", exact: true }),
      message: "Please select a date",
    },
  ];
  for (const { control, message } of requiredFields) {
    await expect(control).toHaveAttribute("aria-invalid", "true");
    await expect(control).toHaveAccessibleDescription(message);
  }
  await expect(dialog).toBeVisible();

  // A rejected submit shows nothing to reload, so the database proves no school was written.
  expect(await unnamedSchoolsInHub()).toBe(unnamedSchoolsBefore);
});
