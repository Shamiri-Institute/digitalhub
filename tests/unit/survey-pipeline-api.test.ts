// @vitest-environment node
// The contract test for the extraction pipeline's endpoints: signed requests to the real route
// handlers, against Postgres and the local S3. No page shows upload state, scan pages or page
// images yet, so the tests read those from the database.
import { createHash } from "node:crypto";

import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { POST as postDownloadUrl } from "#/app/api/survey-pipeline/uploads/[uploadId]/download-url/route";
import { GET as getLayout } from "#/app/api/survey-pipeline/layouts/[versionId]/route";
import { POST as postPageImages } from "#/app/api/survey-pipeline/uploads/[uploadId]/page-images/route";
import { POST as postLookup } from "#/app/api/survey-pipeline/uploads/[uploadId]/pages/lookup/route";
import { POST as postPages } from "#/app/api/survey-pipeline/uploads/[uploadId]/pages/route";
import { POST as postStatus } from "#/app/api/survey-pipeline/uploads/[uploadId]/status/route";
import { db } from "#/db/client";
import type { SurveyUploadStatus } from "#/db/enums";
import {
  hub,
  project,
  surveyAnswer,
  surveyPrintFile,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyScanPage,
  surveyScanPageImage,
  surveyUpload,
} from "#/db/schema";
import type { HubSurveyScope } from "#/lib/auth/survey-access";
import { objectId } from "#/lib/crypto";
import { deleteObject, headObject, putObject } from "#/lib/s3/s3.service";
import {
  PipelineDirection,
  SIGNATURE_HEADER,
  signPipelineRequest,
  TIMESTAMP_HEADER,
} from "#/lib/survey/pipeline-signing";
import { issuePrintFile, recordPrintRun } from "#/lib/survey/print-run";
import { pageQrText } from "#/lib/survey/print-qr";
import { scanPageImageKey } from "#/lib/survey/scan-files";
import { hexChecksum } from "#/lib/s3/utils/checksum";
import type { FieldRead } from "#/lib/survey/scan-wire";
import { createPrintSchool, createPublishedSurvey, removeSurvey } from "#/tests/survey-fixtures";
import vectorFile from "./fixtures/pipeline-signing-vectors.json";
import { PRINT_FORM } from "./fixtures/survey-print-form";

const SECRET = "contract-test-secret-of-at-least-32-chars";
const A4_IMAGE = { width: 1654, height: 2339 };

let scope: HubSurveyScope;
let otherHubId: string;
let versionId: string;
let removeSchool: () => Promise<void>;
let schoolId: string;
const surveyCode = `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const createdCopyIds: string[] = [];
const createdUploadIds: string[] = [];
const createdObjectKeys: string[] = [];

beforeAll(async () => {
  vi.stubEnv("SURVEY_PIPELINE_SECRET", SECRET);
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
  const [otherHub] = defaultHub
    ? await db
        .select({ id: hub.id })
        .from(hub)
        .where(ne(hub.id, defaultHub.hubId))
        .orderBy(asc(hub.id))
        .limit(1)
    : [];
  if (!defaultHub || !member || !otherHub) throw new Error("Seed the database first");
  scope = { ...defaultHub, userId: member.userId };
  otherHubId = otherHub.id;
  const printSchool = await createPrintSchool({
    hubId: scope.hubId,
    schoolName: `Pipeline test school ${surveyCode}`,
  });
  schoolId = printSchool.schoolId;
  removeSchool = printSchool.remove;
  const published = await createPublishedSurvey({
    code: surveyCode,
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    form: PRINT_FORM,
  });
  versionId = published.versionId;
});

afterAll(async () => {
  if (createdCopyIds.length > 0) {
    await db.delete(surveyAnswer).where(inArray(surveyAnswer.questionnaireId, createdCopyIds));
  }
  if (createdUploadIds.length > 0) {
    await db
      .delete(surveyScanPage)
      .where(
        and(
          inArray(surveyScanPage.uploadId, createdUploadIds),
          eq(surveyScanPage.status, "DUPLICATE"),
        ),
      );
    await db.delete(surveyScanPage).where(inArray(surveyScanPage.uploadId, createdUploadIds));
    await db.delete(surveyUpload).where(inArray(surveyUpload.id, createdUploadIds));
  }
  await Promise.all(createdObjectKeys.map((Key) => deleteObject({ Key }, "survey-scans")));
  await removeSurvey({ code: surveyCode });
  await removeSchool();
});

async function issueCopy() {
  return db.transaction(async (tx) => {
    const issued = await recordPrintRun(tx, scope, {
      printRunId: objectId("surveyprintrun"),
      versionId,
      request: { kind: "COUNTS", schools: [{ schoolId, copies: 1 }] },
    });
    const [file] = await tx
      .select({ id: surveyPrintFile.id })
      .from(surveyPrintFile)
      .where(eq(surveyPrintFile.printRunId, issued.printRunId));
    if (!file) throw new Error("No file");
    await issuePrintFile(tx, file.id);
    const [copy] = await tx
      .select({ id: surveyQuestionnaire.id })
      .from(surveyQuestionnaire)
      .where(eq(surveyQuestionnaire.printRunId, issued.printRunId));
    if (!copy) throw new Error("No copy");
    createdCopyIds.push(copy.id);
    const pages = await tx
      .select({ id: surveyQuestionnairePage.id, pageNumber: surveyQuestionnairePage.pageNumber })
      .from(surveyQuestionnairePage)
      .where(eq(surveyQuestionnairePage.questionnaireId, copy.id))
      .orderBy(asc(surveyQuestionnairePage.pageNumber));
    return { questionnaireId: copy.id, qrs: pages.map((page) => pageQrText(page.id)) };
  });
}

async function createUpload({
  hubId = scope.hubId,
  status = "QUEUED",
}: { hubId?: string; status?: SurveyUploadStatus } = {}) {
  const uploadId = objectId("surveyupload");
  const s3Key = `scans/${uploadId}`;
  await db.insert(surveyUpload).values({
    id: uploadId,
    hubId,
    uploadedBy: scope.userId,
    s3Key,
    fileName: "batch.pdf",
    sha256: createHash("sha256").update(uploadId).digest("hex"),
    contentType: "application/pdf",
    byteSize: 1000,
    status,
    uploadedAt: new Date(),
  });
  createdUploadIds.push(uploadId);
  return uploadId;
}

function signedRequest(
  method: "GET" | "POST",
  path: string,
  {
    body,
    secret = SECRET,
    timestamp = Math.floor(Date.now() / 1000),
    direction = PipelineDirection.PIPELINE_TO_SDH,
    query = "",
  }: {
    body?: unknown;
    secret?: string;
    timestamp?: number | string;
    direction?: PipelineDirection;
    query?: string;
  } = {},
) {
  const rawBody = body === undefined ? "" : JSON.stringify(body);
  const signature = signPipelineRequest(secret, {
    direction,
    timestamp,
    method,
    path,
    body: rawBody,
  });
  const url = `http://localhost${path}${query}`;
  const headers = { [TIMESTAMP_HEADER]: String(timestamp), [SIGNATURE_HEADER]: signature };
  return method === "GET"
    ? new Request(url, { method: "GET", headers })
    : new Request(url, { method: "POST", headers, body: rawBody });
}

const uploadPath = (uploadId: string, endpoint: string) =>
  `/api/survey-pipeline/uploads/${uploadId}/${endpoint}`;

async function call(
  handler: (
    request: Request,
    context: { params: Promise<{ uploadId: string }> },
  ) => Promise<Response>,
  uploadId: string,
  endpoint: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const response = await handler(signedRequest("POST", uploadPath(uploadId, endpoint), { body }), {
    params: Promise.resolve({ uploadId }),
  });
  return { status: response.status, body: await response.json() };
}

type ImageLink = { uploadUrl: string; uploadHeaders: Record<string, string> };

// The upload link page-images gave for its first image.
function firstLink(links: { body: unknown }): ImageLink {
  const [image] = (links.body as { images: Partial<ImageLink>[] }).images;
  if (!image?.uploadUrl || !image.uploadHeaders) throw new Error("No upload link");
  return { uploadUrl: image.uploadUrl, uploadHeaders: image.uploadHeaders };
}

const resultsOf = (response: { body: unknown }) => (response.body as { pages: unknown[] }).pages;

const reportStatus = (uploadId: string, body: unknown) =>
  call(postStatus, uploadId, "status", body);
const askImageLinks = (uploadId: string, body: unknown) =>
  call(postPageImages, uploadId, "page-images", body);
const postPageResults = (uploadId: string, body: unknown) =>
  call(postPages, uploadId, "pages", body);

function imageOf(label: string) {
  const bytes = new TextEncoder().encode(`fake jpeg ${label} ${objectId("image")}`);
  return {
    bytes,
    byteSize: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("base64"),
  };
}

// PUTs with exactly the headers the link came with, as the pipeline does.
async function putImage(link: ImageLink, image: ReturnType<typeof imageOf>) {
  const response = await fetch(link.uploadUrl, {
    method: "PUT",
    headers: link.uploadHeaders,
    body: image.bytes,
  });
  return response.status;
}

function imageKey(
  uploadId: string,
  attempt: number,
  pageIndex: number,
  image: ReturnType<typeof imageOf>,
) {
  const key = scanPageImageKey(uploadId, attempt, pageIndex, hexChecksum(image.sha256));
  createdObjectKeys.push(key);
  return key;
}

async function uploadPageImage(
  uploadId: string,
  attempt: number,
  pageIndex: number,
  size = A4_IMAGE,
) {
  const image = imageOf(`${uploadId} ${pageIndex}`);
  const links = await askImageLinks(uploadId, {
    attempt,
    images: [{ pageIndex, byteSize: image.byteSize, sha256: image.sha256, ...size }],
  });
  expect(links.status).toBe(200);
  imageKey(uploadId, attempt, pageIndex, image);
  expect(await putImage(firstLink(links), image)).toBe(200);
  return image;
}

function ok(field: string, value: NonNullable<FieldRead["value"]>): FieldRead {
  return { field, value, status: "ok", confidence: null };
}

const FIRST_PAGE_READS: FieldRead[] = [ok("mood", "3"), ok("home", "1"), ok("sport", ["football"])];

function readPage(
  pageIndex: number,
  qr: string,
  { fields = FIRST_PAGE_READS, image }: { fields?: FieldRead[]; image?: { sha256: string } } = {},
) {
  return {
    pageIndex,
    qrs: [qr, qr],
    rotation: 0,
    aligned: true,
    quality: 0.95,
    fields,
    imageSha256: image?.sha256,
  };
}

describe("signing", () => {
  it("reproduces every published test vector", () => {
    for (const vector of vectorFile.vectors) {
      expect(
        signPipelineRequest(vectorFile.secret, {
          direction: vector.direction as PipelineDirection,
          timestamp: vector.timestamp,
          method: vector.method,
          path: vector.path,
          body: vector.body,
        }),
        vector.name,
      ).toBe(vector.signature);
    }
  });

  it("refuses a request it can't trust with 401, and serves a signed one", async () => {
    const uploadId = await createUpload();
    const path = uploadPath(uploadId, "download-url");
    const context = { params: Promise.resolve({ uploadId }) };
    const statusOf = async (request: Request) => (await postDownloadUrl(request, context)).status;

    expect(await statusOf(signedRequest("POST", path))).toBe(200);
    const leadingZero = `0${Math.floor(Date.now() / 1000)}`;
    expect(await statusOf(signedRequest("POST", path, { timestamp: leadingZero }))).toBe(200);
    const signed = signedRequest("POST", path);
    const inUpperCase = new Request(signed.url, {
      method: "POST",
      headers: {
        [TIMESTAMP_HEADER]: signed.headers.get(TIMESTAMP_HEADER) ?? "",
        [SIGNATURE_HEADER]: (signed.headers.get(SIGNATURE_HEADER) ?? "").toUpperCase(),
      },
      body: "",
    });
    expect(await statusOf(inUpperCase)).toBe(200);
    expect(await statusOf(signedRequest("POST", path, { secret: `${SECRET}x` }))).toBe(401);
    const sixMinutesAgo = Math.floor(Date.now() / 1000) - 6 * 60;
    expect(await statusOf(signedRequest("POST", path, { timestamp: sixMinutesAgo }))).toBe(401);
    expect(await statusOf(signedRequest("POST", path, { query: "?debug=1" }))).toBe(401);
    expect(
      await statusOf(signedRequest("POST", path, { direction: PipelineDirection.SDH_TO_PIPELINE })),
    ).toBe(401);
    const tampered = signedRequest("POST", path, { body: { attempt: 1 } });
    expect(
      await statusOf(
        new Request(tampered.url, {
          method: "POST",
          headers: tampered.headers,
          body: JSON.stringify({ attempt: 2 }),
        }),
      ),
    ).toBe(401);

    const shortSecret = "only-thirty-one-characters-long";
    vi.stubEnv("SURVEY_PIPELINE_SECRET", "");
    try {
      expect(await statusOf(signedRequest("POST", path))).toBe(401);
      vi.stubEnv("SURVEY_PIPELINE_SECRET", shortSecret);
      expect(await statusOf(signedRequest("POST", path, { secret: shortSecret }))).toBe(401);
    } finally {
      vi.stubEnv("SURVEY_PIPELINE_SECRET", SECRET);
    }
  });
});

describe("a PDF upload from QUEUED to PROCESSED", () => {
  it("downloads the scan, looks up codes, takes images and pages, and finishes", async () => {
    const copy = await issueCopy();
    const voidCopy = await issueCopy();
    await db
      .update(surveyQuestionnaire)
      .set({ status: "VOID" })
      .where(eq(surveyQuestionnaire.id, voidCopy.questionnaireId));
    const uploadId = await createUpload();
    const scanBytes = new TextEncoder().encode(`scan ${uploadId}`);
    await putObject(`scans/${uploadId}`, "survey-scans", scanBytes, "application/pdf");
    createdObjectKeys.push(`scans/${uploadId}`);
    const [firstQr = "", secondQr = ""] = copy.qrs;

    const download = await call(postDownloadUrl, uploadId, "download-url");
    expect(download.status).toBe(200);
    const downloaded = await fetch((download.body as { downloadUrl: string }).downloadUrl);
    expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(scanBytes);

    expect(await reportStatus(uploadId, { attempt: 1, status: "PROCESSING" })).toEqual({
      status: 400,
      body: { error: "invalid", reason: "the first PROCESSING carries pageCount" },
    });
    expect(
      await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 3 }),
    ).toEqual({ status: 200, body: { status: "PROCESSING", pageCount: 3 } });
    expect(
      await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 4 }),
    ).toEqual({
      status: 400,
      body: { error: "invalid", reason: "pageCount is 3 and can't change" },
    });
    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await db
      .update(surveyUpload)
      .set({ lastHeartbeatAt: anHourAgo })
      .where(eq(surveyUpload.id, uploadId));
    expect(await reportStatus(uploadId, { attempt: 1, status: "PROCESSING" })).toEqual({
      status: 200,
      body: { status: "PROCESSING", pageCount: 3 },
    });
    const [afterHeartbeat] = await db
      .select({ lastHeartbeatAt: surveyUpload.lastHeartbeatAt })
      .from(surveyUpload)
      .where(eq(surveyUpload.id, uploadId));
    expect(afterHeartbeat?.lastHeartbeatAt?.getTime()).toBeGreaterThan(anHourAgo.getTime());

    const lookup = await call(postLookup, uploadId, "pages/lookup", {
      qrs: [firstQr, "SCHOOL-STAMP", voidCopy.qrs[0]],
    });
    expect(lookup).toEqual({
      status: 200,
      body: {
        pages: [
          { qr: firstQr, rejected: false, versionId, pageNumber: 1 },
          { qr: "SCHOOL-STAMP", rejected: true, versionId: null, pageNumber: null },
          { qr: voidCopy.qrs[0], rejected: true, versionId: null, pageNumber: null },
        ],
      },
    });
    expect(await call(postLookup, uploadId, "pages/lookup", { qrs: [`${firstQr}\u0000`] })).toEqual(
      {
        status: 200,
        body: {
          pages: [{ qr: `${firstQr}\u0000`, rejected: false, versionId, pageNumber: 1 }],
        },
      },
    );
    const otherHubUpload = await createUpload({ hubId: otherHubId });
    expect(await call(postLookup, otherHubUpload, "pages/lookup", { qrs: [firstQr] })).toEqual({
      status: 200,
      body: { pages: [{ qr: firstQr, rejected: true, versionId: null, pageNumber: null }] },
    });

    const layoutPath = `/api/survey-pipeline/layouts/${versionId}`;
    const layout = await getLayout(signedRequest("GET", layoutPath), {
      params: Promise.resolve({ versionId }),
    });
    expect(layout.status).toBe(200);
    expect((await layout.json()).pages).toHaveLength(3);
    const missingVersionId = objectId("surveyversion");
    const missingLayout = await getLayout(
      signedRequest("GET", `/api/survey-pipeline/layouts/${missingVersionId}`),
      { params: Promise.resolve({ versionId: missingVersionId }) },
    );
    expect(missingLayout.status).toBe(404);

    expect(
      await askImageLinks(uploadId, {
        attempt: 1,
        images: [{ pageIndex: 3, byteSize: 10, sha256: imageOf("x").sha256, ...A4_IMAGE }],
      }),
    ).toEqual({
      status: 400,
      body: { error: "invalid", reason: "page 3 is past the upload's 3 pages" },
    });

    // The same 32 bytes in base64 with its two padding bits set: valid, but not the standard spelling.
    const standard = imageOf("spelling").sha256;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const nonStandard = `${standard.slice(0, 42)}${alphabet[alphabet.indexOf(standard[42] ?? "A") ^ 1]}=`;
    expect(Buffer.from(nonStandard, "base64")).toEqual(Buffer.from(standard, "base64"));
    expect(
      await askImageLinks(uploadId, {
        attempt: 1,
        images: [{ pageIndex: 0, byteSize: 10, sha256: nonStandard, ...A4_IMAGE }],
      }),
    ).toEqual({
      status: 400,
      body: { error: "invalid", reason: "images.0.sha256: a SHA-256 in standard base64" },
    });

    const firstImage = imageOf("page 0");
    const secondImage = imageOf("page 1 described");
    const links = await askImageLinks(uploadId, {
      attempt: 1,
      images: [
        { pageIndex: 0, byteSize: firstImage.byteSize, sha256: firstImage.sha256, ...A4_IMAGE },
      ],
    });
    imageKey(uploadId, 1, 0, firstImage);
    const link = firstLink(links);
    expect(await putImage(link, imageOf("other bytes"))).not.toBe(200);
    // Same length, other bytes: only the pinned checksum can refuse these.
    const sameLength = { ...firstImage, bytes: firstImage.bytes.map((byte) => byte ^ 1) };
    expect(sameLength.bytes.byteLength).toBe(firstImage.byteSize);
    expect(await putImage(link, sameLength)).not.toBe(200);
    expect(await putImage(link, firstImage)).toBe(200);
    expect(await putImage(link, firstImage)).toBe(200);

    expect(
      await postPageResults(uploadId, {
        attempt: 1,
        pages: [
          readPage(0, firstQr, { image: firstImage }),
          readPage(1, secondQr, { fields: [], image: secondImage }),
          { pageIndex: 2, error: "The page could not be rendered" },
        ],
      }),
    ).toEqual({
      status: 200,
      body: {
        pages: [
          { pageIndex: 0, result: "stored", status: "MATCHED" },
          {
            pageIndex: 1,
            result: "invalid",
            reason: "no upload link was asked for this page's image",
          },
          { pageIndex: 2, result: "stored", status: "REJECTED" },
        ],
      },
    });
    expect(await reportStatus(uploadId, { attempt: 1, status: "PROCESSED" })).toEqual({
      status: 400,
      body: { error: "invalid", reason: "1 of the upload's 3 pages aren't posted yet" },
    });

    await askImageLinks(uploadId, {
      attempt: 1,
      images: [
        { pageIndex: 1, byteSize: secondImage.byteSize, sha256: secondImage.sha256, ...A4_IMAGE },
      ],
    });
    expect(
      resultsOf(
        await postPageResults(uploadId, {
          attempt: 1,
          pages: [readPage(1, secondQr, { fields: [], image: secondImage })],
        }),
      ),
    ).toEqual([{ pageIndex: 1, result: "invalid", reason: "the page's image isn't uploaded" }]);

    const uploadedSecondImage = await uploadPageImage(uploadId, 1, 1);
    expect(
      resultsOf(
        await postPageResults(uploadId, {
          attempt: 1,
          pages: [
            readPage(1, secondQr, { fields: [], image: uploadedSecondImage }),
            readPage(0, firstQr, { image: firstImage }),
          ],
        }),
      ),
    ).toEqual([
      { pageIndex: 1, result: "stored", status: "MATCHED" },
      { pageIndex: 0, result: "unchanged", status: "MATCHED" },
    ]);

    expect(await reportStatus(uploadId, { attempt: 1, status: "PROCESSED" })).toEqual({
      status: 200,
      body: { status: "PROCESSED", pageCount: 3 },
    });
    expect(
      await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 3 }),
    ).toEqual({ status: 200, body: { status: "PROCESSED", pageCount: 3 } });
    expect(
      resultsOf(await postPageResults(uploadId, { attempt: 1, pages: [readPage(0, firstQr)] })),
    ).toEqual([{ pageIndex: 0, result: "unchanged", status: "MATCHED" }]);
  });
});

describe("page images", () => {
  it("refuses an aligned page whose image isn't A4, and another description of an image", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 2 });

    const notA4 = await uploadPageImage(uploadId, 1, 0, { width: 1654, height: 2000 });
    const firstPage = readPage(0, copy.qrs[0] ?? "", { image: notA4 });
    expect(resultsOf(await postPageResults(uploadId, { attempt: 1, pages: [firstPage] }))).toEqual([
      {
        pageIndex: 0,
        result: "invalid",
        reason: "an aligned page's image must be A4: height ÷ width = 841.89 ÷ 595.28",
      },
    ]);
    const described = imageOf("described once");
    const describeImageAs = (height: number) =>
      askImageLinks(uploadId, {
        attempt: 1,
        images: [
          {
            pageIndex: 1,
            byteSize: described.byteSize,
            sha256: described.sha256,
            width: 1654,
            height,
          },
        ],
      });
    expect((await describeImageAs(2000)).status).toBe(200);
    expect((await describeImageAs(2000)).status).toBe(200);
    expect(await describeImageAs(A4_IMAGE.height)).toEqual({
      status: 400,
      body: {
        error: "invalid",
        reason: `page 1's image was described before as 1654×2000, ${described.byteSize} bytes`,
      },
    });
    const unaligned = { ...firstPage, aligned: false };
    expect(resultsOf(await postPageResults(uploadId, { attempt: 1, pages: [unaligned] }))).toEqual([
      { pageIndex: 0, result: "stored", status: "MATCHED" },
    ]);
  });

  it("stores a page with the image its post names, whichever was described last", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 2 });
    const linkFor = async (image: ReturnType<typeof imageOf>) =>
      firstLink(
        await askImageLinks(uploadId, {
          attempt: 1,
          images: [{ pageIndex: 1, byteSize: image.byteSize, sha256: image.sha256, ...A4_IMAGE }],
        }),
      );
    // Two workers on the same page: each describes and uploads its own image.
    const firstWorkers = imageOf("first worker");
    const secondWorkers = imageOf("second worker");
    const firstWorkersLink = await linkFor(firstWorkers);
    const secondWorkersLink = await linkFor(secondWorkers);
    const firstWorkersPage = readPage(1, copy.qrs[1] ?? "", {
      fields: [],
      image: firstWorkers,
    });

    expect(
      resultsOf(await postPageResults(uploadId, { attempt: 1, pages: [firstWorkersPage] })),
    ).toEqual([{ pageIndex: 1, result: "invalid", reason: "the page's image isn't uploaded" }]);
    const firstWorkersKey = imageKey(uploadId, 1, 1, firstWorkers);
    imageKey(uploadId, 1, 1, secondWorkers);
    expect(await putImage(firstWorkersLink, firstWorkers)).toBe(200);
    expect(await putImage(secondWorkersLink, secondWorkers)).toBe(200);
    expect(
      resultsOf(await postPageResults(uploadId, { attempt: 1, pages: [firstWorkersPage] })),
    ).toEqual([{ pageIndex: 1, result: "stored", status: "MATCHED" }]);

    const [stored] = await db
      .select({ imageS3Key: surveyScanPage.imageS3Key })
      .from(surveyScanPage)
      .where(and(eq(surveyScanPage.uploadId, uploadId), eq(surveyScanPage.pageIndex, 1)));
    expect(stored?.imageS3Key).toBe(firstWorkersKey);
    const storedImage = await headObject(firstWorkersKey, "survey-scans", { withChecksum: true });
    expect(storedImage.checksumSha256).toBe(firstWorkers.sha256);
  });

  it("takes no images or pages before PROCESSING has given the page count", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    const image = imageOf("too early");
    const reportFirst = {
      status: 400,
      body: { error: "invalid", reason: "report PROCESSING with pageCount first" },
    };
    expect(
      await askImageLinks(uploadId, {
        attempt: 1,
        images: [{ pageIndex: 0, byteSize: image.byteSize, sha256: image.sha256, ...A4_IMAGE }],
      }),
    ).toEqual(reportFirst);
    expect(
      await postPageResults(uploadId, {
        attempt: 1,
        pages: [
          { pageIndex: 7, error: "The page could not be rendered" },
          readPage(0, copy.qrs[0] ?? ""),
        ],
      }),
    ).toEqual(reportFirst);
  });

  it("answers a replay unchanged whatever image it names, and an index past the count with ingest's reason", async () => {
    const uploadId = await createUpload();
    await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 2 });
    const image = await uploadPageImage(uploadId, 1, 0);
    const noCodePage = { ...readPage(0, "", { image }), qrs: [] };
    expect(resultsOf(await postPageResults(uploadId, { attempt: 1, pages: [noCodePage] }))).toEqual(
      [{ pageIndex: 0, result: "stored", status: "UNIDENTIFIED" }],
    );
    expect(
      (
        await askImageLinks(uploadId, {
          attempt: 1,
          images: [
            {
              pageIndex: 0,
              byteSize: image.byteSize,
              sha256: image.sha256,
              width: 1654,
              height: 2000,
            },
          ],
        })
      ).status,
    ).toBe(400);
    const [storedDescription] = await db
      .select({ height: surveyScanPageImage.height })
      .from(surveyScanPageImage)
      .where(
        and(
          eq(surveyScanPageImage.uploadId, uploadId),
          eq(surveyScanPageImage.sha256, hexChecksum(image.sha256)),
        ),
      );
    expect(storedDescription?.height).toBe(A4_IMAGE.height);
    const { imageSha256: _named, ...namingNoImage } = noCodePage;
    expect(
      resultsOf(
        await postPageResults(uploadId, {
          attempt: 1,
          pages: [namingNoImage, { ...noCodePage, imageSha256: null }],
        }),
      ),
    ).toEqual([
      { pageIndex: 0, result: "unchanged", status: "UNIDENTIFIED" },
      { pageIndex: 0, result: "unchanged", status: "UNIDENTIFIED" },
    ]);
    expect(
      resultsOf(
        await postPageResults(uploadId, {
          attempt: 1,
          pages: [{ pageIndex: 1, error: "\u0000" }],
        }),
      ),
    ).toEqual([{ pageIndex: 1, result: "stored", status: "REJECTED" }]);
    const [unreadable] = await db
      .select({ postedResult: surveyScanPage.postedResult })
      .from(surveyScanPage)
      .where(and(eq(surveyScanPage.uploadId, uploadId), eq(surveyScanPage.pageIndex, 1)));
    expect(unreadable?.postedResult).toEqual({ pageIndex: 1, error: "no readable error text" });

    // A re-run (ENG-2641) moves the upload to the next attempt.
    await db
      .update(surveyUpload)
      .set({ attempt: 2, status: "PROCESSING" })
      .where(eq(surveyUpload.id, uploadId));
    await postPageResults(uploadId, {
      attempt: 2,
      pages: [{ pageIndex: 1, error: "The page could not be rendered" }],
    });
    expect((await reportStatus(uploadId, { attempt: 2, status: "PROCESSED" })).status).toBe(200);

    expect(
      resultsOf(
        await postPageResults(uploadId, {
          attempt: 2,
          pages: [noCodePage, { ...readPage(5, ""), qrs: [] }],
        }),
      ),
    ).toEqual([
      { pageIndex: 0, result: "unchanged", status: "UNIDENTIFIED" },
      { pageIndex: 5, result: "invalid", reason: "the upload has 2 pages" },
    ]);
  });

  it("answers a later posting of an index whose first posting failed its image check", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 1 });
    expect(
      resultsOf(
        await postPageResults(uploadId, { attempt: 1, pages: [readPage(0, copy.qrs[0] ?? "")] }),
      ),
    ).toEqual([
      { pageIndex: 0, result: "invalid", reason: "a page to store names its image in imageSha256" },
    ]);
    const firstPage = readPage(0, copy.qrs[0] ?? "", { image: imageOf("never described") });
    expect(
      resultsOf(
        await postPageResults(uploadId, {
          attempt: 1,
          pages: [firstPage, { pageIndex: 0, error: "The page could not be rendered" }, firstPage],
        }),
      ),
    ).toEqual([
      { pageIndex: 0, result: "invalid", reason: "no upload link was asked for this page's image" },
      {
        pageIndex: 0,
        result: "invalid",
        reason: "page 0 is posted twice in this post, with other content",
      },
      { pageIndex: 0, result: "invalid", reason: "no upload link was asked for this page's image" },
    ]);
    expect(
      await db.select().from(surveyScanPage).where(eq(surveyScanPage.uploadId, uploadId)),
    ).toEqual([]);
  });

  it("gives no link on a re-run for a placed page, which is posted again without an image", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    const [firstQr = ""] = copy.qrs;
    await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 2 });
    const image = await uploadPageImage(uploadId, 1, 0);
    await postPageResults(uploadId, { attempt: 1, pages: [readPage(0, firstQr, { image })] });

    // A re-run (ENG-2641) moves the upload to the next attempt and back to QUEUED.
    await db
      .update(surveyUpload)
      .set({ attempt: 2, status: "QUEUED" })
      .where(eq(surveyUpload.id, uploadId));
    const rerunImage = imageOf("re-run");
    const links = await askImageLinks(uploadId, {
      attempt: 2,
      images: [
        { pageIndex: 0, byteSize: rerunImage.byteSize, sha256: rerunImage.sha256, ...A4_IMAGE },
        { pageIndex: 1, byteSize: rerunImage.byteSize, sha256: rerunImage.sha256, ...A4_IMAGE },
      ],
    });
    expect(links.body).toEqual({
      images: [
        { pageIndex: 0, alreadyStored: true },
        {
          pageIndex: 1,
          uploadUrl: expect.any(String),
          uploadHeaders: {
            "Content-Type": "image/jpeg",
            "Cache-Control": expect.any(String),
            "x-amz-checksum-sha256": rerunImage.sha256,
          },
          expiresAt: expect.any(String),
        },
      ],
    });
    expect(
      await db
        .select({ pageIndex: surveyScanPageImage.pageIndex })
        .from(surveyScanPageImage)
        .where(and(eq(surveyScanPageImage.uploadId, uploadId), eq(surveyScanPageImage.attempt, 2))),
    ).toEqual([{ pageIndex: 1 }]);

    expect(
      resultsOf(
        await postPageResults(uploadId, {
          attempt: 2,
          pages: [{ ...readPage(0, firstQr), imageSha256: null }],
        }),
      ),
    ).toEqual([{ pageIndex: 0, result: "unchanged", status: "MATCHED" }]);
    expect(await postPageResults(uploadId, { attempt: 1, pages: [readPage(0, firstQr)] })).toEqual({
      status: 409,
      body: { error: "stale-attempt", currentAttempt: 2 },
    });
    expect(
      await reportStatus(uploadId, { attempt: 1, status: "FAILED", error: "old job" }),
    ).toEqual({ status: 409, body: { error: "stale-attempt", currentAttempt: 2 } });
  });
});

describe("upload state", () => {
  it("fails a running upload once, and ignores reports after", async () => {
    const uploadId = await createUpload();
    expect(
      await reportStatus(uploadId, {
        attempt: 1,
        status: "FAILED",
        error: "The PDF has no pages\u0000",
      }),
    ).toEqual({ status: 200, body: { status: "FAILED", pageCount: null } });
    expect(
      await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 2 }),
    ).toEqual({ status: 200, body: { status: "FAILED", pageCount: null } });
    const unreadableErrorUpload = await createUpload();
    expect(
      await reportStatus(unreadableErrorUpload, { attempt: 1, status: "FAILED", error: "\u0000" }),
    ).toEqual({ status: 200, body: { status: "FAILED", pageCount: null } });
    const [unreadableError] = await db
      .select({ error: surveyUpload.error })
      .from(surveyUpload)
      .where(eq(surveyUpload.id, unreadableErrorUpload));
    expect(unreadableError?.error).toBe("no readable error text");
    const [failed] = await db
      .select({ status: surveyUpload.status, error: surveyUpload.error })
      .from(surveyUpload)
      .where(eq(surveyUpload.id, uploadId));
    expect(failed).toEqual({ status: "FAILED", error: "The PDF has no pages" });
  });

  it("refuses PROCESSED before PROCESSING, naming the upload's status", async () => {
    expect(await reportStatus(await createUpload(), { attempt: 1, status: "PROCESSED" })).toEqual({
      status: 400,
      body: {
        error: "invalid",
        reason: "PROCESSED comes after PROCESSING, and the upload is QUEUED",
      },
    });
  });

  it("refuses work on an upload that isn't queued yet, or doesn't exist", async () => {
    const uploadId = await createUpload({ status: "UPLOADED" });
    expect(await call(postDownloadUrl, uploadId, "download-url")).toEqual({
      status: 409,
      body: { error: "upload-not-running", status: "UPLOADED" },
    });
    expect(
      await reportStatus(uploadId, { attempt: 1, status: "PROCESSING", pageCount: 1 }),
    ).toEqual({ status: 409, body: { error: "upload-not-running", status: "UPLOADED" } });
    expect(
      await reportStatus(objectId("surveyupload"), { attempt: 1, status: "PROCESSING" }),
    ).toEqual({ status: 404, body: { error: "upload-not-found" } });
  });
});
