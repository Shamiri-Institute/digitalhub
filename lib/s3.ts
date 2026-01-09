import {
  DeleteObjectCommand,
  type DeleteObjectCommandInput,
  GetObjectCommand,
  type GetObjectCommandInput,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "#/env";

/**
 * Available S3 buckets in the application
 */
export type S3Bucket = "uploads" | "recordings";

/**
 * Get the bucket name for the specified bucket type
 */
function getBucketName(bucket: S3Bucket): string {
  switch (bucket) {
    case "recordings":
      return env.S3_RECORDINGS_BUCKET;
    default:
      return env.S3_UPLOAD_BUCKET;
  }
}

/**
 * Get the region for the specified bucket type
 */
function getBucketRegion(bucket: S3Bucket): string {
  switch (bucket) {
    case "recordings":
      return env.S3_RECORDINGS_REGION;
    default:
      return env.S3_UPLOAD_REGION;
  }
}

/**
 * Create an S3 client for the specified bucket
 */
function createClient(bucket: S3Bucket): S3Client {
  return new S3Client({ region: getBucketRegion(bucket) });
}

/**
 * Get an object from S3
 * @param input - Object key
 * @param bucket - Target bucket (defaults to 'uploads')
 */
export function getObject(input: Pick<GetObjectCommandInput, "Key">, bucket: S3Bucket = "uploads") {
  const s3Client = createClient(bucket);
  const command = new GetObjectCommand({
    ...input,
    Bucket: getBucketName(bucket),
  });
  return s3Client.send(command);
}

/**
 * Put an object to S3
 * @param input - Object body and key
 * @param bucket - Target bucket (defaults to 'uploads')
 */
export function putObject(
  input: Pick<PutObjectCommandInput, "Body" | "Key" | "ContentType">,
  bucket: S3Bucket = "uploads",
) {
  const s3Client = createClient(bucket);
  const command = new PutObjectCommand({
    ...input,
    Bucket: getBucketName(bucket),
  });
  return s3Client.send(command);
}

/**
 * Delete an object from S3
 * @param input - Object key
 * @param bucket - Target bucket (defaults to 'uploads')
 */
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
