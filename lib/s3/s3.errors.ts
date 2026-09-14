import { S3_BUCKETS, type S3Bucket } from "#/lib/s3/s3.types";

export class InvalidS3BucketError extends Error {
  constructor(bucket: S3Bucket) {
    super(`S3 bucket must be one of ${S3_BUCKETS.join(", ")}; received ${String(bucket)}`);
    this.name = "InvalidS3BucketError";
  }
}

export class MissingS3EnvError extends Error {
  constructor(variable: string) {
    super(`Missing required S3 environment variable: ${variable}`);
    this.name = "MissingS3EnvError";
  }
}

export class UploadAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadAuthorizationError";
  }
}
