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

export type S3Bucket = "uploads" | "recordings";

function getBucketName(bucket: S3Bucket): string {
  switch (bucket) {
    case "recordings":
      return env.S3_RECORDINGS_BUCKET;
    default:
      return env.S3_UPLOAD_BUCKET;
  }
}

function getBucketRegion(bucket: S3Bucket): string {
  switch (bucket) {
    case "recordings":
      return env.S3_RECORDINGS_REGION;
    default:
      return env.S3_UPLOAD_REGION;
  }
}

function createClient(bucket: S3Bucket): S3Client {
  return new S3Client({ region: getBucketRegion(bucket) });
}

export function getObject(input: Pick<GetObjectCommandInput, "Key">, bucket: S3Bucket = "uploads") {
  const s3Client = createClient(bucket);
  const command = new GetObjectCommand({
    ...input,
    Bucket: getBucketName(bucket),
  });
  return s3Client.send(command);
}

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
