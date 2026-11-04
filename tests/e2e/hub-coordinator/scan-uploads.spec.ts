import { ne } from "drizzle-orm";

import { db } from "#/db/client";
import { SurveyUploadStatus } from "#/db/enums";
import { hub, surveyUpload } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { removeScanUploads, uniqueScanPdf } from "#/tests/survey-fixtures";

test("a hub coordinator uploads a scan once, and sees only their hub's uploads", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const profile = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinator.identifier ?? ""),
    with: { assignedHub: { columns: { id: true } } },
  });
  required(profile?.assignedHub, "a hub coordinator with a hub");
  const [otherHub] = await db
    .select({ id: hub.id })
    .from(hub)
    .where(ne(hub.id, profile.assignedHub.id))
    .orderBy(hub.id)
    .limit(1);
  required(otherHub, "another hub");

  const scan = await uniqueScanPdf("Scan upload spec");
  const fileName = `scan-${scan.sha256.slice(0, 8)}.pdf`;
  const nextScan = await uniqueScanPdf("Scan upload spec, next batch");
  const nextFileName = `next-${nextScan.sha256.slice(0, 8)}.pdf`;
  // Another hub's upload, made here because no page lets this coordinator make one.
  const otherHubScan = await uniqueScanPdf("Scan upload spec, other hub");
  const otherHubFileName = `other-hub-${otherHubScan.sha256.slice(0, 8)}.pdf`;
  undo(() => removeScanUploads([scan.sha256, nextScan.sha256, otherHubScan.sha256]));
  const otherHubUploadId = objectId("surveyupload");
  await db.insert(surveyUpload).values({
    id: otherHubUploadId,
    hubId: otherHub.id,
    uploadedBy: coordinator.id,
    s3Key: `scans/${otherHubUploadId}`,
    fileName: otherHubFileName,
    sha256: otherHubScan.sha256,
    contentType: "application/pdf",
    byteSize: otherHubScan.bytes.length,
    status: SurveyUploadStatus.UPLOADED,
    uploadedAt: new Date(),
  });

  const chooseScan = () =>
    page.getByLabel("Scanned files").setInputFiles({
      name: fileName,
      mimeType: "application/pdf",
      buffer: Buffer.from(scan.bytes),
    });
  const addedFiles = page.getByRole("list", { name: "Files added" });

  await page.goto(getUrl("/hc/surveys"));
  await page.getByRole("radio", { name: "Select Scans" }).click();
  await expect(page).toHaveURL(/\/hc\/surveys\/scans$/);
  await chooseScan();
  await expect(addedFiles.getByRole("listitem")).toContainText([`${fileName}`]);
  await expect(addedFiles.getByText("Uploaded", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(fileName) })).toContainText("Uploaded");
  await expect(page.getByText(otherHubFileName)).toHaveCount(0);

  // The refused file comes last, so the table must still show the one uploaded before it.
  await page.getByLabel("Scanned files").setInputFiles([
    { name: nextFileName, mimeType: "application/pdf", buffer: Buffer.from(nextScan.bytes) },
    { name: fileName, mimeType: "application/pdf", buffer: Buffer.from(scan.bytes) },
  ]);
  await expect(
    addedFiles.getByText(`This file was already uploaded as ${fileName}`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(nextFileName) })).toContainText("Uploaded");
  await expect(page.getByRole("row", { name: new RegExp(fileName) })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(nextFileName) })).toContainText("Uploaded");
  await expect(page.getByRole("row", { name: new RegExp(fileName) })).toHaveCount(1);
});
