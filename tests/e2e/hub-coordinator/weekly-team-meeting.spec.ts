import { expect, test } from "#/tests/fixtures";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { weeklyTeamMeetingReport } from "#/db/schema";
import { signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

test("Hub Coordinator submits a weekly team meeting report", async ({ page, context, undo }) => {
  const recommendations = `E2E weekly team meeting ${Date.now()}`;
  undo(() =>
    db
      .delete(weeklyTeamMeetingReport)
      .where(eq(weeklyTeamMeetingReport.recommendations, recommendations)),
  );
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  await page.goto(getUrl("/hc/supervisors"));
  const dialog = page.getByRole("dialog", { name: "Weekly team meeting" });
  const recommendationsBox = dialog.getByRole("textbox", { name: /^Recommendations/ });

  await page.getByRole("button", { name: "Weekly team meeting" }).click();
  await recommendationsBox.fill("unsaved draft");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Weekly team meeting" }).click();
  await expect(recommendationsBox).toHaveValue("");

  await dialog.getByRole("combobox", { name: "Select week" }).click();
  await page.getByRole("option", { name: /^Week 1/ }).click();
  const sections = [
    ["Logistics related issues", 4],
    ["Relationship management", 2],
    ["Digital hub issues", 3],
    ["Any other challenges", 1],
  ] as const;
  for (const [section, stars] of sections) {
    const label = dialog.locator("label").filter({ hasText: section });
    await label.getByRole("button", { name: `${stars} out of 5` }).click();
    await dialog.getByRole("textbox", { name: new RegExp(`^${section}`) }).fill(`${section} notes`);
  }
  await recommendationsBox.fill(recommendations);
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeHidden();

  // No page lists team meeting reports, and the hub and author come from the session.
  const coordinatorProfile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    columns: { assignedHubId: true },
  });
  const saved = await db.query.weeklyTeamMeetingReport.findFirst({
    where: (r, { eq }) => eq(r.recommendations, recommendations),
    columns: {
      hubId: true,
      submittedBy: true,
      logisticsRelatedIssuesRating: true,
      anyOtherChallengesRating: true,
    },
  });
  expect(saved).toEqual({
    hubId: coordinatorProfile?.assignedHubId,
    submittedBy: coordinator.identifier,
    logisticsRelatedIssuesRating: 4,
    anyOtherChallengesRating: 1,
  });
});
