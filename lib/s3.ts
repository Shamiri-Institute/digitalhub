import {
  DeleteObjectCommand,
  type DeleteObjectCommandInput,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "#/env";

export type S3Bucket = "uploads" | "recordings" | "student-attendance";

const BUCKETS: Record<S3Bucket, { bucket: string; region: string }> = {
  uploads: {
    bucket: env.S3_UPLOAD_BUCKET,
    region: env.S3_UPLOAD_REGION,
  },
  recordings: {
    bucket: env.S3_RECORDINGS_BUCKET,
    region: env.S3_RECORDINGS_REGION,
  },
  "student-attendance": {
    bucket: env.S3_STUDENT_ATTENDANCE_BUCKET,
    region: env.S3_STUDENT_ATTENDANCE_REGION,
  },
};

function createClient(bucket: S3Bucket): S3Client {
  return new S3Client({
    region: BUCKETS[bucket].region,
    credentials: {
      accessKeyId: env.S3_UPLOAD_KEY,
      secretAccessKey: env.S3_UPLOAD_SECRET,
    },
  });
}

export function deleteObject(
  input: Pick<DeleteObjectCommandInput, "Key">,
  bucket: S3Bucket = "uploads",
) {
  const s3Client = createClient(bucket);
  const command = new DeleteObjectCommand({
    ...input,
    Bucket: BUCKETS[bucket].bucket,
  });
  return s3Client.send(command);
}

export async function getPresignedUrl(
  key: string,
  bucket: S3Bucket = "uploads",
  expiresIn = 3600,
): Promise<string> {
  const s3Client = createClient(bucket);
  const command = new GetObjectCommand({
    Bucket: BUCKETS[bucket].bucket,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}
