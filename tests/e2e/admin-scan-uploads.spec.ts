import { researchAdminEmail } from "#/db/seed/fixtures";
import { expect, test } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { removeScanUploads, uniqueScanPdf } from "#/tests/survey-fixtures";

test("a Research admin uploads a scan for a hub they choose, and sees it under that hub", async ({
  page,
  context,
  undo,
}) => {
  await signInWithEmail(context, researchAdminEmail);
  const scan = await uniqueScanPdf("Admin scan upload spec");
  const fileName = `admin-scan-${scan.sha256.slice(0, 8)}.pdf`;
  undo(() => removeScanUploads([scan.sha256]));

  await page.goto(getUrl("/admin/surveys"));
  await page.getByRole("radio", { name: "Select Scans" }).click();
  await expect(page.getByText("Choose a hub to upload its scans")).toBeVisible();
  await expect(page.getByLabel("Scanned files")).toBeDisabled();

  await page.getByLabel("Hub").click();
  const firstHub = page.getByRole("option").first();
  const hubName = (await firstHub.textContent()) ?? "";
  await firstHub.click();
  await page.getByLabel("Scanned files").setInputFiles({
    name: fileName,
    mimeType: "application/pdf",
    buffer: Buffer.from(scan.bytes),
  });
  const addedFiles = page.getByRole("list", { name: "Files added" });
  await expect(addedFiles.getByText("Uploaded", { exact: true })).toBeVisible();

  await page.reload();
  const row = page.getByRole("row", { name: new RegExp(fileName) });
  await expect(row).toContainText(hubName);
  await expect(row).toContainText("Uploaded");
});
