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

const client = new S3Client({ region: env.AWS_REGION });

export function getObject(input: Pick<GetObjectCommandInput, "Key">) {
  const command = new GetObjectCommand({
    ...input,
    Bucket: env.S3_UPLOAD_BUCKET,
  });
  return client.send(command);
}

export function putObject(input: Pick<PutObjectCommandInput, "Body" | "Key">) {
  const command = new PutObjectCommand({
    ...input,
    Bucket: env.S3_UPLOAD_BUCKET,
  });
  return client.send(command);
}

export function deleteObject(input: Pick<DeleteObjectCommandInput, "Key">) {
  const command = new DeleteObjectCommand({
    ...input,
    Bucket: env.S3_UPLOAD_BUCKET,
  });
  return client.send(command);
}
