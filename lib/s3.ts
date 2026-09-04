import {
  DeleteObjectCommand,
  type DeleteObjectCommandInput,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "#/env";

export type S3Bucket = "uploads" | "recordings" | "student-attendance";

const BUCKETS: Record<S3Bucket, { bucket: string; region: string }> = {
  uploads: {
    bucket: env.S3_UPLOAD_BUCKET,
    region: env.S3_UPLOAD_REGION,
  },
  recordings: {
    bucket: env.S3_RECORDINGS_BUCKET,
    region: env.S3_RECORDINGS_REGION,
  },
  "student-attendance": {
    bucket: env.S3_STUDENT_ATTENDANCE_BUCKET,
    region: env.S3_STUDENT_ATTENDANCE_REGION,
  },
};

const clients = new Map<S3Bucket, S3Client>();

export function getBucketName(bucket: S3Bucket): string {
  return BUCKETS[bucket].bucket;
}

export function getBucketRegion(bucket: S3Bucket): string {
  return BUCKETS[bucket].region;
}

function createClient(bucket: S3Bucket): S3Client {
  const existing = clients.get(bucket);
  if (existing) {
    return existing;
  }

  // Checksum disabled to avoid the CRC32 multipart issue.
  // See: https://github.com/aws/aws-sdk-js-v3/issues/6810
  const client = new S3Client({
    region: getBucketRegion(bucket),
    credentials: {
      accessKeyId: env.S3_UPLOAD_KEY,
      secretAccessKey: env.S3_UPLOAD_SECRET,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  clients.set(bucket, client);
  return client;
}

export function getS3Client(bucket: S3Bucket): S3Client {
  return createClient(bucket);
}

export function deleteObject(
  input: Pick<DeleteObjectCommandInput, "Key">,
  bucket: S3Bucket = "uploads",
) {
  const s3Client = createClient(bucket);
  const command = new DeleteObjectCommand({
    ...input,
    Bucket: getBucketName(bucket),
  });
  return s3Client.send(command);
}

export async function getPresignedUrl(
  key: string,
  bucket: S3Bucket = "uploads",
  expiresIn = 3600,
): Promise<string> {
  const s3Client = createClient(bucket);
  const command = new GetObjectCommand({
    Bucket: getBucketName(bucket),
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}
