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

const clients = new Map<S3Bucket, S3Client>();

export function getBucketName(bucket: S3Bucket): string {
  return requireBucket(bucket).bucket;
}

export function getBucketRegion(bucket: S3Bucket): string {
  return requireBucket(bucket).region;
}

function createClient(bucket: S3Bucket): S3Client {
  const existing = clients.get(bucket);
  if (existing) {
    return existing;
  }

  // Disable automatic CRC32 checksum calculation (SDK v3.729.0+ default)
  // to avoid the CRC32 multipart issue.
  // See: https://github.com/aws/aws-sdk-js-v3/issues/6810
  const client = new S3Client({
    region: requireBucket(bucket).region,
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

export interface PresignedUploadOptions {
  // Byte length of the body. When set, it is baked into the command and signed,
  // so S3 rejects a PUT whose body length differs from what was authorized.
  contentLength?: number;
  expiresIn?: number;
}

export async function getPresignedUploadUrl(
  key: string,
  bucket: S3Bucket,
  contentType: string,
  options: PresignedUploadOptions = {},
): Promise<{ url: string; bucket: string }> {
  const { contentLength, expiresIn = 3600 } = options;
  const bucketName = requireBucket(bucket).bucket;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    CacheControl: "max-age=630720000",
    // Create-only: fail the PUT if the object already exists, so a minted URL
    // cannot overwrite another object at the same key.
    IfNoneMatch: "*",
    ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
  });

  // Sign these headers so the client cannot swap content type, drop the
  // create-only guard, or change the body size after the URL is minted.
  const signableHeaders = new Set(["content-type", "if-none-match"]);
  if (contentLength !== undefined) {
    signableHeaders.add("content-length");
  }

  const url = await getSignedUrl(createClient(bucket), command, {
    expiresIn,
    signableHeaders,
  });
  return { url, bucket: bucketName };
}
