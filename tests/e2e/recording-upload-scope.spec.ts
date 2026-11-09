import { format } from "date-fns";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, sessionRecording } from "#/db/schema";
import { sessionDisplayName } from "#/lib/utils";
import { createSupervisedSession } from "#/tests/delivery-helpers";
import { expect, test } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

test.skip(!process.env.AWS_ENDPOINT_URL_S3, "needs the local S3 server (scripts/local-s3.sh)");

test("a supervisor cannot upload a recording for a fellow they no longer supervise", async ({
  context,
  page,
  undo,
}) => {
  const supervised = await createSupervisedSession(undo);
  const { fellowId, fellowName, groupId } = await supervised.addFellow();
  undo(() => db.delete(sessionRecording).where(eq(sessionRecording.groupId, groupId)));
  await signInWithEmail(context, supervised.supervisorEmail);

  await page.goto(getUrl("/sc/reporting/recordings"));
  await page.getByRole("button", { name: "Upload recording" }).click();
  const dialog = page.getByRole("dialog", { name: "Upload recording" });
  await dialog.getByRole("button", { name: "Select a fellow" }).click();
  await page.getByRole("option", { name: fellowName, exact: true }).click();
  await dialog
    .getByRole("combobox")
    .filter({ hasText: /^Select group$/ })
    .click();
  await page.getByRole("option").filter({ hasText: supervised.schoolName }).click();
  await dialog
    .getByRole("combobox")
    .filter({ hasText: /^Select a session$/ })
    .click();
  const sessionLabel = sessionDisplayName(supervised.sessionName) ?? supervised.sessionName;
  await page
    .getByRole("option", {
      name: `${sessionLabel} - ${format(supervised.sessionDate, "dd MMM yyyy")}`,
      exact: true,
    })
    .click();
  await dialog.getByLabel("Audio file").setInputFiles("tests/e2e/fixtures/session-recording.mp3");
  // The fellow passes to no supervisor behind the open dialog.
  await db.update(fellow).set({ supervisorId: null }).where(eq(fellow.id, fellowId));
  await dialog.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText(/Forbidden/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Upload recording" })).toBeVisible();
  await expect(page.getByRole("cell", { name: supervised.schoolName })).toHaveCount(0);
});
