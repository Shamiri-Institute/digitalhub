// What the scan upload pages read. Like the print-run queries, each takes a SurveyViewer, so a hub
// coordinator only ever sees their hub's uploads.

import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { countOf } from "#/db/sql";
import { SurveyUploadStatus } from "#/db/enums";
import { surveyScanPage } from "#/db/schema";
import { implementerHubsInProject } from "#/lib/auth/require-hub-role";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { isStuck } from "#/lib/survey/pipeline-deadlines";
import type { PageOutcome } from "#/lib/survey/scan-upload-status";

/** The viewer's uploads, newest first. PENDING ones are left out: their file isn't checked yet. */
export async function fetchScanUploads(viewer: SurveyViewer) {
  return db.query.surveyUpload.findMany({
    where: (u, { and, eq, inArray, ne }) =>
      and(
        ne(u.status, SurveyUploadStatus.PENDING),
        viewer.kind === "hub"
          ? eq(u.hubId, viewer.hubId)
          : inArray(u.hubId, implementerHubsInProject(viewer.implementerId, viewer.projectId)),
      ),
    columns: {
      id: true,
      fileName: true,
      byteSize: true,
      pageCount: true,
      status: true,
      error: true,
      uploadedAt: true,
      attempt: true,
      notifyError: true,
      notifyNextAt: true,
    },
    extras: (u) => ({
      stuck: isStuck(u.status, u.stuckAfter).as("stuck"),
      // Pages within the current count: a re-run may count fewer than an earlier attempt posted.
      pagesPosted: countOf(
        surveyScanPage.uploadId,
        u.id,
        sql`"survey_scan_pages"."page_index" < ${u.pageCount}`,
      ).as("pages_posted"),
      // Counted over the same pages, by outcome and reason. The scan pages' columns are written raw,
      // as in countOf: drizzle would rewrite them to the uploads' alias.
      pageOutcomes: sql<PageOutcome[]>`(
        select coalesce(json_agg(json_build_object(
          'status', outcome.status, 'rejectedReason', outcome.rejected_reason, 'pages', outcome.pages
        )), '[]'::json)
        from (
          select status, rejected_reason, count(*)::int as pages
          from "survey_scan_pages"
          where "survey_scan_pages"."upload_id" = ${u.id}
            and "survey_scan_pages"."page_index" < ${u.pageCount}
          group by status, rejected_reason
        ) outcome
      )`.as("page_outcomes"),
    }),
    with: {
      hub: { columns: { hubName: true } },
      uploadedByUser: { columns: { name: true, email: true } },
    },
    orderBy: (u, { desc }) => [desc(u.uploadedAt), desc(u.id)],
  });
}

export type ScanUploads = Awaited<ReturnType<typeof fetchScanUploads>>;

/** The hubs a Research admin may upload scans for: their project's unarchived hubs. */
export async function fetchUploadHubs(viewer: Extract<SurveyViewer, { kind: "project" }>) {
  return db.query.hub.findMany({
    where: (h, { and, eq, isNull }) =>
      and(
        eq(h.implementerId, viewer.implementerId),
        eq(h.projectId, viewer.projectId),
        isNull(h.archivedAt),
      ),
    columns: { id: true, hubName: true },
    orderBy: (h, { asc }) => [asc(h.hubName), asc(h.id)],
  });
}

export type UploadHubs = Awaited<ReturnType<typeof fetchUploadHubs>>;
