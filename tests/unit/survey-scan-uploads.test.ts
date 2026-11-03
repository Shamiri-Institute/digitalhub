// @vitest-environment node
import { createHash, randomBytes } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool } from "#/db/client";
import { hub, implementerMember, project, surveyAuditEvent, surveyUpload } from "#/db/schema";
import type { HubSurveyScope, SurveyViewer } from "#/lib/auth/survey-access";
import { getS3Client, headObject } from "#/lib/s3/s3.service";
import { fileSha256, scanContentTypeOf } from "#/lib/survey/scan-files";
import {
  finishScanUpload,
  keepScanUploadHeld,
  releaseScanUpload,
  type ScanFile,
  type StartedScanUpload,
  startScanUpload,
} from "#/lib/survey/scan-uploads";
import { removeScanUploads, uniqueScanPdf } from "#/tests/survey-fixtures";

let uploader: HubSurveyScope;
let colleague: HubSurveyScope;
let otherHubCoordinator: HubSurveyScope;
const createdHashes: string[] = [];

beforeAll(async () => {
  const [uploaderHub, otherHub] = await db
    .select({ hubId: hub.id, implementerId: hub.implementerId, projectId: hub.projectId })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
    .orderBy(asc(hub.id))
    .limit(2);
  if (!uploaderHub || !otherHub) throw new Error("Seed the database first");
  const members = await db
    .select({ userId: implementerMember.userId })
    .from(implementerMember)
    .where(eq(implementerMember.implementerId, uploaderHub.implementerId))
    .orderBy(asc(implementerMember.userId))
    .limit(2);
  const [uploaderMember, colleagueMember] = members;
  if (!uploaderMember || !colleagueMember) throw new Error("Seed the database first");
  uploader = { ...uploaderHub, userId: uploaderMember.userId };
  colleague = { ...uploaderHub, userId: colleagueMember.userId };
  otherHubCoordinator = { ...otherHub, userId: colleagueMember.userId };
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

function toSend(started: StartedScanUpload) {
  if (started.stored) throw new Error("Expected an upload still to send");
  return started;
}

function put(started: StartedScanUpload, body: Uint8Array) {
  const { url, headers } = toSend(started);
  return fetch(url, { method: "PUT", headers, body: Buffer.from(body) });
}

async function s3KeyOf(uploadId: string) {
  const upload = await db.query.surveyUpload.findFirst({
    where: (u, { eq }) => eq(u.id, uploadId),
  });
  if (!upload) throw new Error("No such upload");
  return upload.s3Key;
}

const twoHoursAgo = () => new Date(Date.now() - 2 * 60 * 60 * 1000);

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

    await db
      .update(surveyUpload)
      .set({ updatedAt: twoHoursAgo() })
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

  it("finishes without sending again a file whose earlier PUT reached S3", async () => {
    const { file, bytes } = await scanFile("Kibera batch 5");
    const first = await startScanUpload(uploader, file);
    expect((await put(first, bytes)).status).toBe(200);

    // The finish never ran, say the tab closed while saving.
    const again = await startScanUpload(uploader, file);
    expect(again).toEqual({ uploadId: first.uploadId, stored: true });
    expect(await finishScanUpload(hubViewer(uploader), again.uploadId)).toMatchObject({
      status: "UPLOADED",
    });
  });

  it("sends a resumed upload as its first type, when nothing was stored yet", async () => {
    const { file, bytes } = await scanFile("Kibera batch 12");
    const first = await startScanUpload(uploader, file);

    const asImage = await startScanUpload(uploader, { ...file, contentType: "image/png" });
    expect(asImage).toMatchObject({ uploadId: first.uploadId, stored: false });
    expect(toSend(asImage).headers["Content-Type"]).toBe("application/pdf");
    expect((await put(asImage, bytes)).status).toBe(200);
    expect(await finishScanUpload(hubViewer(uploader), asImage.uploadId)).toMatchObject({
      contentType: "application/pdf",
    });
  });

  it("keeps an upload's first type when it is resumed as another", async () => {
    const { file, bytes } = await scanFile("Kibera batch 10");
    const first = await startScanUpload(uploader, file);
    expect((await put(first, bytes)).status).toBe(200);

    const asImage = await startScanUpload(uploader, { ...file, contentType: "image/png" });
    expect(asImage).toEqual({ uploadId: first.uploadId, stored: true });
    expect(await finishScanUpload(hubViewer(uploader), asImage.uploadId)).toMatchObject({
      contentType: "application/pdf",
      pageCount: null,
    });
  });

  it("frees a cancelled upload's file for anyone at once, deleting what reached S3", async () => {
    const { file, bytes } = await scanFile("Kibera batch 6");
    const first = await startScanUpload(uploader, file);
    expect((await put(first, bytes)).status).toBe(200);
    const s3Key = await s3KeyOf(first.uploadId);

    // Another user's cancel touches nothing.
    await releaseScanUpload(hubViewer(colleague), first.uploadId);
    await expect(startScanUpload(colleague, file)).rejects.toThrow(
      "Someone else is uploading this file",
    );

    await releaseScanUpload(hubViewer(uploader), first.uploadId);
    expect(await uploadOf(file.sha256)).toBeUndefined();
    await expect(headObject(s3Key, "survey-scans")).rejects.toThrow();
    expect(await startScanUpload(colleague, file)).toMatchObject({ stored: false });
  });

  it("keeps an upload whose file is still being sent from being taken over", async () => {
    const { file } = await scanFile("Kibera batch 7");
    const started = await startScanUpload(uploader, file);
    await db
      .update(surveyUpload)
      .set({ updatedAt: twoHoursAgo() })
      .where(eq(surveyUpload.id, started.uploadId));

    await keepScanUploadHeld(hubViewer(uploader), started.uploadId);
    await expect(startScanUpload(colleague, file)).rejects.toThrow(
      "Someone else is uploading this file",
    );
    await expect(keepScanUploadHeld(hubViewer(colleague), started.uploadId)).rejects.toThrow(
      "Upload not found",
    );
  });

  it("won't finish an upload for a hub its coordinator no longer has", async () => {
    const { file, bytes } = await scanFile("Kibera batch 8");
    const started = await startScanUpload(uploader, file);
    expect((await put(started, bytes)).status).toBe(200);

    const movedHub = hubViewer({ ...uploader, hubId: otherHubCoordinator.hubId });
    await expect(finishScanUpload(movedHub, started.uploadId)).rejects.toThrow(
      "You no longer upload for this file's hub, so it can't be finished",
    );
    // Kept, for when the coordinator is back on that hub, or for a colleague after the hour.
    expect(await uploadOf(file.sha256)).toMatchObject({ status: "PENDING" });
  });

  it("discards an object whose checksum isn't the file's, so it can be sent again", async () => {
    const { file, bytes } = await scanFile("Kibera batch 9");
    // The same size and type, so only the checksum differs.
    const corrupted = Buffer.from(bytes);
    corrupted.writeUInt8(corrupted.readUInt8(corrupted.length - 1) ^ 0xff, corrupted.length - 1);
    const started = await startScanUpload(uploader, file);
    const s3Key = await s3KeyOf(started.uploadId);
    // Put straight to S3, as a store that didn't enforce the signed checksum would let through.
    await getS3Client("survey-scans").send(
      new PutObjectCommand({
        Bucket: process.env.S3_SURVEY_SCANS_BUCKET,
        Key: s3Key,
        Body: corrupted,
        ContentType: file.contentType,
        ChecksumSHA256: createHash("sha256").update(corrupted).digest("base64"),
      }),
    );

    await expect(finishScanUpload(hubViewer(uploader), started.uploadId)).rejects.toThrow(
      "The stored file doesn't match the one you chose",
    );
    expect(await uploadOf(file.sha256)).toBeUndefined();
    await expect(headObject(s3Key, "survey-scans")).rejects.toThrow();
  });

  it("discards an object stored as another type than its upload", async () => {
    const { file, bytes } = await scanFile("Kibera batch 11");
    const started = await startScanUpload(uploader, file);
    const s3Key = await s3KeyOf(started.uploadId);
    // Put straight to S3, as a store that didn't enforce the signed type would let through.
    await getS3Client("survey-scans").send(
      new PutObjectCommand({
        Bucket: process.env.S3_SURVEY_SCANS_BUCKET,
        Key: s3Key,
        Body: Buffer.from(bytes),
        ContentType: "image/png",
        ChecksumSHA256: Buffer.from(file.sha256, "hex").toString("base64"),
      }),
    );

    await expect(finishScanUpload(hubViewer(uploader), started.uploadId)).rejects.toThrow(
      "The stored file doesn't match the one you chose",
    );
    expect(await uploadOf(file.sha256)).toBeUndefined();
    await expect(headObject(s3Key, "survey-scans")).rejects.toThrow();
  });

  it("refuses any bytes but the ones the upload was started with", async () => {
    const { file } = await scanFile("Kibera batch 3");
    const other = await uniqueScanPdf("Kibera batch 3, another scan");

    const started = await startScanUpload(uploader, { ...file, byteSize: other.bytes.length });
    const response = await put(started, other.bytes);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("<Code>BadDigest</Code>");
    // Sending the header the other file would need breaks the signature.
    const forged = await fetch(toSend(started).url, {
      method: "PUT",
      headers: {
        ...toSend(started).headers,
        "x-amz-checksum-sha256": Buffer.from(other.sha256, "hex").toString("base64"),
      },
      body: Buffer.from(other.bytes),
    });
    expect(forged.status).toBe(403);
    await expect(finishScanUpload(hubViewer(uploader), started.uploadId)).rejects.toThrow(
      "The file did not reach storage",
    );
    expect(await uploadOf(file.sha256)).toBeUndefined();
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
    expect(scanContentTypeOf({ type: "Application/PDF; charset=binary", name: "a.pdf" })).toBe(
      "application/pdf",
    );
    expect(scanContentTypeOf({ type: "", name: "Batch 1.PDF" })).toBe("application/pdf");
    expect(scanContentTypeOf({ type: "application/octet-stream", name: "p.jpg" })).toBe(
      "image/jpeg",
    );
    expect(scanContentTypeOf({ type: "text/plain", name: "notes.pdf" })).toBeUndefined();
    expect(scanContentTypeOf({ type: "", name: "notes.txt" })).toBeUndefined();
    expect(scanContentTypeOf({ type: "", name: "batch.constructor" })).toBeUndefined();
  });
});
