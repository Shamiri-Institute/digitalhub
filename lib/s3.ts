import {
  GetObjectCommand,
  GetObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "#/env";

const client = new S3Client({ region: env.AWS_REGION });

export async function getObject(input: Pick<GetObjectCommandInput, "Key">) {
  const command = new GetObjectCommand({
    ...input,
    Bucket: env.AWS_BUCKET_NAME,
  });
  const response = await client.send(command);
  return response;
}

export async function putObject(
  input: Pick<PutObjectCommandInput, "Body" | "Key">,
) {
  const command = new PutObjectCommand({
    ...input,
    Bucket: env.AWS_BUCKET_NAME,
  });
  return await client.send(command);
}
