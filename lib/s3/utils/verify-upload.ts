import "server-only";

import { deleteObject, headObject } from "#/lib/s3/s3.service";
import type { S3Bucket } from "#/lib/s3/s3.types";
import { type UploadClaim, verifyUploadToken } from "#/lib/s3/utils/upload-token";

export async function discardOrphanedUpload(key: string, bucket: S3Bucket): Promise<void> {
  await deleteObject({ Key: key }, bucket).catch((error) => {
    console.error("Failed to delete orphaned upload:", bucket, key, error);
  });
}

export function verifyUploadClaim(
  token: string,
  expected: { bucket: S3Bucket; uploaderId: string; key: string },
): UploadClaim | null {
  let claim: UploadClaim;
  try {
    claim = verifyUploadToken(token);
  } catch {
    return null;
  }

  if (
    claim.bucket !== expected.bucket ||
    claim.uploaderId !== expected.uploaderId ||
    claim.key !== expected.key
  ) {
    return null;
  }

  return claim;
}

export type HeadOutcome =
  | { status: "ok"; contentLength: number; contentType: string | undefined }
  | { status: "not-found" }
  | { status: "error" };

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: unknown }).name;
  const httpStatus = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
    ?.httpStatusCode;
  return name === "NotFound" || name === "NoSuchKey" || httpStatus === 404;
}

export async function verifyUploadedObject(key: string, bucket: S3Bucket): Promise<HeadOutcome> {
  try {
    const head = await headObject(key, bucket);
    if (head.contentLength === undefined) {
      return { status: "error" };
    }
    return { status: "ok", contentLength: head.contentLength, contentType: head.contentType };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { status: "not-found" };
    }
    return { status: "error" };
  }
}
