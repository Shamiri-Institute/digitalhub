import {
  DeleteObjectCommand,
  type DeleteObjectCommandInput,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getS3Credentials } from "#/lib/s3/s3.config";
import type { PresignedUploadOptions, S3Bucket } from "#/lib/s3/s3.types";
import { requireBucket } from "#/lib/s3/utils/require-bucket";

const clients = new Map<S3Bucket, S3Client>();

function createClient(bucket: S3Bucket): S3Client {
  const existing = clients.get(bucket);
  if (existing) {
    return existing;
  }

  const client = new S3Client({
    region: requireBucket(bucket).region,
    credentials: getS3Credentials(),
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  clients.set(bucket, client);
  return client;
}

export function getS3Client(bucket: S3Bucket): S3Client {
  return createClient(bucket);
}

export function deleteObject(input: Pick<DeleteObjectCommandInput, "Key">, bucket: S3Bucket) {
  const s3Client = getS3Client(bucket);
  const command = new DeleteObjectCommand({
    ...input,
    Bucket: requireBucket(bucket).bucket,
  });
  return s3Client.send(command);
}

export async function headObject(
  key: string,
  bucket: S3Bucket,
): Promise<{ contentLength: number | undefined; contentType: string | undefined }> {
  const s3Client = getS3Client(bucket);
  const command = new HeadObjectCommand({
    Bucket: requireBucket(bucket).bucket,
    Key: key,
  });
  const response = await s3Client.send(command);
  return {
    contentLength: response.ContentLength,
    contentType: response.ContentType,
  };
}

export async function getPresignedUrl(
  key: string,
  bucket: S3Bucket,
  expiresIn = 3600,
): Promise<string> {
  const s3Client = getS3Client(bucket);
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
  options: PresignedUploadOptions = {},
): Promise<{ url: string; bucket: string }> {
  const { contentLength, expiresIn = 3600 } = options;
  const bucketName = requireBucket(bucket).bucket;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    CacheControl: "max-age=630720000",
    IfNoneMatch: "*",
    ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
  });

  const signableHeaders = new Set(["content-type", "if-none-match"]);
  if (contentLength !== undefined) {
    signableHeaders.add("content-length");
  }

  const url = await getSignedUrl(getS3Client(bucket), command, {
    expiresIn,
    signableHeaders,
  });
  return { url, bucket: bucketName };
}
