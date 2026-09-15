import { getBucket } from "#/lib/s3/s3.config";
import { InvalidS3BucketError } from "#/lib/s3/s3.errors";
import { type BucketConfig, S3_BUCKETS, type S3Bucket } from "#/lib/s3/s3.types";

export function requireBucket(bucket: S3Bucket): BucketConfig {
  if (!S3_BUCKETS.includes(bucket)) {
    throw new InvalidS3BucketError(bucket);
  }
  return getBucket(bucket);
}
