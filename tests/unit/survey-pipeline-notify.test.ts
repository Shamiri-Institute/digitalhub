// @vitest-environment node
// Telling the pipeline a scan is ready, and running an upload again. The pipeline is a real HTTP
// server on localhost, so what is checked is the request it actually receives. No page shows the
// notification's bookkeeping, so the tests read it from the database.
import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "#/db/client";
import { SurveyUploadStatus } from "#/db/enums";
import { hub, project, surveyScanPage, surveyUpload } from "#/db/schema";
import { SurveyError } from "#/lib/actions/survey/respond";
import type { AdminScope } from "#/lib/auth/admin-access";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { objectId } from "#/lib/crypto";
import { reportUploadStatus } from "#/lib/survey/pipeline-api";
import { isStuck } from "#/lib/survey/pipeline-deadlines";
import { rerunScanUpload } from "#/lib/survey/pipeline-jobs";
import { MAX_NOTIFY_TRIES, notifyPipeline } from "#/lib/survey/pipeline-notify";
import { fetchScanUploads } from "#/lib/survey/scan-upload-queries";
import {
  PipelineDirection,
  SIGNATURE_HEADER,
  signPipelineRequest,
  TIMESTAMP_HEADER,
} from "#/lib/survey/pipeline-signing";

const SECRET = "notify-test-secret-of-at-least-32-chars";

type Received = { path: string; headers: IncomingMessage["headers"]; body: string };
let received: Received[] = [];
let answer = { status: 202, delayMs: 0 };
let pipeline: Server;
let pipelineUrl: string;
let scope: AdminScope & { hubId: string };
const createdUploadIds: string[] = [];

beforeAll(async () => {
  pipeline = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push({
        path: request.url ?? "",
        headers: request.headers,
        body: Buffer.concat(chunks).toString(),
      });
      setTimeout(() => response.writeHead(answer.status).end(), answer.delayMs);
    });
  });
  await new Promise<void>((resolve) => pipeline.listen(0, "127.0.0.1", resolve));
  pipelineUrl = `http://127.0.0.1:${(pipeline.address() as AddressInfo).port}/hooks`;

  const [defaultHub] = await db
    .select({ hubId: hub.id, implementerId: hub.implementerId, projectId: hub.projectId })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
    .orderBy(asc(hub.id))
    .limit(1);
  const member = defaultHub
    ? await db.query.implementerMember.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.implementerId, defaultHub.implementerId), eq(m.role, "ADMIN")),
        orderBy: (m, { asc }) => asc(m.id),
      })
    : undefined;
  if (!defaultHub || !member) throw new Error("Seed the database first");
  scope = { ...defaultHub, userId: member.userId };
});

beforeEach(() => {
  vi.stubEnv("SURVEY_PIPELINE_SECRET", SECRET);
  vi.stubEnv("SURVEY_PIPELINE_URL", pipelineUrl);
  received = [];
  answer = { status: 202, delayMs: 0 };
});

afterAll(async () => {
  if (createdUploadIds.length > 0) {
    await db.delete(surveyScanPage).where(inArray(surveyScanPage.uploadId, createdUploadIds));
    await db.delete(surveyUpload).where(inArray(surveyUpload.id, createdUploadIds));
  }
  await new Promise((resolve) => pipeline.close(resolve));
});

async function createUpload(values: Partial<typeof surveyUpload.$inferInsert> = {}) {
  const uploadId = objectId("surveyupload");
  await db.insert(surveyUpload).values({
    id: uploadId,
    hubId: scope.hubId,
    uploadedBy: scope.userId,
    s3Key: `scans/${uploadId}`,
    fileName: "batch.pdf",
    sha256: createHash("sha256").update(uploadId).digest("hex"),
    contentType: "application/pdf",
    byteSize: 1000,
    status: SurveyUploadStatus.UPLOADED,
    uploadedAt: new Date(),
    ...values,
  });
  createdUploadIds.push(uploadId);
  return uploadId;
}

async function uploadRow(uploadId: string) {
  const [upload] = await db
    .select({
      status: surveyUpload.status,
      attempt: surveyUpload.attempt,
      notifyTries: surveyUpload.notifyTries,
      notifyNextAt: surveyUpload.notifyNextAt,
      notifiedAt: surveyUpload.notifiedAt,
      notifyError: surveyUpload.notifyError,
      error: surveyUpload.error,
      pageCount: surveyUpload.pageCount,
      stuckAfter: surveyUpload.stuckAfter,
      stuck: isStuck(surveyUpload.status, surveyUpload.stuckAfter),
    })
    .from(surveyUpload)
    .where(eq(surveyUpload.id, uploadId));
  if (!upload) throw new Error(`No upload ${uploadId}`);
  return upload;
}

/** A port nothing listens on: taken from the system, then let go. */
async function closedPort() {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000);

/** Makes a waiting retry due now, as if its back-off had passed. */
async function makeDue(uploadId: string) {
  await db
    .update(surveyUpload)
    .set({ notifyNextAt: sql`now() - interval '1 second'` })
    .where(eq(surveyUpload.id, uploadId));
}

describe("notifying the pipeline", () => {
  it("queues an uploaded scan and sends one signed notification the pipeline accepts", async () => {
    const uploadId = await createUpload();

    expect(await notifyPipeline({ uploadIds: [uploadId] })).toEqual({
      queued: 1,
      accepted: 1,
      retrying: 0,
      gaveUp: 0,
    });

    expect(received).toHaveLength(1);
    const [notification] = received;
    expect(notification?.path).toBe("/hooks/uploads");
    expect(JSON.parse(notification?.body ?? "")).toEqual({
      uploadId,
      attempt: 1,
      contentType: "application/pdf",
      byteSize: 1000,
      sha256: createHash("sha256").update(uploadId).digest("hex"),
    });
    const timestamp = String(notification?.headers[TIMESTAMP_HEADER]);
    expect(Math.abs(Number(timestamp) - Date.now() / 1000)).toBeLessThan(60);
    expect(notification?.headers[SIGNATURE_HEADER]).toBe(
      signPipelineRequest(SECRET, {
        direction: PipelineDirection.SDH_TO_PIPELINE,
        timestamp,
        method: "POST",
        path: "/hooks/uploads",
        body: notification?.body ?? "",
      }),
    );
    expect(await uploadRow(uploadId)).toMatchObject({
      status: SurveyUploadStatus.QUEUED,
      notifyTries: 1,
      notifyNextAt: null,
      notifyError: null,
      stuck: false,
    });
    expect((await uploadRow(uploadId)).notifiedAt).not.toBeNull();

    await notifyPipeline({ uploadIds: [uploadId] });
    expect(received).toHaveLength(1);
  });

  it("retries a notification the pipeline refused, once its back-off has passed", async () => {
    const uploadId = await createUpload();
    answer.status = 503;

    expect(await notifyPipeline({ uploadIds: [uploadId] })).toMatchObject({ retrying: 1 });
    const refused = await uploadRow(uploadId);
    expect(refused).toMatchObject({
      status: SurveyUploadStatus.QUEUED,
      notifiedAt: null,
      notifyError: "The pipeline answered 503",
      notifyTries: 1,
    });
    expect(refused.notifyNextAt?.getTime()).toBeGreaterThan(Date.now());

    await notifyPipeline({ uploadIds: [uploadId] });
    expect(received).toHaveLength(1);

    answer.status = 202;
    await makeDue(uploadId);
    expect(await notifyPipeline({ uploadIds: [uploadId] })).toMatchObject({ accepted: 1 });
    expect(received).toHaveLength(2);
    expect(await uploadRow(uploadId)).toMatchObject({ notifyTries: 2, notifyError: null });
  });

  it("stops retrying after the last try, shows the upload as stuck, and alerts", async () => {
    const uploadId = await createUpload({
      status: SurveyUploadStatus.QUEUED,
      notifyTries: MAX_NOTIFY_TRIES - 1,
      notifyNextAt: new Date(Date.now() - 1000),
    });
    answer.status = 500;

    await expect(notifyPipeline({ uploadIds: [uploadId] })).rejects.toThrow(
      `refused 1 upload(s) ${MAX_NOTIFY_TRIES} times`,
    );
    expect(await uploadRow(uploadId)).toMatchObject({
      notifyTries: MAX_NOTIFY_TRIES,
      notifyNextAt: null,
      notifyError: "The pipeline answered 500",
      stuck: true,
    });
  });

  it("gives up, and alerts, on a last try a run claimed but died before recording", async () => {
    const uploadId = await createUpload({
      status: SurveyUploadStatus.QUEUED,
      notifyTries: MAX_NOTIFY_TRIES,
      notifyNextAt: minutesFromNow(-1),
    });

    await expect(notifyPipeline({ uploadIds: [uploadId] })).rejects.toThrow("refused 1 upload(s)");
    expect(received).toHaveLength(0);
    expect(await uploadRow(uploadId)).toMatchObject({
      notifyNextAt: null,
      notifyError: "The last notification went unanswered",
      stuck: true,
    });
  });

  it("records an unreachable pipeline as a refusal to retry", async () => {
    const uploadId = await createUpload();
    vi.stubEnv("SURVEY_PIPELINE_URL", `http://127.0.0.1:${await closedPort()}/hooks`);

    expect(await notifyPipeline({ uploadIds: [uploadId] })).toMatchObject({ retrying: 1 });
    expect((await uploadRow(uploadId)).notifyError).toMatch(/^The pipeline couldn't be reached/);
  });

  it("sends one notification when two runs overlap", async () => {
    const uploadId = await createUpload();
    answer.delayMs = 300;

    const results = await Promise.all([
      notifyPipeline({ uploadIds: [uploadId] }),
      notifyPipeline({ uploadIds: [uploadId] }),
    ]);

    expect(received).toHaveLength(1);
    expect(
      results.reduce((sent, result) => sent + ("accepted" in result ? result.accepted : 0), 0),
    ).toBe(1);
  });

  it("throws where the pipeline's URL is set without a usable secret, so the cron reports it", async () => {
    const uploadId = await createUpload();
    vi.stubEnv("SURVEY_PIPELINE_SECRET", "too-short");

    await expect(notifyPipeline({ uploadIds: [uploadId] })).rejects.toThrow(
      "SURVEY_PIPELINE_URL is set but SURVEY_PIPELINE_SECRET is missing or short",
    );
    expect((await uploadRow(uploadId)).status).toBe(SurveyUploadStatus.UPLOADED);
  });

  it("throws for a pipeline URL that isn't http(s), or has a query string", async () => {
    const uploadId = await createUpload();
    for (const setting of [`${pipelineUrl}?env=test`, `${pipelineUrl}?`, "localhost:8080"]) {
      vi.stubEnv("SURVEY_PIPELINE_URL", setting);
      // oxlint-disable-next-line eslint/no-await-in-loop -- one setting after the other
      await expect(notifyPipeline({ uploadIds: [uploadId] })).rejects.toThrow(
        "SURVEY_PIPELINE_URL must be http(s), with no query string or fragment",
      );
    }
  });

  it("notifies nothing where no pipeline is set, and never calls the upload stuck", async () => {
    const uploadId = await createUpload({ uploadedAt: minutesFromNow(-3 * 60) });
    vi.stubEnv("SURVEY_PIPELINE_URL", "");

    expect(await notifyPipeline({ uploadIds: [uploadId] })).toEqual({ skipped: "no pipeline" });
    expect(received).toHaveLength(0);
    expect(await uploadRow(uploadId)).toMatchObject({
      status: SurveyUploadStatus.UPLOADED,
      stuck: false,
    });
  });
});

describe("whether a job is stuck", () => {
  it("gives a job the pipeline took 2 hours to start, and a retry until it is due", async () => {
    const taken = await createUpload();
    await notifyPipeline({ uploadIds: [taken] });
    const refused = await createUpload();
    answer.status = 503;
    await notifyPipeline({ uploadIds: [refused] });

    const takenUpload = await uploadRow(taken);
    expect(takenUpload.stuck).toBe(false);
    expect(takenUpload.stuckAfter?.getTime()).toBeGreaterThan(minutesFromNow(110).getTime());
    const refusedUpload = await uploadRow(refused);
    expect(refusedUpload.stuck).toBe(false);
    expect(refusedUpload.stuckAfter?.getTime()).toBeGreaterThan(
      refusedUpload.notifyNextAt?.getTime() ?? Infinity,
    );
  });

  it("gives a working job 15 minutes from each heartbeat, and a finished one no deadline", async () => {
    const uploadId = await createUpload({ status: SurveyUploadStatus.QUEUED });
    const report = (body: object) =>
      reportUploadStatus(uploadId, JSON.stringify({ attempt: 1, ...body }));

    expect(await report({ status: "PROCESSING", pageCount: 2 })).toMatchObject({ ok: true });
    const working = await uploadRow(uploadId);
    expect(working.stuck).toBe(false);
    expect(working.stuckAfter?.getTime()).toBeGreaterThan(minutesFromNow(14).getTime());
    expect(working.stuckAfter?.getTime()).toBeLessThan(minutesFromNow(16).getTime());

    expect(await report({ status: "FAILED", error: "The PDF has no pages" })).toMatchObject({
      ok: true,
    });
    expect(await uploadRow(uploadId)).toMatchObject({ stuckAfter: null, stuck: false });
  });

  it("is never stuck once finished, whatever deadline it was left with", async () => {
    const processed = await createUpload({
      status: SurveyUploadStatus.PROCESSED,
      pageCount: 2,
      stuckAfter: minutesFromNow(-60),
    });

    expect((await uploadRow(processed)).stuck).toBe(false);
  });

  it("is stuck once its deadline passes, and shows so on the scans pages", async () => {
    const quiet = await createUpload({
      status: SurveyUploadStatus.PROCESSING,
      pageCount: 2,
      stuckAfter: minutesFromNow(-1),
    });
    const { userId, implementerId, projectId } = scope;

    expect((await uploadRow(quiet)).stuck).toBe(true);
    for (const viewer of [
      { kind: "project" as const, userId, implementerId, projectId },
      { kind: "hub" as const, ...scope },
    ]) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- one viewer after the other
      const shown = (await fetchScanUploads(viewer)).find((upload) => upload.id === quiet);
      expect(shown).toMatchObject({ stuck: true, pagesPosted: 0, pageCount: 2 });
    }
  });
});

describe("running an upload again", () => {
  it("runs a failed upload again as its next attempt, and notifies that attempt", async () => {
    const uploadId = await createUpload({
      status: SurveyUploadStatus.FAILED,
      error: "The PDF has no pages",
      // Uploaded long ago: the re-run must not count as stuck from then.
      uploadedAt: minutesFromNow(-3 * 60),
      pageCount: 11,
      notifiedAt: new Date(),
      notifyTries: 1,
    });

    expect(await rerunScanUpload(scope, uploadId)).toEqual({ fileName: "batch.pdf", attempt: 2 });
    expect(await uploadRow(uploadId)).toMatchObject({
      status: SurveyUploadStatus.UPLOADED,
      attempt: 2,
      error: null,
      pageCount: null,
      notifiedAt: null,
      notifyTries: 0,
      stuck: false,
    });
    expect((await uploadRow(uploadId)).stuckAfter).toBeNull();

    await notifyPipeline({ uploadIds: [uploadId] });
    expect(JSON.parse(received[0]?.body ?? "")).toMatchObject({ uploadId, attempt: 2 });
  });

  it("runs a stuck upload again", async () => {
    const uploadId = await createUpload({
      status: SurveyUploadStatus.PROCESSING,
      pageCount: 2,
      stuckAfter: minutesFromNow(-5),
    });

    expect(await rerunScanUpload(scope, uploadId)).toMatchObject({ attempt: 2 });
  });

  it("refuses an upload that is running or finished", async () => {
    const running = await createUpload({
      status: SurveyUploadStatus.PROCESSING,
      pageCount: 2,
      stuckAfter: minutesFromNow(10),
    });
    const processed = await createUpload({ status: SurveyUploadStatus.PROCESSED, pageCount: 2 });

    await expect(rerunScanUpload(scope, running)).rejects.toThrow(SurveyError);
    await expect(rerunScanUpload(scope, processed)).rejects.toThrow(
      "Only a failed or stuck upload can be run again",
    );
    expect((await uploadRow(running)).attempt).toBe(1);
  });

  it("finds no upload outside the admin's project", async () => {
    const uploadId = await createUpload({ status: SurveyUploadStatus.FAILED, error: "x" });

    await expect(
      rerunScanUpload({ ...scope, projectId: "not-this-project" }, uploadId),
    ).rejects.toThrow(NotFoundError);
  });
});
