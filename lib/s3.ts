import {
  GetObjectCommand,
  type GetObjectCommandInput,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "#/env";

const client = new S3Client({ region: env.AWS_REGION });

export async function getObject(input: Pick<GetObjectCommandInput, "Key">) {
  const command = new GetObjectCommand({
    ...input,
    Bucket: env.S3_UPLOAD_BUCKET,
  });
  const response = await client.send(command);
  return response;
}

export async function putObject(
  input: Pick<PutObjectCommandInput, "Body" | "Key">,
) {
  const command = new PutObjectCommand({
    ...input,
    Bucket: env.S3_UPLOAD_BUCKET,
  });
  return await client.send(command);
}
