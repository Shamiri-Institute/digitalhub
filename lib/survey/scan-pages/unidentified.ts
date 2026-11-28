import "server-only";

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { SurveyScanPageStatus, SurveyScanRejection } from "#/db/enums";
import { hub, surveyScanPage, surveyUpload } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { pageImageOf } from "#/lib/survey/answer-review";
import { SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { uploadHubInScope } from "#/lib/survey/scan-upload-queries";
import { FINISHED_UPLOAD_STATUSES } from "#/lib/survey/scan-upload-status";
import { loadShownPeople } from "#/lib/survey/shown-person";

/** Pages listed at once, since each loads its scan. */
const SCAN_PAGES_PER_PAGE = 24;

export type UnidentifiedPagesFilters = { hubId?: string; uploadId?: string };

/** The pages ingest couldn't place: those waiting for a person, and those a person set aside. */
export type UnplacedPages = "unidentified" | "set-aside";

const UNPLACED = {
  unidentified: eq(surveyScanPage.status, SurveyScanPageStatus.UNIDENTIFIED),
  "set-aside": and(
    eq(surveyScanPage.status, SurveyScanPageStatus.REJECTED),
    eq(surveyScanPage.rejectedReason, SurveyScanRejection.NOT_A_SURVEY_PAGE),
  ),
} as const satisfies Record<UnplacedPages, unknown>;

// A page of an upload still being read may yet change, so it waits for the upload to finish.
function unplacedInScope(viewer: SurveyViewer, unplaced: UnplacedPages) {
  return and(
    UNPLACED[unplaced],
    inArray(surveyUpload.status, FINISHED_UPLOAD_STATUSES),
    uploadHubInScope(viewer, surveyUpload.hubId),
  );
}

/**
 * One page of the scanned pages of the viewer's uploads whose QR code couldn't be read, newest
 * first, each with its image. A page past the last shows the last. An upload filter outside the
 * viewer's scope is ignored, so `upload` is null.
 */
export function fetchUnidentifiedPages(
  viewer: SurveyViewer,
  filters: UnidentifiedPagesFilters,
  requestedPage: number,
) {
  return fetchUnplacedPages(viewer, "unidentified", filters, requestedPage);
}
export type UnidentifiedPages = Awaited<ReturnType<typeof fetchUnidentifiedPages>>;
export type UnidentifiedPage = UnidentifiedPages["pages"][number];

/** As fetchUnidentifiedPages, for the pages set aside as not survey pages, with who did it. */
export async function fetchSetAsidePages(
  viewer: SurveyViewer,
  filters: UnidentifiedPagesFilters,
  requestedPage: number,
) {
  const listed = await fetchUnplacedPages(viewer, "set-aside", filters, requestedPage);
  const events =
    listed.pages.length === 0
      ? []
      : await db.query.surveyAuditEvent.findMany({
          columns: { entityId: true, occurredAt: true },
          where: (event, { and, eq, inArray }) =>
            and(
              eq(event.entityType, SurveyAuditEntity.SCAN_PAGE),
              eq(event.action, SurveyAuditAction.SCAN_PAGE_SET_ASIDE),
              inArray(
                event.entityId,
                listed.pages.map((page) => page.id),
              ),
            ),
          orderBy: (event, { desc }) => desc(event.id),
          with: { actorUser: { columns: { id: true, name: true, email: true } } },
        });
  const shownPerson = await loadShownPeople(
    viewer,
    events.map((event) => event.actorUser),
  );
  // Newest first, so a page set aside again shows the last time.
  const setAsideByPage = new Map<string, (typeof events)[number]>();
  for (const event of events) {
    if (!setAsideByPage.has(event.entityId)) setAsideByPage.set(event.entityId, event);
  }
  return {
    ...listed,
    pages: listed.pages.map((page) => {
      const setAside = setAsideByPage.get(page.id);
      return {
        ...page,
        setAside: setAside
          ? { by: shownPerson(setAside.actorUser), at: setAside.occurredAt }
          : null,
      };
    }),
  };
}
export type SetAsidePages = Awaited<ReturnType<typeof fetchSetAsidePages>>;
export type SetAsidePage = SetAsidePages["pages"][number];

async function fetchUnplacedPages(
  viewer: SurveyViewer,
  unplaced: UnplacedPages,
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
    unplacedInScope(viewer, unplaced),
    filters.hubId ? eq(surveyUpload.hubId, filters.hubId) : undefined,
    upload ? eq(surveyScanPage.uploadId, upload.id) : undefined,
  );
  const [totals] = await db
    .select({ total: count() })
    .from(surveyScanPage)
    .innerJoin(surveyUpload, eq(surveyUpload.id, surveyScanPage.uploadId))
    .where(where);
  const total = totals?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / SCAN_PAGES_PER_PAGE));
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
    // A set-aside row changes only when it is set aside, so the page set aside last comes first.
    .orderBy(
      desc(unplaced === "set-aside" ? surveyScanPage.updatedAt : surveyScanPage.createdAt),
      desc(surveyScanPage.id),
    )
    .limit(SCAN_PAGES_PER_PAGE)
    .offset((page - 1) * SCAN_PAGES_PER_PAGE);
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

/** The hubs with pages of the list and how many each has, for a Research admin's filter. */
export async function fetchUnplacedPageHubs(viewer: SurveyViewer, unplaced: UnplacedPages) {
  return db
    .select({ id: hub.id, label: hub.hubName, count: count() })
    .from(surveyScanPage)
    .innerJoin(surveyUpload, eq(surveyUpload.id, surveyScanPage.uploadId))
    .innerJoin(hub, eq(hub.id, surveyUpload.hubId))
    .where(unplacedInScope(viewer, unplaced))
    .groupBy(hub.id, hub.hubName)
    .orderBy(asc(hub.hubName), asc(hub.id));
}
export type UnplacedPageHubs = Awaited<ReturnType<typeof fetchUnplacedPageHubs>>;
