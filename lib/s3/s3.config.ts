import { env } from "#/env";
import { MissingS3EnvError } from "#/lib/s3/s3.errors";
import type { BucketConfig, S3Bucket, S3Credentials } from "#/lib/s3/s3.types";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new MissingS3EnvError(name);
  }
  return value;
}

let credentialsCache: S3Credentials | null = null;
const bucketCache = new Map<S3Bucket, BucketConfig>();

const BUCKET_ENV: Record<
  S3Bucket,
  { bucketVar: string; bucketValue: string; regionVar: string; regionValue: string }
> = {
  recordings: {
    bucketVar: "S3_RECORDINGS_BUCKET",
    bucketValue: env.S3_RECORDINGS_BUCKET,
    regionVar: "S3_RECORDINGS_REGION",
    regionValue: env.S3_RECORDINGS_REGION,
  },
  "student-attendance": {
    bucketVar: "S3_STUDENT_ATTENDANCE_BUCKET",
    bucketValue: env.S3_STUDENT_ATTENDANCE_BUCKET,
    regionVar: "S3_STUDENT_ATTENDANCE_REGION",
    regionValue: env.S3_STUDENT_ATTENDANCE_REGION,
  },
};

export const getS3Credentials = (): S3Credentials => {
  if (credentialsCache) return credentialsCache;

  const config = {
    accessKeyId: requireEnv("S3_UPLOAD_KEY", env.S3_UPLOAD_KEY),
    secretAccessKey: requireEnv("S3_UPLOAD_SECRET", env.S3_UPLOAD_SECRET),
  };

  credentialsCache = config;
  return config;
};

export const getBucket = (bucket: S3Bucket): BucketConfig => {
  const cached = bucketCache.get(bucket);
  if (cached) return cached;

  const entry = BUCKET_ENV[bucket];
  const config: BucketConfig = {
    bucket: requireEnv(entry.bucketVar, entry.bucketValue),
    region: requireEnv(entry.regionVar, entry.regionValue),
  };

  bucketCache.set(bucket, config);
  return config;
};
