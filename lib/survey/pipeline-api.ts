// What the extraction pipeline's signed endpoints do (app/api/survey-pipeline). Shapes follow the
// SDH ↔ pipeline contract. Each takes the verified raw body and answers with a result the route
// turns into a response, so the routes stay thin.

import "server-only";

import { and, count, eq, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { z } from "zod";

import { db, type Transaction } from "#/db/client";
import {
  SurveyAuditActor,
  SurveyScanRejection,
  SurveyUploadStatus,
  SurveyVersionStatus,
} from "#/db/enums";
import { surveyScanPage, surveyScanPageImage, surveyUpload, surveyVersion } from "#/db/schema";
import { getPresignedUploadUrl, getPresignedUrl } from "#/lib/s3/s3.service";
import { hexChecksum } from "#/lib/s3/utils/checksum";
import { isStoredAs, verifyUploadedObject } from "#/lib/s3/utils/verify-upload";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import {
  type CheckedPageImage,
  ingestPages,
  type PageIngestResult,
  pageImageRef,
  UPLOAD_STATUSES_ACCEPTING_PAGES,
} from "#/lib/survey/ingest-pages";
import { rejectionOfPrintedPage } from "#/lib/survey/ingest-rules";
import { StuckAfter } from "#/lib/survey/pipeline-deadlines";
import { pageIdFromQrText } from "#/lib/survey/print-qr";
import { scanPageImageKey } from "#/lib/survey/scan-files";
import {
  MAX_PAGES_PER_POST,
  PagePostBodySchema,
  parsePostedPage,
  PipelineErrorText,
  Sha256Base64,
  storable,
  StoredPageIndex,
  zodIssueReason,
} from "#/lib/survey/scan-wire";

export type PipelineRefusal =
  | { refused: "upload-not-found" }
  | { refused: "version-not-found" }
  | { refused: "stale-attempt"; currentAttempt: number }
  | { refused: "upload-not-running"; status: SurveyUploadStatus }
  | { refused: "invalid"; reason: string };

export type PipelineResult<Body> = { ok: true; body: Body } | ({ ok: false } & PipelineRefusal);

const refuse = (refusal: PipelineRefusal): { ok: false } & PipelineRefusal => ({
  ok: false,
  ...refusal,
});

const DOWNLOAD_LINK_SECONDS = 2 * 60 * 60;
const PAGE_IMAGE_LINK_SECONDS = 15 * 60;
const MAX_LOOKUP_CODES = 500;
const MAX_PAGE_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_PAGE_IMAGE_PIXELS = 20_000;
const MAX_PAGE_COUNT = 10_000;

const RUNNING_STATUSES: ReadonlySet<SurveyUploadStatus> = new Set([
  SurveyUploadStatus.QUEUED,
  SurveyUploadStatus.PROCESSING,
]);
const FINAL_STATUSES: ReadonlySet<SurveyUploadStatus> = new Set([
  SurveyUploadStatus.PROCESSED,
  SurveyUploadStatus.FAILED,
]);

const Attempt = z.int().min(1);

function parseBody<Schema extends z.ZodType>(
  schema: Schema,
  rawBody: string,
): { ok: true; body: z.output<Schema> } | { ok: false; reason: string } {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "the body is not JSON" };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: zodIssueReason(parsed.error) };
  return { ok: true, body: parsed.data };
}

async function runningUpload(uploadId: string) {
  const upload = await db.query.surveyUpload.findFirst({
    where: (u, { eq }) => eq(u.id, uploadId),
    columns: { hubId: true, s3Key: true, status: true },
  });
  if (!upload) return refuse({ refused: "upload-not-found" });
  if (!RUNNING_STATUSES.has(upload.status)) {
    return refuse({ refused: "upload-not-running", status: upload.status });
  }
  return { ok: true as const, upload };
}

// Page images and results need a running upload whose page count the first PROCESSING has set.
function countedUpload(
  upload: { status: SurveyUploadStatus; pageCount: number | null },
  acceptedStatuses: ReadonlySet<SurveyUploadStatus>,
) {
  if (!acceptedStatuses.has(upload.status)) {
    return refuse({ refused: "upload-not-running", status: upload.status });
  }
  if (upload.pageCount === null) {
    return refuse({ refused: "invalid", reason: "report PROCESSING with pageCount first" });
  }
  return { ok: true as const, pageCount: upload.pageCount };
}

async function lockUpload(tx: Transaction, uploadId: string, attempt: number) {
  const [upload] = await tx
    .select({
      status: surveyUpload.status,
      attempt: surveyUpload.attempt,
      pageCount: surveyUpload.pageCount,
    })
    .from(surveyUpload)
    .where(eq(surveyUpload.id, uploadId))
    .for("update");
  if (!upload) return refuse({ refused: "upload-not-found" });
  if (upload.attempt !== attempt) {
    return refuse({ refused: "stale-attempt", currentAttempt: upload.attempt });
  }
  return { ok: true as const, upload };
}

export async function scanDownloadLink(
  uploadId: string,
): Promise<PipelineResult<{ downloadUrl: string; downloadUrlExpiresAt: string }>> {
  const uploadLookup = await runningUpload(uploadId);
  if (!uploadLookup.ok) return uploadLookup;
  const expiresAt = new Date(Date.now() + DOWNLOAD_LINK_SECONDS * 1000);
  const downloadUrl = await getPresignedUrl(
    uploadLookup.upload.s3Key,
    "survey-scans",
    DOWNLOAD_LINK_SECONDS,
  );
  return { ok: true, body: { downloadUrl, downloadUrlExpiresAt: expiresAt.toISOString() } };
}

const LookupBodySchema = z.object({
  qrs: z.array(z.string().max(512)).min(1).max(MAX_LOOKUP_CODES),
});

type LookedUpCode =
  | { qr: string; rejected: false; versionId: string; pageNumber: number }
  | { qr: string; rejected: true; versionId: null; pageNumber: null };

/**
 * Which version and page each QR code names. A code is rejected when it names no printed page, or
 * a page whose scan ingest would reject: another hub's copy, a void one or a verified one.
 */
export async function lookUpPageCodes(
  uploadId: string,
  rawBody: string,
): Promise<PipelineResult<{ pages: LookedUpCode[] }>> {
  const parsed = parseBody(LookupBodySchema, rawBody);
  if (!parsed.ok) return refuse({ refused: "invalid", reason: parsed.reason });
  const uploadLookup = await runningUpload(uploadId);
  if (!uploadLookup.ok) return uploadLookup;

  const pageIds = [
    ...new Set(parsed.body.qrs.map(pageIdOfCode).filter((pageId) => pageId !== undefined)),
  ];
  const printedPages =
    pageIds.length === 0
      ? []
      : await db.query.surveyQuestionnairePage.findMany({
          where: (page, { inArray }) => inArray(page.id, pageIds),
          orderBy: (page, { asc }) => asc(page.id),
          columns: { id: true, pageNumber: true },
          with: {
            questionnaire: {
              columns: { id: true, surveyId: true, versionId: true, hubId: true, status: true },
            },
          },
        });
  const printedPageById = new Map(
    printedPages.map(({ id, pageNumber, questionnaire }) => [
      id,
      { questionnairePageId: id, pageNumber, copy: questionnaire },
    ]),
  );

  const pages = parsed.body.qrs.map((qr): LookedUpCode => {
    const pageId = pageIdOfCode(qr);
    const page = pageId === undefined ? undefined : printedPageById.get(pageId);
    if (!page || rejectionOfPrintedPage(page, uploadLookup.upload.hubId)) {
      return { qr, rejected: true, versionId: null, pageNumber: null };
    }
    return { qr, rejected: false, versionId: page.copy.versionId, pageNumber: page.pageNumber };
  });
  return { ok: true, body: { pages } };
}

// As ingest reads a posted code, so a code the lookup rejects is one ingest won't match.
const pageIdOfCode = (qr: string) => pageIdFromQrText(storable(qr));

/** A published or retired version's frozen layout; copies of a retired version are still scanned. */
export async function versionLayout(versionId: string) {
  const [version] = await db
    .select({ layout: surveyVersion.layout })
    .from(surveyVersion)
    .where(
      and(
        eq(surveyVersion.id, versionId),
        ne(surveyVersion.status, SurveyVersionStatus.DRAFT),
        isNotNull(surveyVersion.layout),
      ),
    );
  return version?.layout ?? undefined;
}
export type VersionLayout = Awaited<ReturnType<typeof versionLayout>>;

const PageImagesBodySchema = z.object({
  attempt: Attempt,
  images: z
    .array(
      z.object({
        pageIndex: StoredPageIndex,
        byteSize: z.int().min(1).max(MAX_PAGE_IMAGE_BYTES),
        sha256: Sha256Base64.transform((base64) => ({ base64, hex: hexChecksum(base64) })),
        width: z.int().min(1).max(MAX_PAGE_IMAGE_PIXELS),
        height: z.int().min(1).max(MAX_PAGE_IMAGE_PIXELS),
      }),
    )
    .min(1)
    .max(MAX_PAGES_PER_POST)
    .refine((images) => new Set(images.map((image) => image.pageIndex)).size === images.length, {
      error: "a page index is listed twice",
    }),
});

type PageImageLink =
  | {
      pageIndex: number;
      uploadUrl: string;
      /** Every header the PUT must send; S3 refuses it if one differs. */
      uploadHeaders: Record<string, string>;
      expiresAt: string;
    }
  | { pageIndex: number; alreadyStored: true };

/**
 * Upload links for page images, each pinned to the size and checksum the pipeline gave. A page
 * already placed on a printed page gets none: a re-run can't replace it, so its image would be
 * orphaned. A page may be described again, with other bytes, so a pipeline can retry it. Each
 * image is kept under its own checksum, and a page post names the one it was read from.
 */
export async function pageImageLinks(
  uploadId: string,
  rawBody: string,
): Promise<PipelineResult<{ images: PageImageLink[] }>> {
  const parsed = parseBody(PageImagesBodySchema, rawBody);
  if (!parsed.ok) return refuse({ refused: "invalid", reason: parsed.reason });
  const { attempt, images } = parsed.body;

  const linkPlan = await db.transaction(async (tx) => {
    const locked = await lockUpload(tx, uploadId, attempt);
    if (!locked.ok) return locked;
    const { upload } = locked;
    const counted = countedUpload(upload, RUNNING_STATUSES);
    if (!counted.ok) return counted;
    const { pageCount } = counted;
    const pastEnd = images.find(({ pageIndex }) => pageIndex >= pageCount);
    if (pastEnd) {
      return refuse({
        refused: "invalid",
        reason: `page ${pastEnd.pageIndex} is past the upload's ${pageCount} pages`,
      });
    }

    const placedIndexes = await placedPageIndexes(
      tx,
      uploadId,
      images.map(({ pageIndex }) => pageIndex),
    );
    const imagesToLink = images.filter(({ pageIndex }) => !placedIndexes.has(pageIndex));
    const descriptions = imagesToLink.map(({ pageIndex, byteSize, sha256, width, height }) => ({
      uploadId,
      attempt,
      pageIndex,
      byteSize,
      sha256: sha256.hex,
      width,
      height,
    }));
    // A checksum names exact bytes, so a description of them can't change: the page post checks
    // the stored image against it.
    const earlierDescriptions = await describedImagesOf(tx, uploadId, attempt, descriptions);
    for (const description of descriptions) {
      const earlier = earlierDescriptions.get(
        pageImageRef(description.pageIndex, description.sha256),
      );
      if (
        earlier &&
        (earlier.byteSize !== description.byteSize ||
          earlier.width !== description.width ||
          earlier.height !== description.height)
      ) {
        return refuse({
          refused: "invalid",
          reason: `page ${description.pageIndex}'s image was described before as ${earlier.width}×${earlier.height}, ${earlier.byteSize} bytes`,
        });
      }
    }
    if (descriptions.length > 0) {
      await tx.insert(surveyScanPageImage).values(descriptions).onConflictDoNothing();
    }
    // Links granted are progress too: a large batch of images can take a while to send.
    if (upload.status === SurveyUploadStatus.PROCESSING) {
      await tx
        .update(surveyUpload)
        .set({ stuckAfter: StuckAfter.working })
        .where(eq(surveyUpload.id, uploadId));
    }
    return { ok: true as const, placedIndexes };
  });
  if (!linkPlan.ok) return linkPlan;

  const expiresAt = new Date(Date.now() + PAGE_IMAGE_LINK_SECONDS * 1000).toISOString();
  const links = await Promise.all(
    images.map(async ({ pageIndex, byteSize, sha256 }): Promise<PageImageLink> => {
      if (linkPlan.placedIndexes.has(pageIndex)) return { pageIndex, alreadyStored: true };
      const { url, headers } = await getPresignedUploadUrl(
        scanPageImageKey(uploadId, attempt, pageIndex, sha256.hex),
        "survey-scans",
        "image/jpeg",
        {
          contentLength: byteSize,
          expiresIn: PAGE_IMAGE_LINK_SECONDS,
          checksumSha256: sha256.base64,
          // A retry after a lost response PUTs the same bytes again; the checksum pins them.
          ifNoneMatch: false,
        },
      );
      return { pageIndex, uploadUrl: url, uploadHeaders: headers, expiresAt };
    }),
  );
  return { ok: true, body: { images: links } };
}

export type PlacedPageIndexes = Awaited<ReturnType<typeof placedPageIndexes>>;

async function placedPageIndexes(tx: Transaction, uploadId: string, pageIndexes: number[]) {
  if (pageIndexes.length === 0) return new Set<number>();
  const placed = await tx
    .select({ pageIndex: surveyScanPage.pageIndex })
    .from(surveyScanPage)
    .where(
      and(
        eq(surveyScanPage.uploadId, uploadId),
        inArray(surveyScanPage.pageIndex, pageIndexes),
        or(
          isNotNull(surveyScanPage.questionnairePageId),
          eq(surveyScanPage.rejectedReason, SurveyScanRejection.NOT_A_SURVEY_PAGE),
        ),
      ),
    );
  return new Set(placed.map(({ pageIndex }) => pageIndex));
}

const PostPagesBodySchema = PagePostBodySchema.extend({ attempt: Attempt });
const IMAGE_CHECKS_AT_ONCE = 25;

/**
 * Stores what the pipeline read on some pages. Each image a read page names is checked in S3
 * first, outside the transaction, against what its link was asked for; ingestPages then stores a
 * page only with a good image, and answers it invalid otherwise.
 */
export async function postPages(
  uploadId: string,
  rawBody: string,
): Promise<PipelineResult<{ pages: PageIngestResult[] }>> {
  const parsed = parseBody(PostPagesBodySchema, rawBody);
  if (!parsed.ok) return refuse({ refused: "invalid", reason: parsed.reason });
  const { attempt, pages } = parsed.body;

  const upload = await db.query.surveyUpload.findFirst({
    where: (u, { eq }) => eq(u.id, uploadId),
    columns: { attempt: true, status: true, pageCount: true },
  });
  if (!upload) return refuse({ refused: "upload-not-found" });
  if (upload.attempt !== attempt) {
    return refuse({ refused: "stale-attempt", currentAttempt: upload.attempt });
  }
  // ingestPages can't check a page index against a count it doesn't have yet.
  const counted = countedUpload(upload, UPLOAD_STATUSES_ACCEPTING_PAGES);
  if (!counted.ok) return counted;
  const { pageCount } = counted;

  // Once processed a post only replays, so no image it names can be stored.
  const namedImages = new Map<string, { pageIndex: number; sha256: string }>();
  if (upload.status !== SurveyUploadStatus.PROCESSED) {
    for (const posted of pages) {
      const parsing = parsePostedPage(posted);
      if (!parsing.ok || parsing.parsed.kind !== "read") continue;
      const { pageIndex, imageSha256 } = parsing.parsed.page;
      if (imageSha256 === undefined || pageIndex >= pageCount) continue;
      const sha256Hex = hexChecksum(imageSha256);
      namedImages.set(pageImageRef(pageIndex, sha256Hex), { pageIndex, sha256: sha256Hex });
    }
  }
  const describedImageByRef = await describedImagesOf(db, uploadId, attempt, [
    ...namedImages.values(),
  ]);
  const pageImages = new Map(
    await mapAtMost(IMAGE_CHECKS_AT_ONCE, [...namedImages.keys()], async (ref) => {
      const checked = await checkPageImage(uploadId, attempt, describedImageByRef.get(ref));
      return [ref, checked] as const;
    }),
  );

  const ingested = await db.transaction(async (tx) => {
    const result = await ingestPages(tx, { uploadId, attempt, pageImages }, pages);
    if (result.kind === "ingested" && result.pages.some((page) => page.result === "stored")) {
      // A stored page is progress, as a heartbeat is; a replay or a refused page isn't.
      await tx
        .update(surveyUpload)
        .set({ stuckAfter: StuckAfter.working })
        .where(
          and(
            eq(surveyUpload.id, uploadId),
            eq(surveyUpload.status, SurveyUploadStatus.PROCESSING),
          ),
        );
    }
    return result;
  });
  switch (ingested.kind) {
    case "upload-not-found":
      return refuse({ refused: "upload-not-found" });
    case "stale-attempt":
      return refuse({ refused: "stale-attempt", currentAttempt: ingested.currentAttempt });
    case "upload-not-accepting":
      return refuse({ refused: "upload-not-running", status: ingested.status });
    case "ingested":
      return { ok: true, body: { pages: ingested.pages } };
  }
}

// A rolling pool: as one call finishes the next starts, so a slow one holds up only its own slot.
async function mapAtMost<Item, Result>(
  limit: number,
  items: readonly Item[],
  map: (item: Item) => Promise<Result>,
) {
  const results: Result[] = [];
  let nextIndex = 0;
  let failed = false;
  const takeNext = async () => {
    /* oxlint-disable eslint/no-await-in-loop -- each worker runs its share in turn */
    for (let index = nextIndex++; index < items.length && !failed; index = nextIndex++) {
      try {
        results[index] = await map(items[index] as Item);
      } catch (error) {
        // The caller has its answer; the other workers stop instead of calling on.
        failed = true;
        throw error;
      }
    }
    /* oxlint-enable eslint/no-await-in-loop */
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, takeNext));
  return results;
}

type DescribedImage = typeof surveyScanPageImage.$inferSelect;
export type DescribedImages = Awaited<ReturnType<typeof describedImagesOf>>;

async function describedImagesOf(
  executor: Transaction | typeof db,
  uploadId: string,
  attempt: number,
  images: { pageIndex: number; sha256: string }[],
) {
  if (images.length === 0) return new Map<string, DescribedImage>();
  const describedImages = await executor
    .select()
    .from(surveyScanPageImage)
    .where(
      and(
        eq(surveyScanPageImage.uploadId, uploadId),
        eq(surveyScanPageImage.attempt, attempt),
        or(
          ...images.map(({ pageIndex, sha256 }) =>
            and(
              eq(surveyScanPageImage.pageIndex, pageIndex),
              eq(surveyScanPageImage.sha256, sha256),
            ),
          ),
        ),
      ),
    );
  return new Map(
    describedImages.map((image) => [pageImageRef(image.pageIndex, image.sha256), image]),
  );
}

async function checkPageImage(
  uploadId: string,
  attempt: number,
  described: DescribedImage | undefined,
): Promise<CheckedPageImage> {
  if (!described) return { ok: false, reason: "no upload link was asked for this page's image" };
  const key = scanPageImageKey(uploadId, attempt, described.pageIndex, described.sha256);
  const imageHead = await verifyUploadedObject(key, "survey-scans", { withChecksum: true });
  if (imageHead.status === "not-found") {
    return { ok: false, reason: "the page's image isn't uploaded" };
  }
  if (imageHead.status === "error") throw new Error(`Could not check the page image ${key}`);
  if (imageHead.checksumSha256 === undefined) {
    // The PUT is signed with the checksum, so its absence means the storage doesn't report one.
    throw new Error(`Storage reported no checksum for the page image ${key}`);
  }
  if (!isStoredAs(imageHead, { ...described, contentType: "image/jpeg" })) {
    return { ok: false, reason: "the uploaded image isn't the one its link was asked for" };
  }
  return { ok: true, key, width: described.width, height: described.height };
}

const StatusReportSchema = z.discriminatedUnion("status", [
  z.object({
    attempt: Attempt,
    status: z.literal(SurveyUploadStatus.PROCESSING),
    pageCount: z.int().min(1).max(MAX_PAGE_COUNT).optional(),
  }),
  z.object({ attempt: Attempt, status: z.literal(SurveyUploadStatus.PROCESSED) }),
  z.object({
    attempt: Attempt,
    status: z.literal(SurveyUploadStatus.FAILED),
    // Stored as it can be, as a failed page's error is: no NUL or broken Unicode.
    error: PipelineErrorText,
  }),
]);

type UploadState = { status: SurveyUploadStatus; pageCount: number | null };

/**
 * Moves an upload forward on the pipeline's report. Status only moves forward, so a late or
 * repeated report about a finished upload changes nothing and answers its current state. The first
 * PROCESSING sets the page count, which can't change after; later ones are heartbeats. PROCESSED
 * needs every page from 0 to pageCount − 1 stored, by this attempt or an earlier one.
 */
export async function reportUploadStatus(
  uploadId: string,
  rawBody: string,
): Promise<PipelineResult<UploadState>> {
  const parsed = parseBody(StatusReportSchema, rawBody);
  if (!parsed.ok) return refuse({ refused: "invalid", reason: parsed.reason });
  const report = parsed.body;

  return db.transaction(async (tx) => {
    const locked = await lockUpload(tx, uploadId, report.attempt);
    if (!locked.ok) return locked;
    const { upload } = locked;
    const stateBeforeReport = { status: upload.status, pageCount: upload.pageCount };
    if (FINAL_STATUSES.has(upload.status)) return { ok: true, body: stateBeforeReport };
    if (!RUNNING_STATUSES.has(upload.status)) {
      return refuse({ refused: "upload-not-running", status: upload.status });
    }

    let changes: PgUpdateSetSource<typeof surveyUpload>;
    switch (report.status) {
      case SurveyUploadStatus.PROCESSING: {
        if (upload.pageCount === null && report.pageCount === undefined) {
          return refuse({ refused: "invalid", reason: "the first PROCESSING carries pageCount" });
        }
        if (
          upload.pageCount !== null &&
          report.pageCount !== undefined &&
          report.pageCount !== upload.pageCount
        ) {
          return refuse({
            refused: "invalid",
            reason: `pageCount is ${upload.pageCount} and can't change`,
          });
        }
        changes = {
          status: SurveyUploadStatus.PROCESSING,
          pageCount: upload.pageCount ?? report.pageCount,
          // The database's clock, as stuck_after is.
          lastHeartbeatAt: sql`now()`,
          stuckAfter: StuckAfter.working,
          // A notification retry still pending is moot once the pipeline is working on the job.
          notifyNextAt: null,
          notifyError: null,
        };
        break;
      }
      case SurveyUploadStatus.PROCESSED: {
        if (upload.status !== SurveyUploadStatus.PROCESSING || upload.pageCount === null) {
          return refuse({
            refused: "invalid",
            reason: `PROCESSED comes after PROCESSING, and the upload is ${upload.status}`,
          });
        }
        const [storedPages] = await tx
          .select({ count: count() })
          .from(surveyScanPage)
          .where(
            and(
              eq(surveyScanPage.uploadId, uploadId),
              lt(surveyScanPage.pageIndex, upload.pageCount),
            ),
          );
        const missingPages = upload.pageCount - (storedPages?.count ?? 0);
        if (missingPages > 0) {
          return refuse({
            refused: "invalid",
            reason: `${missingPages} of the upload's ${upload.pageCount} pages aren't posted yet`,
          });
        }
        changes = { status: SurveyUploadStatus.PROCESSED, stuckAfter: null };
        break;
      }
      case SurveyUploadStatus.FAILED:
        changes = { status: SurveyUploadStatus.FAILED, error: report.error, stuckAfter: null };
        break;
    }

    const [updated] = await tx
      .update(surveyUpload)
      .set(changes)
      .where(
        and(eq(surveyUpload.id, uploadId), inArray(surveyUpload.status, [...RUNNING_STATUSES])),
      )
      .returning({ status: surveyUpload.status, pageCount: surveyUpload.pageCount });
    if (!updated) throw new Error(`Upload ${uploadId} changed while locked`);
    if (updated.status !== upload.status) {
      await recordSurveyEvent(tx, {
        actor: { kind: SurveyAuditActor.PIPELINE },
        entityType: SurveyAuditEntity.SCAN_UPLOAD,
        entityId: uploadId,
        action: SurveyAuditAction.SCAN_STATUS_REPORTED,
        before: stateBeforeReport,
        after: {
          ...updated,
          attempt: report.attempt,
          ...(report.status === SurveyUploadStatus.FAILED && { error: report.error }),
        },
      });
    }
    return { ok: true, body: updated };
  });
}
