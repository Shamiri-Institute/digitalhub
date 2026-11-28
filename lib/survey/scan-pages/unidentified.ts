import "server-only";

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { SurveyScanPageStatus } from "#/db/enums";
import { hub, surveyScanPage, surveyUpload } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { pageImageOf } from "#/lib/survey/answer-review";
import { uploadHubInScope } from "#/lib/survey/scan-upload-queries";
import { FINISHED_UPLOAD_STATUSES } from "#/lib/survey/scan-upload-status";

/** Pages listed at once, since each loads its scan. */
const UNIDENTIFIED_PAGES_PER_PAGE = 24;

export type UnidentifiedPagesFilters = { hubId?: string; uploadId?: string };

// A page of an upload still being read may yet change, so it waits for the upload to finish.
function unidentifiedInScope(viewer: SurveyViewer) {
  return and(
    eq(surveyScanPage.status, SurveyScanPageStatus.UNIDENTIFIED),
    inArray(surveyUpload.status, FINISHED_UPLOAD_STATUSES),
    uploadHubInScope(viewer, surveyUpload.hubId),
  );
}

/**
 * One page of the scanned pages of the viewer's uploads whose QR code couldn't be read, newest
 * first, each with its image. A page past the last shows the last. An upload filter outside the
 * viewer's scope is ignored, so `upload` is null.
 */
export async function fetchUnidentifiedPages(
  viewer: SurveyViewer,
  filters: UnidentifiedPagesFilters,
  requestedPage: number,
) {
  const [upload] = filters.uploadId
    ? await db
        .select({ id: surveyUpload.id, fileName: surveyUpload.fileName })
        .from(surveyUpload)
        .where(
          and(eq(surveyUpload.id, filters.uploadId), uploadHubInScope(viewer, surveyUpload.hubId)),
        )
    : [];
  const where = and(
    unidentifiedInScope(viewer),
    filters.hubId ? eq(surveyUpload.hubId, filters.hubId) : undefined,
    upload ? eq(surveyScanPage.uploadId, upload.id) : undefined,
  );
  const [totals] = await db
    .select({ total: count() })
    .from(surveyScanPage)
    .innerJoin(surveyUpload, eq(surveyUpload.id, surveyScanPage.uploadId))
    .where(where);
  const total = totals?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / UNIDENTIFIED_PAGES_PER_PAGE));
  const page = Math.min(requestedPage, pageCount);
  const scans = await db
    .select({
      id: surveyScanPage.id,
      pageIndex: surveyScanPage.pageIndex,
      receivedAt: surveyScanPage.createdAt,
      imageS3Key: surveyScanPage.imageS3Key,
      aligned: surveyScanPage.aligned,
      fileName: surveyUpload.fileName,
      hubName: hub.hubName,
    })
    .from(surveyScanPage)
    .innerJoin(surveyUpload, eq(surveyUpload.id, surveyScanPage.uploadId))
    .innerJoin(hub, eq(hub.id, surveyUpload.hubId))
    .where(where)
    .orderBy(desc(surveyScanPage.createdAt), desc(surveyScanPage.id))
    .limit(UNIDENTIFIED_PAGES_PER_PAGE)
    .offset((page - 1) * UNIDENTIFIED_PAGES_PER_PAGE);
  return {
    upload: upload ?? null,
    total,
    page,
    pageCount,
    pages: await Promise.all(
      scans.map(async ({ imageS3Key, aligned, ...scan }) => ({
        ...scan,
        image: await pageImageOf({ imageS3Key, aligned }),
      })),
    ),
  };
}
export type UnidentifiedPages = Awaited<ReturnType<typeof fetchUnidentifiedPages>>;
export type UnidentifiedPage = UnidentifiedPages["pages"][number];

/** The hubs with unidentified pages and how many each has, for a Research admin's filter. */
export async function fetchUnidentifiedPageHubs(viewer: SurveyViewer) {
  return db
    .select({ id: hub.id, label: hub.hubName, count: count() })
    .from(surveyScanPage)
    .innerJoin(surveyUpload, eq(surveyUpload.id, surveyScanPage.uploadId))
    .innerJoin(hub, eq(hub.id, surveyUpload.hubId))
    .where(unidentifiedInScope(viewer))
    .groupBy(hub.id, hub.hubName)
    .orderBy(asc(hub.hubName), asc(hub.id));
}
export type UnidentifiedPageHubs = Awaited<ReturnType<typeof fetchUnidentifiedPageHubs>>;
