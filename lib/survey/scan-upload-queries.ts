// What the scan upload pages read. Like the print-run queries, each takes a SurveyViewer, so a hub
// coordinator only ever sees their hub's uploads.

import { db } from "#/db/client";
import { SurveyUploadStatus } from "#/db/enums";
import { hub } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";

/** The viewer's uploads, newest first. Unfinished ones are left out: no file is in S3 for them yet. */
export async function fetchScanUploads(viewer: SurveyViewer) {
  return db.query.surveyUpload.findMany({
    where: (u, { and, eq, inArray, ne }) =>
      and(
        ne(u.status, SurveyUploadStatus.PENDING),
        viewer.kind === "hub"
          ? eq(u.hubId, viewer.hubId)
          : inArray(
              u.hubId,
              db
                .select({ id: hub.id })
                .from(hub)
                .where(
                  and(
                    eq(hub.implementerId, viewer.implementerId),
                    eq(hub.projectId, viewer.projectId),
                  ),
                ),
            ),
      ),
    columns: {
      id: true,
      fileName: true,
      byteSize: true,
      pageCount: true,
      status: true,
      error: true,
      uploadedAt: true,
    },
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
