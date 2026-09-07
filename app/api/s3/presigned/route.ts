import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "#/env";
import { getCachedSession } from "#/lib/auth-options";

const RequestSchema = z.object({
  contentType: z.string(),
  key: z.string(),
  bucket: z.enum(["recordings", "student-attendance"]),
});

function getBucketConfig(bucket: "recordings" | "student-attendance") {
  if (bucket === "recordings") {
    return {
      bucketName: env.S3_RECORDINGS_BUCKET,
      region: env.S3_RECORDINGS_REGION,
      accessKeyId: env.S3_UPLOAD_KEY,
      secretAccessKey: env.S3_UPLOAD_SECRET,
    };
  }
  if (bucket === "student-attendance") {
    return {
      bucketName: env.S3_STUDENT_ATTENDANCE_BUCKET,
      region: env.S3_STUDENT_ATTENDANCE_REGION,
      accessKeyId: env.S3_UPLOAD_KEY,
      secretAccessKey: env.S3_UPLOAD_SECRET,
    };
  }
  throw new Error(`Unknown S3 bucket: ${String(bucket)}`);
}

export async function POST(request: Request) {
  try {
    const session = await getCachedSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { contentType, key, bucket } = parsed.data;
    const { bucketName, region, accessKeyId, secretAccessKey } = getBucketConfig(bucket);

    // Create S3 client with checksum disabled to avoid the CRC32 multipart issue
    // See: https://github.com/aws/aws-sdk-js-v3/issues/6810
    const client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Disable automatic CRC32 checksum calculation (SDK v3.729.0+ default)
      requestChecksumCalculation: "WHEN_REQUIRED",
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      CacheControl: "max-age=630720000",
    });

    // Generate presigned URL valid for 1 hour
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });

    return NextResponse.json({
      url,
      key,
      bucket: bucketName,
      region,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
