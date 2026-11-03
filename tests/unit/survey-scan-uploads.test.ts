// @vitest-environment node
// Scan uploads against the database and a local S3 server, putting the bytes the way the browser
// does: what a second copy of a file meets, how an upload resumes or is taken over, and that S3
// refuses bytes other than the ones the upload was started with. The pages are tested in
// tests/e2e/hub-coordinator/scan-uploads.spec.ts.
import { createHash, randomBytes } from "node:crypto";

import { and, asc, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool } from "#/db/client";
import { hub, implementerMember, project, surveyAuditEvent, surveyUpload } from "#/db/schema";
import type { HubSurveyScope, SurveyViewer } from "#/lib/auth/survey-access";
import { fileSha256, scanContentTypeOf } from "#/lib/survey/scan-files";
import { finishScanUpload, type ScanFile, startScanUpload } from "#/lib/survey/scan-uploads";
import { removeScanUploads, uniqueScanPdf } from "#/tests/survey-fixtures";

let uploader: HubSurveyScope;
let colleague: HubSurveyScope;
let otherHubCoordinator: HubSurveyScope;
const createdHashes: string[] = [];

beforeAll(async () => {
  const [found, otherHub] = await db
    .select({ hubId: hub.id, implementerId: hub.implementerId, projectId: hub.projectId })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
    .orderBy(asc(hub.id))
    .limit(2);
  if (!found || !otherHub) throw new Error("Seed the database first");
  const members = await db
    .select({ userId: implementerMember.userId })
    .from(implementerMember)
    .where(eq(implementerMember.implementerId, found.implementerId))
    .orderBy(asc(implementerMember.userId))
    .limit(2);
  const [first, second] = members;
  if (!first || !second) throw new Error("Seed the database first");
  uploader = { ...found, userId: first.userId };
  colleague = { ...found, userId: second.userId };
  otherHubCoordinator = { ...otherHub, userId: second.userId };
});

afterAll(async () => {
  await removeScanUploads(createdHashes);
  await pool.end();
});

const hubViewer = (scope: HubSurveyScope): SurveyViewer => ({ kind: "hub", ...scope });

async function scanFile(label: string) {
  const pdf = await uniqueScanPdf(label);
  createdHashes.push(pdf.sha256);
  const file: ScanFile = {
    fileName: `${label}.pdf`,
    contentType: "application/pdf",
    byteSize: pdf.bytes.length,
    sha256: pdf.sha256,
  };
  return { file, bytes: pdf.bytes };
}

/** The PUT the browser makes, with the headers the upload was started with. */
function put(started: { url: string; headers: Record<string, string> }, body: Uint8Array) {
  return fetch(started.url, { method: "PUT", headers: started.headers, body: Buffer.from(body) });
}

async function uploadOf(sha256: string) {
  return db.query.surveyUpload.findFirst({ where: (u, { eq }) => eq(u.sha256, sha256) });
}

describe("scan uploads", () => {
  it("records an uploaded file once, and refuses the same file again before it is sent", async () => {
    const { file, bytes } = await scanFile("Kibera batch 1");

    const started = await startScanUpload(uploader, file);
    expect((await put(started, bytes)).status).toBe(200);
    expect(await finishScanUpload(hubViewer(uploader), started.uploadId)).toMatchObject({
      status: "UPLOADED",
      fileName: "Kibera batch 1.pdf",
      pageCount: null,
    });
    // A finish whose reply was lost, run again, changes nothing.
    await finishScanUpload(hubViewer(uploader), started.uploadId);
    const events = await db
      .select({ action: surveyAuditEvent.action, surveyId: surveyAuditEvent.surveyId })
      .from(surveyAuditEvent)
      .where(eq(surveyAuditEvent.entityId, started.uploadId));
    expect(events).toEqual([{ action: "SCAN_UPLOADED", surveyId: null }]);

    await expect(startScanUpload(colleague, file)).rejects.toThrow(
      "This file was already uploaded as Kibera batch 1.pdf",
    );
    await expect(startScanUpload(otherHubCoordinator, file)).rejects.toThrow(
      "This file has already been uploaded",
    );
  });

  it("lets its uploader resume an unfinished upload, and keeps others out for an hour", async () => {
    const { file, bytes } = await scanFile("Kibera batch 2");

    const first = await startScanUpload(uploader, file);
    const resumed = await startScanUpload(uploader, file);
    expect(resumed.uploadId).toBe(first.uploadId);
    await expect(startScanUpload(colleague, file)).rejects.toThrow(
      "Someone else is uploading this file",
    );
    await expect(finishScanUpload(hubViewer(uploader), first.uploadId)).rejects.toThrow(
      "The file did not reach storage",
    );

    await db
      .update(surveyUpload)
      .set({ updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
      .where(eq(surveyUpload.id, first.uploadId));
    const takenOver = await startScanUpload(colleague, file);
    expect(takenOver.uploadId).toBe(first.uploadId);
    // The first uploader's try no longer counts.
    await expect(finishScanUpload(hubViewer(uploader), first.uploadId)).rejects.toThrow(
      "Upload not found",
    );
    expect((await put(takenOver, bytes)).status).toBe(200);
    expect(await finishScanUpload(hubViewer(colleague), takenOver.uploadId)).toMatchObject({
      status: "UPLOADED",
      uploadedBy: colleague.userId,
    });
  });

  it("lets anyone upload again a file the pipeline could not read", async () => {
    const { file, bytes } = await scanFile("Kibera batch 4");
    const first = await startScanUpload(uploader, file);
    expect((await put(first, bytes)).status).toBe(200);
    await finishScanUpload(hubViewer(uploader), first.uploadId);
    await db
      .update(surveyUpload)
      .set({ status: "FAILED", error: "The pages could not be read" })
      .where(eq(surveyUpload.id, first.uploadId));

    const again = await startScanUpload(colleague, file);
    expect(again.uploadId).toBe(first.uploadId);
    expect((await put(again, bytes)).status).toBe(200);
    expect(await finishScanUpload(hubViewer(colleague), again.uploadId)).toMatchObject({
      status: "UPLOADED",
      error: null,
      uploadedBy: colleague.userId,
    });
  });

  it("refuses any bytes but the ones the upload was started with", async () => {
    const { file } = await scanFile("Kibera batch 3");
    const other = await uniqueScanPdf("Kibera batch 3, another scan");

    const started = await startScanUpload(uploader, { ...file, byteSize: other.bytes.length });
    const response = await put(started, other.bytes);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("InvalidDigest");
    // Sending the header the other file would need breaks the signature.
    const forged = await fetch(started.url, {
      method: "PUT",
      headers: {
        ...started.headers,
        "x-amz-checksum-sha256": Buffer.from(other.sha256, "hex").toString("base64"),
      },
      body: Buffer.from(other.bytes),
    });
    expect(forged.status).toBe(403);
    expect(await uploadOf(file.sha256)).toMatchObject({ status: "PENDING" });
  });
});

describe("scan files", () => {
  it("hashes a file read in chunks to the same SHA-256 as reading it whole", async () => {
    const bytes = randomBytes(5 * 1024 * 1024 + 7);
    expect(await fileSha256(new Blob([bytes]))).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
  });

  it("takes a scan's type from its extension only when the browser gives none", () => {
    expect(scanContentTypeOf({ type: "image/png", name: "page.png" })).toBe("image/png");
    expect(scanContentTypeOf({ type: "", name: "Batch 1.PDF" })).toBe("application/pdf");
    expect(scanContentTypeOf({ type: "application/octet-stream", name: "p.jpg" })).toBe(
      "image/jpeg",
    );
    expect(scanContentTypeOf({ type: "text/plain", name: "notes.pdf" })).toBeUndefined();
    expect(scanContentTypeOf({ type: "", name: "notes.txt" })).toBeUndefined();
  });
});
