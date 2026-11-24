import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { SurveyAuditActor, SurveyUploadStatus } from "#/db/enums";
import { surveyUpload } from "#/db/schema";
import { SurveyError } from "#/lib/actions/survey/respond";
import type { AdminScope } from "#/lib/auth/admin-access";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { implementerHubsInProject } from "#/lib/auth/require-hub-role";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { isStuck } from "#/lib/survey/pipeline-deadlines";
import { startingPageCount } from "#/lib/survey/scan-files";

/**
 * Runs a failed or stuck upload again, as its next attempt. It goes back to UPLOADED, so the next
 * notification run queues it and tells the pipeline; from then on the old attempt's page images,
 * page posts and status reports are refused as stale (a download link or a lookup carries no
 * attempt, so the old job finds out on its next of those). Pages an earlier attempt placed on a
 * printed page stay as they are.
 */
export async function rerunScanUpload(scope: AdminScope, uploadId: string) {
  return db.transaction(async (tx) => {
    const [upload] = await tx
      .select({
        status: surveyUpload.status,
        attempt: surveyUpload.attempt,
        contentType: surveyUpload.contentType,
        fileName: surveyUpload.fileName,
        stuck: isStuck(surveyUpload.status, surveyUpload.stuckAfter),
      })
      .from(surveyUpload)
      .where(
        and(
          eq(surveyUpload.id, uploadId),
          inArray(
            surveyUpload.hubId,
            implementerHubsInProject(scope.implementerId, scope.projectId),
          ),
        ),
      )
      .for("update");
    if (!upload) {
      throw new NotFoundError("Upload");
    }
    if (upload.status !== SurveyUploadStatus.FAILED && !upload.stuck) {
      throw new SurveyError("Only a failed or stuck upload can be run again");
    }

    const [rerun] = await tx
      .update(surveyUpload)
      .set({
        status: SurveyUploadStatus.UPLOADED,
        attempt: upload.attempt + 1,
        // Counted again, so a re-run can recover from a count an earlier attempt got wrong.
        pageCount: startingPageCount(upload.contentType),
        error: null,
        lastHeartbeatAt: null,
        notifyTries: 0,
        notifyNextAt: null,
        notifiedAt: null,
        notifyError: null,
        stuckAfter: null,
      })
      .where(and(eq(surveyUpload.id, uploadId), eq(surveyUpload.attempt, upload.attempt)))
      .returning({ attempt: surveyUpload.attempt });
    if (!rerun) {
      throw new Error(`Upload ${uploadId} changed while locked`);
    }
    await recordSurveyEvent(tx, {
      actor: { kind: SurveyAuditActor.USER, userId: scope.userId },
      entityType: SurveyAuditEntity.SCAN_UPLOAD,
      entityId: uploadId,
      action: SurveyAuditAction.SCAN_RERUN,
      before: { status: upload.status, attempt: upload.attempt, stuck: upload.stuck },
      after: { status: SurveyUploadStatus.UPLOADED, attempt: rerun.attempt },
    });
    return { fileName: upload.fileName, attempt: rerun.attempt };
  });
}
