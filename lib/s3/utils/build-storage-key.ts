import { objectId } from "#/lib/crypto";
import { type StorageKeyParams, StorageKeySchema } from "#/lib/s3/s3.types";
import { sanitizeS3Key } from "#/lib/s3/utils/sanitize-s3-key";

export function buildStorageKey(params: StorageKeyParams): string {
  const { segments, fileName } = StorageKeySchema.parse(params);

  const hasExtension = /\.[^/.]+$/.test(fileName);
  const extension = hasExtension ? sanitizeS3Key(fileName.split(".").pop() ?? "") : "";
  const baseName = sanitizeS3Key(fileName.replace(/\.[^/.]+$/, ""));
  const suffix = sanitizeS3Key(objectId("key").split("_").at(-1) ?? "").slice(-10);

  const finalFileName = extension ? `${baseName}_${suffix}.${extension}` : `${baseName}_${suffix}`;

  const sanitizedSegments = segments.map(sanitizeS3Key).filter(Boolean);

  return [...sanitizedSegments, finalFileName].join("/");
}
