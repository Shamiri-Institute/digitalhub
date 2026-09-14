import { getBuckets } from "#/lib/s3/s3.config";
import { InvalidS3BucketError, MissingS3EnvError } from "#/lib/s3/s3.errors";
import type { BucketConfig, S3Bucket } from "#/lib/s3/s3.types";

export function requireBucket(bucket: S3Bucket): BucketConfig {
  const config = getBuckets()[bucket];
  if (!config) {
    throw new InvalidS3BucketError(bucket);
  }
  if (!config.bucket) {
    throw new MissingS3EnvError(`bucket name for "${bucket}"`);
  }
  return config;
}

export function getBucketName(bucket: S3Bucket): string {
  return requireBucket(bucket).bucket;
}

export function getBucketRegion(bucket: S3Bucket): string {
  return requireBucket(bucket).region;
}
