import { expect, test } from "#/tests/fixtures";
import { signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

test("an unknown address keeps the navigation and links back to the role's home", async ({
  page,
  context,
}) => {
  await signInAs(context, "HUB_COORDINATOR");

  const response = await page.goto(getUrl("/hc/no-such-page"));
  expect(response?.status()).toBe(404);
  const notFound = page.getByRole("main").getByRole("heading", { name: "Page not found" });
  await expect(notFound).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Schools" })).toBeVisible();

  await page.getByRole("main").getByRole("link", { name: "Go to home page" }).click();
  await expect(page).toHaveURL(getUrl("/hc/schedule"));
  await expect(notFound).toHaveCount(0);
});
