import { expect, test } from "@playwright/test";

import { roleHome } from "#/lib/auth/role-home";
import { signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import type { Role } from "#/tests/platform-routes";

const otherRolesPages: Array<{ role: Role & keyof typeof roleHome; forbidden: string[] }> = [
  {
    role: "SUPERVISOR",
    forbidden: ["/hc/schedule", "/cl/clinical", "/ops/reporting/expenses/fellows"],
  },
  { role: "HUB_COORDINATOR", forbidden: ["/sc/schedule"] },
  { role: "CLINICAL_LEAD", forbidden: ["/sc/schedule", "/hc/schedule"] },
  { role: "OPERATIONS", forbidden: ["/sc/schedule", "/hc/schedule", "/cl/clinical"] },
];

for (const { role, forbidden } of otherRolesPages) {
  for (const path of forbidden) {
    test(`${role} opening ${path} is sent to their own home`, async ({ page, context }) => {
      await signInAs(context, role);
      await page.goto(getUrl(path));
      await expect(page).toHaveURL(new RegExp(`^${getUrl(roleHome[role])}(/|\\?|$)`));
    });
  }
}
