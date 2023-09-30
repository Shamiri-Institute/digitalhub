import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import { env } from "#/env";

const client = new S3Client({ region: process.env.AWS_S3_REGION });

export async function getObject(input: GetObjectCommandInput) {
  const command = new GetObjectCommand(input);
  const response = await client.send(command);
  return response;
}

export async function putObject(
  input: Pick<PutObjectCommandInput, "Body" | "Key">
) {
  const command = new PutObjectCommand({
    ...input,
    Bucket: env.AWS_BUCKET_NAME,
  });
  return await client.send(command);
}
