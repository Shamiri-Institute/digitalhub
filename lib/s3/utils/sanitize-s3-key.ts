import { MAX_SEGMENT_LENGTH } from "#/lib/s3/s3.types";

export function sanitizeS3Key(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, MAX_SEGMENT_LENGTH);
}
