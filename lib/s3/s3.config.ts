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
let bucketsCache: Record<S3Bucket, BucketConfig> | null = null;

export const getS3Credentials = (): S3Credentials => {
  if (credentialsCache) return credentialsCache;

  const config = {
    accessKeyId: requireEnv("S3_UPLOAD_KEY", env.S3_UPLOAD_KEY),
    secretAccessKey: requireEnv("S3_UPLOAD_SECRET", env.S3_UPLOAD_SECRET),
  };

  credentialsCache = config;
  return config;
};

export const getBuckets = (): Record<S3Bucket, BucketConfig> => {
  if (bucketsCache) return bucketsCache;

  const config = {
    recordings: {
      bucket: requireEnv("S3_RECORDINGS_BUCKET", env.S3_RECORDINGS_BUCKET),
      region: requireEnv("S3_RECORDINGS_REGION", env.S3_RECORDINGS_REGION),
    },
    "student-attendance": {
      bucket: requireEnv("S3_STUDENT_ATTENDANCE_BUCKET", env.S3_STUDENT_ATTENDANCE_BUCKET),
      region: requireEnv("S3_STUDENT_ATTENDANCE_REGION", env.S3_STUDENT_ATTENDANCE_REGION),
    },
  } satisfies Record<S3Bucket, BucketConfig>;

  bucketsCache = config;
  return config;
};
