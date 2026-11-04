import { createHash, randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { surveyUpload } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { removeScanUploads, uniqueScanPdf } from "#/tests/survey-fixtures";

// Slow enough that a 3 MB file is still sending when the test acts on it.
const SLOW_UPLOAD = {
  offline: false,
  latency: 0,
  downloadThroughput: -1,
  uploadThroughput: 100 * 1024,
};

function sha256Of(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("a coordinator cancels one scan, and leaving the page asks first and gives up the rest", async ({
  page,
  context,
  undo,
}) => {
  await signInAs(context, "HUB_COORDINATOR");
  const cancelled = randomBytes(3 * 1024 * 1024);
  const following = await uniqueScanPdf("Scan cancel spec");
  const leftBehind = randomBytes(3 * 1024 * 1024);
  undo(() => removeScanUploads([sha256Of(cancelled), following.sha256, sha256Of(leftBehind)]));
  // Read from the DB: no page shows an unfinished upload.
  const unfinishedUploadOf = async (bytes: Uint8Array) =>
    (
      await db
        .select()
        .from(surveyUpload)
        .where(eq(surveyUpload.sha256, sha256Of(bytes)))
    ).length;

  await page.goto(getUrl("/hc/surveys/scans"));
  const network = await context.newCDPSession(page);
  await network.send("Network.emulateNetworkConditions", SLOW_UPLOAD);
  const addedFiles = page.getByRole("list", { name: "Files added" });

  await page.getByLabel("Scanned files").setInputFiles([
    { name: "cancelled.pdf", mimeType: "application/pdf", buffer: cancelled },
    { name: "following.pdf", mimeType: "application/pdf", buffer: Buffer.from(following.bytes) },
  ]);
  await expect(page.getByLabel("Uploading cancelled.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Cancel cancelled.pdf" }).click();
  await expect(addedFiles.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(addedFiles.getByText("Uploaded", { exact: true })).toBeVisible();
  await expect.poll(() => unfinishedUploadOf(cancelled)).toBe(0);

  await page
    .getByLabel("Scanned files")
    .setInputFiles([{ name: "left-behind.pdf", mimeType: "application/pdf", buffer: leftBehind }]);
  await expect(page.getByLabel("Uploading left-behind.pdf")).toBeVisible();
  const prompts: string[] = [];
  page.once("dialog", (dialog) => {
    prompts.push(dialog.message());
    void dialog.dismiss();
  });
  await page.getByRole("radio", { name: "Select Print" }).click();
  await expect.poll(() => prompts).toEqual(["Scans are still uploading. Leave and stop them?"]);
  await expect(page).toHaveURL(/\/hc\/surveys\/scans$/);

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("radio", { name: "Select Print" }).click();
  await expect(page).toHaveURL(/\/hc\/surveys$/);
  await expect.poll(() => unfinishedUploadOf(leftBehind)).toBe(0);
});
