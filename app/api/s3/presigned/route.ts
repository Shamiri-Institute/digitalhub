import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "#/env";
import { getCachedSession } from "#/lib/auth-options";

// Mint PutObject URLs only. proxy.ts skips /api/*, so auth must live here.

const RequestSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  key: z.string().optional(),
  bucket: z.enum(["uploads", "recordings", "student-attendance"]).default("uploads"),
});

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/octet-stream",
  "text/csv",
  "text/plain",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// Prefixes cover receipts (image/*) and session recordings (audio/*, video/mp4).
// Exact types above; reject text/html and scripts if S3 later serves this Content-Type.
const ALLOWED_CONTENT_TYPE_PREFIXES = ["image/", "audio/", "video/"] as const;

function isAllowedContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (ALLOWED_CONTENT_TYPES.has(normalized)) {
    return true;
  }
  return ALLOWED_CONTENT_TYPE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function sanitizeKey(key: string): string {
  return key.replace(/[^0-9a-zA-Z!_\\.\\*'\\(\\)\\\-/]/g, "-");
}

function allowedPrefixesForBucket(bucket: "uploads" | "recordings" | "student-attendance"): string[] {
  if (bucket === "recordings") {
    return ["recordings/"];
  }
  if (bucket === "student-attendance") {
    return ["student-attendance/", "uploads/"];
  }
  return ["uploads/"];
}

function resolveObjectKey(opts: {
  providedKey: string | undefined;
  filename: string;
  bucket: "uploads" | "recordings" | "student-attendance";
  userId: string;
}): { key: string } | { error: string } {
  const prefixes = allowedPrefixesForBucket(opts.bucket);

  if (!opts.providedKey) {
    // New objects only. Existing prod keys stay uploads/<uuid>/<file> — we do not rewrite them.
    return {
      key: `uploads/${opts.userId}/${randomUUID()}/${sanitizeKey(opts.filename)}`,
    };
  }

  // Recordings / attendance pass a key they built. Do not take an arbitrary path.
  const key = sanitizeKey(opts.providedKey);
  if (!key || key.startsWith("/") || key.includes("..") || key.includes("//")) {
    return { error: "Invalid key" };
  }
  if (!prefixes.some((prefix) => key.startsWith(prefix))) {
    return { error: "Invalid key" };
  }
  return { key };
}

function getBucketConfig(bucket: "uploads" | "recordings" | "student-attendance") {
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
  return {
    bucketName: env.S3_UPLOAD_BUCKET,
    region: env.S3_UPLOAD_REGION,
    accessKeyId: env.S3_UPLOAD_KEY,
    secretAccessKey: env.S3_UPLOAD_SECRET,
  };
}

export async function POST(request: Request) {
  try {
    // Fail closed before parse/sign. An unauthenticated 200 was alllowed  here .
    const session = await getCachedSession();
    if (!session?.user?.id) {

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

    const { filename, contentType, key: providedKey, bucket } = parsed.data;

    if (!isAllowedContentType(contentType)) {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }

    const resolved = resolveObjectKey({
      providedKey,
      filename,
      bucket,
      userId: session.user.id,
    });
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }

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
      Key: resolved.key,
      ContentType: contentType,
      CacheControl: "max-age=630720000",
    });

    // Generate presigned URL valid for 1 hour
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });

    return NextResponse.json({
      url,
      key: resolved.key,
      bucket: bucketName,
      region,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
