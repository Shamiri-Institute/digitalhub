import { db } from "#/db/client";
import { expect, test } from "#/tests/fixtures";
import { required, signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

test("the school picked on the schools page stays on the search button until Back", async ({
  page,
  context,
}) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const profile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    columns: { assignedHubId: true },
  });
  const coordinatorHubId = profile?.assignedHubId;
  required(coordinatorHubId, "the hub coordinator has no hub");
  const hubSchools = await db.query.school.findMany({
    where: (s, { eq }) => eq(s.hubId, coordinatorHubId),
    columns: { id: true, schoolName: true },
    orderBy: (s, { asc }) => [asc(s.schoolName), asc(s.id)],
  });
  const pickedSchool = hubSchools.find(
    ({ schoolName }) => hubSchools.filter((other) => other.schoolName === schoolName).length === 1,
  );
  required(pickedSchool, "no school with a unique name in the hub coordinator's hub");

  await page.goto(getUrl("/hc/schools"));
  const main = page.getByRole("main");
  const searchButton = main.getByRole("button", { name: "Search", exact: true });
  const pickedSchoolButton = main.getByRole("button", {
    name: pickedSchool.schoolName,
    exact: true,
  });
  await searchButton.click();
  await page.getByPlaceholder("Search", { exact: true }).fill(pickedSchool.schoolName);
  await page.getByRole("option", { name: pickedSchool.schoolName, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]query=${pickedSchool.id}(&|$)`));
  await expect(pickedSchoolButton).toBeVisible();

  await page.reload();
  await expect(pickedSchoolButton).toBeVisible();

  await page.goBack();
  await expect(page).not.toHaveURL(/[?&]query=/);
  await expect(searchButton).toBeVisible();
});
