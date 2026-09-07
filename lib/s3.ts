import {
  DeleteObjectCommand,
  type DeleteObjectCommandInput,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "#/env";

export type S3Bucket = "recordings" | "student-attendance";

const BUCKETS: Record<S3Bucket, { bucket: string; region: string }> = {
  recordings: {
    bucket: env.S3_RECORDINGS_BUCKET,
    region: env.S3_RECORDINGS_REGION,
  },
  "student-attendance": {
    bucket: env.S3_STUDENT_ATTENDANCE_BUCKET,
    region: env.S3_STUDENT_ATTENDANCE_REGION,
  },
};

function requireBucket(bucket: S3Bucket) {
  const config = BUCKETS[bucket];
  if (!config) {
    throw new Error(
      `S3 bucket must be one of ${Object.keys(BUCKETS).join(", ")}; received ${String(bucket)}`,
    );
  }
  return config;
}

function createClient(bucket: S3Bucket): S3Client {
  return new S3Client({
    region: requireBucket(bucket).region,
    credentials: {
      accessKeyId: env.S3_UPLOAD_KEY,
      secretAccessKey: env.S3_UPLOAD_SECRET,
    },
  });
}

export function deleteObject(input: Pick<DeleteObjectCommandInput, "Key">, bucket: S3Bucket) {
  const s3Client = createClient(bucket);
  const command = new DeleteObjectCommand({
    ...input,
    Bucket: requireBucket(bucket).bucket,
  });
  return s3Client.send(command);
}

export async function getPresignedUrl(
  key: string,
  bucket: S3Bucket,
  expiresIn = 3600,
): Promise<string> {
  const s3Client = createClient(bucket);
  const command = new GetObjectCommand({
    Bucket: requireBucket(bucket).bucket,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}
