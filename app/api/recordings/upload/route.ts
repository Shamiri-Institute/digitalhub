import { POST as BasePost } from "next-s3-upload/route";

import { env } from "#/env";

/**
 * POST /api/recordings/upload
 *
 * Handles file uploads to the dedicated recordings S3 bucket.
 * Uses next-s3-upload library configured with the recordings bucket.
 */
export const POST = BasePost.configure({
  bucket: env.S3_RECORDINGS_BUCKET,
  region: env.S3_RECORDINGS_REGION,
});
