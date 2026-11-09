import { expect, test } from "#/tests/fixtures";
import { signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

const removedPages = {
  SUPERVISOR: { reporting: "/sc/reporting/expenses/fellows", removed: "my-expenses" },
  HUB_COORDINATOR: { reporting: "/hc/reporting/expenses/fellows", removed: "supervisors" },
} as const;

for (const [role, { reporting, removed }] of Object.entries(removedPages)) {
  test(`R-exp-removed: a ${role} has no supervisor expense requests`, async ({ page, context }) => {
    await signInAs(context, role as keyof typeof removedPages);
    await page.goto(getUrl(reporting));
    // The expenses section offers fellows' payouts and nothing else.
    await expect(page.getByRole("main").getByRole("radio")).toHaveText([
      "Fellows",
      "Payout history",
    ]);

    const response = await page.goto(getUrl(reporting.replace("fellows", removed)));
    expect(response?.status()).toBe(404);
  });
}
