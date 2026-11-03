// Uploads of scanned questionnaires. The row is made before the bytes move: its unique hash is what
// refuses a second copy of a file, even when two people send it at once. It stays PENDING until
// finishScanUpload finds the object in S3 with that hash, so the pipeline only sees checked files.

import "server-only";

import { and, eq, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { SurveyAuditActor, SurveyUploadStatus } from "#/db/enums";
import { surveyUpload } from "#/db/schema";
import { SurveyError } from "#/lib/actions/survey/respond";
import { ForbiddenRoleError, NotFoundError } from "#/lib/auth/require-auth-role";
import { implementerHubsInProject } from "#/lib/auth/require-hub-role";
import { type HubSurveyScope, type SurveyViewer, surveyHubScope } from "#/lib/auth/survey-access";
import { objectId } from "#/lib/crypto";
import { getPresignedUploadUrl } from "#/lib/s3/s3.service";
import { PRESIGNED_UPLOAD_TTL_SECONDS } from "#/lib/s3/s3.types";
import {
  discardOrphanedUpload,
  type HeadOutcome,
  verifyUploadedObject,
} from "#/lib/s3/utils/verify-upload";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import type { ScanContentType } from "#/lib/survey/scan-files";

export type ScanFile = {
  fileName: string;
  contentType: ScanContentType;
  byteSize: number;
  /** Lowercase hex. */
  sha256: string;
};

export type StartedScanUpload =
  | {
      uploadId: string;
      stored: false;
      url: string;
      /** Every header the PUT must send; S3 refuses it if one differs. */
      headers: Record<string, string>;
    }
  /** An earlier try already put these bytes in S3, so the upload only needs finishing. */
  | { uploadId: string; stored: true };

/**
 * Holds the file's hash for this upload and presigns its PUT, or refuses a file that is already
 * stored or being uploaded by someone else. Starting the same file again resumes its upload.
 */
export async function startScanUpload(
  scope: HubSurveyScope,
  file: ScanFile,
): Promise<StartedScanUpload> {
  const uploadId = objectId("surveyupload");
  const [held] = await db
    .insert(surveyUpload)
    .values({
      id: uploadId,
      hubId: scope.hubId,
      uploadedBy: scope.userId,
      s3Key: `scans/${uploadId}`,
      ...file,
      // The database's clock, which the hour below is measured on.
      updatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: surveyUpload.sha256,
      set: {
        hubId: scope.hubId,
        uploadedBy: scope.userId,
        fileName: file.fileName,
        // Not the type: a resume keeps the one its object is stored with, so the two always agree.
        updatedAt: sql`now()`,
      },
      setWhere: and(
        eq(surveyUpload.status, SurveyUploadStatus.PENDING),
        // Its uploader resumes an unfinished upload at once; after an hour anyone from a hub of the
        // same implementer and project may take it over, never someone from another organisation.
        or(
          eq(surveyUpload.uploadedBy, scope.userId),
          and(
            lt(surveyUpload.updatedAt, sql`now() - interval '1 hour'`),
            inArray(
              surveyUpload.hubId,
              implementerHubsInProject(scope.implementerId, scope.projectId),
            ),
          ),
        ),
      ),
    })
    .returning({
      id: surveyUpload.id,
      s3Key: surveyUpload.s3Key,
      contentType: surveyUpload.contentType,
    });
  if (!held) {
    throw new SurveyError(await refusalFor(scope, file.sha256));
  }
  const heldFile = { ...file, contentType: held.contentType };
  if (held.id !== uploadId && (await holdsFile(held.s3Key, heldFile))) {
    return { uploadId: held.id, stored: true };
  }

  try {
    const { url, headers } = await getPresignedUploadUrl(
      held.s3Key,
      "survey-scans",
      heldFile.contentType,
      {
        contentLength: file.byteSize,
        expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
        checksumSha256: base64Checksum(file.sha256),
        // A resumed upload may PUT again over its first try. The checksum pins the bytes, so
        // nothing else can land there.
        ifNoneMatch: false,
      },
    );
    return { uploadId: held.id, stored: false, url, headers };
  } catch (error) {
    // Free the hash, so the file isn't held for an hour by an upload that never began. Only a row
    // this call made: a resumed one may already have its bytes in S3.
    if (held.id === uploadId) {
      await db
        .delete(surveyUpload)
        .where(
          and(eq(surveyUpload.id, held.id), eq(surveyUpload.status, SurveyUploadStatus.PENDING)),
        );
    }
    throw error;
  }
}

type StoredScanFile = Pick<ScanFile, "byteSize" | "sha256"> & { contentType: string };

/** The checksum S3 reports for a file of this hex SHA-256. */
function base64Checksum(sha256: string) {
  return Buffer.from(sha256, "hex").toString("base64");
}

function isStoredAs(stored: Extract<HeadOutcome, { status: "ok" }>, file: StoredScanFile) {
  return (
    stored.contentLength === file.byteSize &&
    stored.contentType === file.contentType &&
    stored.checksumSha256 === base64Checksum(file.sha256)
  );
}

/** Whether S3 already holds `file` at `key`, from an earlier PUT whose finish didn't happen. */
async function holdsFile(key: string, file: StoredScanFile) {
  const stored = await verifyUploadedObject(key, "survey-scans", { withChecksum: true });
  return stored.status === "ok" && isStoredAs(stored, file);
}

/**
 * Keeps an unfinished upload its uploader's while its bytes are still moving: the hour after which
 * anyone may take it over starts again.
 */
export async function keepScanUploadHeld(viewer: SurveyViewer, uploadId: string) {
  const [held] = await db
    .update(surveyUpload)
    .set({ updatedAt: sql`now()` })
    .where(
      and(
        eq(surveyUpload.id, uploadId),
        eq(surveyUpload.uploadedBy, viewer.userId),
        eq(surveyUpload.status, SurveyUploadStatus.PENDING),
      ),
    )
    .returning({ id: surveyUpload.id });
  if (!held) {
    throw new NotFoundError("Upload");
  }
}

/**
 * Gives up an unfinished upload, so the file is free for anyone at once, and deletes whatever an
 * earlier try put in S3. Giving up one that is finished, or no longer the caller's, does nothing.
 */
export async function releaseScanUpload(viewer: SurveyViewer, uploadId: string) {
  const released = await deleteUnfinishedUpload(viewer, uploadId);
  if (released) {
    await discardOrphanedUpload(released.s3Key, "survey-scans");
  }
}

async function deleteUnfinishedUpload(viewer: SurveyViewer, uploadId: string) {
  const [deleted] = await db
    .delete(surveyUpload)
    .where(
      and(
        eq(surveyUpload.id, uploadId),
        eq(surveyUpload.uploadedBy, viewer.userId),
        eq(surveyUpload.status, SurveyUploadStatus.PENDING),
      ),
    )
    .returning({ s3Key: surveyUpload.s3Key });
  return deleted;
}

/** Why a file can't be uploaded. Another hub's upload is not described, only said to exist. */
async function refusalFor(scope: HubSurveyScope, sha256: string) {
  const stored = await db.query.surveyUpload.findFirst({
    where: (u, { eq }) => eq(u.sha256, sha256),
    columns: { status: true, hubId: true, fileName: true },
  });
  if (!stored) {
    // Given up between the insert and this read.
    return "Something changed while starting this upload. Add the file again";
  }
  if (stored.status === SurveyUploadStatus.PENDING) {
    return "Someone else is uploading this file. Try again later";
  }
  if (stored.hubId === scope.hubId) {
    return `This file was already uploaded as ${stored.fileName}`;
  }
  return "This file has already been uploaded";
}

/**
 * Marks an upload UPLOADED once S3 holds its object with the size, type and hash it was started
 * with. The browser calls it after every PUT, failed ones too, since only S3 knows whether the
 * bytes arrived. Running it again for an upload that is already in is harmless. When S3 holds no
 * matching object the upload is given up, so the file can be sent again; any other refusal or
 * error keeps it, to resume without sending the file again.
 */
export async function finishScanUpload(viewer: SurveyViewer, uploadId: string) {
  const upload = await db.query.surveyUpload.findFirst({
    where: (u, { and, eq }) => and(eq(u.id, uploadId), eq(u.uploadedBy, viewer.userId)),
  });
  if (!upload) {
    throw new NotFoundError("Upload");
  }
  if (upload.status !== SurveyUploadStatus.PENDING) {
    return upload;
  }
  // The coordinator may have moved hub since starting, or the hub been archived.
  try {
    await surveyHubScope(viewer, upload.hubId);
  } catch (error) {
    if (error instanceof ForbiddenRoleError || error instanceof NotFoundError) {
      throw new SurveyError("You no longer upload for this file's hub, so it can't be finished");
    }
    throw error;
  }

  const stored = await verifyUploadedObject(upload.s3Key, "survey-scans", { withChecksum: true });
  if (stored.status === "not-found") {
    // Nothing is in S3 to delete, so only the row goes, freeing the file.
    await deleteUnfinishedUpload(viewer, upload.id);
    throw new SurveyError("The file did not reach storage. Upload it again");
  }
  if (stored.status === "error") {
    throw new Error(`Could not check the stored scan ${upload.s3Key}`);
  }
  if (stored.checksumSha256 === undefined) {
    // The PUT is signed with the checksum, so a stored object without one means the storage
    // doesn't report checksums, not that the bytes differ.
    throw new Error(`Storage reported no checksum for the scan ${upload.s3Key}`);
  }
  if (!isStoredAs(stored, upload)) {
    await releaseScanUpload(viewer, upload.id);
    throw new SurveyError("The stored file doesn't match the one you chose. Upload it again");
  }

  return db.transaction(async (tx) => {
    const [uploaded] = await tx
      .update(surveyUpload)
      .set({
        status: SurveyUploadStatus.UPLOADED,
        uploadedAt: new Date(),
        pageCount: upload.contentType === "application/pdf" ? null : 1,
      })
      .where(
        and(
          eq(surveyUpload.id, upload.id),
          eq(surveyUpload.status, SurveyUploadStatus.PENDING),
          // Not taken over by someone else since it was read above.
          eq(surveyUpload.uploadedBy, viewer.userId),
          eq(surveyUpload.hubId, upload.hubId),
        ),
      )
      .returning();
    if (!uploaded) {
      // A second finish got here first, or someone else has taken the upload over.
      const settled = await tx.query.surveyUpload.findFirst({
        where: (u, { and, eq, ne }) =>
          and(
            eq(u.id, upload.id),
            eq(u.uploadedBy, viewer.userId),
            ne(u.status, SurveyUploadStatus.PENDING),
          ),
      });
      if (!settled) {
        throw new NotFoundError("Upload");
      }
      return settled;
    }
    await recordSurveyEvent(tx, {
      actor: { kind: SurveyAuditActor.USER, userId: viewer.userId },
      entityType: SurveyAuditEntity.SCAN_UPLOAD,
      entityId: uploaded.id,
      action: SurveyAuditAction.SCAN_UPLOADED,
      after: {
        hubId: uploaded.hubId,
        fileName: uploaded.fileName,
        contentType: uploaded.contentType,
        byteSize: uploaded.byteSize,
        sha256: uploaded.sha256,
      },
    });
    return uploaded;
  });
}
