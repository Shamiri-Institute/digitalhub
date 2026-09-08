import {
  DeleteObjectCommand,
  type DeleteObjectCommandInput,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "#/env";
import { S3_BUCKETS, type S3Bucket } from "#/lib/s3-buckets";

// Every name in S3_BUCKETS must have an entry here, and nothing else may.
// Add a bucket by extending S3_BUCKETS; the compiler then points here.
const BUCKETS = {
  recordings: {
    bucket: env.S3_RECORDINGS_BUCKET,
    region: env.S3_RECORDINGS_REGION,
  },
  "student-attendance": {
    bucket: env.S3_STUDENT_ATTENDANCE_BUCKET,
    region: env.S3_STUDENT_ATTENDANCE_REGION,
  },
} satisfies Record<S3Bucket, { bucket: string; region: string }>;

function requireBucket(bucket: S3Bucket) {
  const config = BUCKETS[bucket];
  if (!config) {
    throw new Error(
      `S3 bucket must be one of ${S3_BUCKETS.join(", ")}; received ${String(bucket)}`,
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
    // Disable automatic CRC32 checksum calculation (SDK v3.729.0+ default)
    // See: https://github.com/aws/aws-sdk-js-v3/issues/6810
    requestChecksumCalculation: "WHEN_REQUIRED",
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

export async function getPresignedUploadUrl(
  key: string,
  bucket: S3Bucket,
  contentType: string,
  expiresIn = 3600,
): Promise<{ url: string; bucket: string }> {
  const bucketName = requireBucket(bucket).bucket;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    CacheControl: "max-age=630720000",
  });
  const url = await getSignedUrl(createClient(bucket), command, { expiresIn });
  return { url, bucket: bucketName };
}
