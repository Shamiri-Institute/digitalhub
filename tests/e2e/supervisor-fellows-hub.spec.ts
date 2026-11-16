import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow } from "#/db/schema";
import { createSupervisedSession, otherHubOf } from "#/tests/delivery-helpers";
import { expect, test } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

for (const path of ["/sc/fellows", "/sc/reporting/expenses/fellows"]) {
  test(`${path} lists only the supervisor's fellows of their own hub`, async ({
    page,
    context,
    undo,
  }) => {
    const held = await createSupervisedSession(undo);
    const inHub = await held.addFellow();
    const elsewhere = await held.addFellow();
    await db
      .update(fellow)
      .set({ hubId: await otherHubOf(held.hubId) })
      .where(eq(fellow.id, elsewhere.fellowId));
    await signInWithEmail(context, held.supervisorEmail);

    await page.goto(getUrl(path));
    await expect(page.getByText(inHub.fellowName).first()).toBeVisible();
    await expect(page.getByText(elsewhere.fellowName)).toHaveCount(0);
  });
}
