import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "#/env";

const RequestSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  key: z.string().optional(),
  bucket: z.enum(["uploads", "recordings"]).default("uploads"),
});

function sanitizeKey(key: string): string {
  return key.replace(/[^0-9a-zA-Z!_\\.\\*'\\(\\)\\\-/]/g, "-");
}

function getBucketConfig(bucket: "uploads" | "recordings") {
  if (bucket === "recordings") {
    return {
      bucketName: env.S3_RECORDINGS_BUCKET,
      region: env.S3_RECORDINGS_REGION,
      accessKeyId: env.S3_UPLOAD_KEY,
      secretAccessKey: env.S3_UPLOAD_SECRET,
    };
  }
  return {
    bucketName: env.S3_UPLOAD_BUCKET,
    region: env.S3_UPLOAD_REGION,
    accessKeyId: env.S3_UPLOAD_KEY,
    secretAccessKey: env.S3_UPLOAD_SECRET,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { filename, contentType, key: providedKey, bucket } = parsed.data;
    const { bucketName, region, accessKeyId, secretAccessKey } = getBucketConfig(bucket);

    // Use provided key directly if given (for recordings with custom paths),
    // otherwise generate a default key
    const key = providedKey ?? `uploads/${randomUUID()}/${sanitizeKey(filename)}`;

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
