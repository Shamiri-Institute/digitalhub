import { randomUUID } from "node:crypto";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ImplementerRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ALLOWED_AUDIO_TYPES } from "#/app/(platform)/sc/reporting/recordings/schemas";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { getCachedSession } from "#/lib/auth-options";
import { getBucketName, getBucketRegion, getS3Client, type S3Bucket } from "#/lib/s3";

// Mint PutObject URLs only. proxy.ts skips /api/*, so auth must live here.

const S3_BUCKETS = [
  "uploads",
  "recordings",
  "student-attendance",
] as const satisfies readonly S3Bucket[];

const RequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string(),
  key: z.string().optional(),
  bucket: z.enum(S3_BUCKETS).default("uploads"),
});

const ALLOWED_CONTENT_TYPES = new Set<string>([
  "application/pdf",
  "application/octet-stream",
  "text/csv",
  "text/plain",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "application/json",
  "application/rtf",
  "text/rtf",
  "message/rfc822",
  "application/vnd.ms-outlook",
  "application/vnd.oasis.opendocument.text",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/gif",
  ...ALLOWED_AUDIO_TYPES,
]);

function isAllowedContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  return ALLOWED_CONTENT_TYPES.has(normalized);
}

function sanitizeFilename(filename: string): string {
  return path.posix.basename(filename).replace(/[^0-9a-zA-Z!_.*'()-]/g, "-");
}

function sanitizeObjectKey(key: string): string {
  return key.replace(/[^0-9a-zA-Z!_.*'()\-/]/g, "-");
}

function allowedPrefixesForBucket(bucket: S3Bucket): string[] {
  return [`${bucket}/`];
}

async function assertBucketRole(bucket: S3Bucket): Promise<void> {
  if (bucket === "recordings") {
    await requireAuthRole(ImplementerRole.SUPERVISOR);
    return;
  }
  if (bucket === "student-attendance") {
    await requireAuthRole(ImplementerRole.FELLOW);
  }
}

function resolveObjectKey(opts: {
  providedKey: string | undefined;
  filename: string;
  bucket: S3Bucket;
  userId: string;
}): string {
  const prefixes = allowedPrefixesForBucket(opts.bucket);

  if (!opts.providedKey) {
    if (opts.bucket !== "uploads") {
      throw new Error("Invalid key");
    }
    const filename = sanitizeFilename(opts.filename);
    if (!filename) {
      throw new Error("Invalid key");
    }
    // New objects only. Existing prod keys stay uploads/<uuid>/<file> — we do not rewrite them.
    return `${opts.bucket}/${opts.userId}/${randomUUID()}/${filename}`;
  }

  // Recordings / attendance pass a key they built. Do not take an arbitrary path.
  const key = sanitizeObjectKey(opts.providedKey);
  if (!key || key.startsWith("/") || key.includes("..") || key.includes("//")) {
    throw new Error("Invalid key");
  }
  if (!prefixes.some((prefix) => key.startsWith(prefix))) {
    throw new Error("Invalid key");
  }
  return key;
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    // Reject a session that has no user id. A missing session is already 401.
    const session = await getCachedSession();
    if (!session?.user?.id) {
      return jsonError(401, "Unauthorized");
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

    await assertBucketRole(bucket);

    if (!isAllowedContentType(contentType)) {
      return jsonError(400, "Unsupported content type");
    }

    const key = resolveObjectKey({
      providedKey,
      filename,
      bucket,
      userId: session.user.id,
    });

    const client = getS3Client(bucket);
    const bucketName = getBucketName(bucket);
    const region = getBucketRegion(bucket);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      CacheControl: "max-age=630720000",
      IfNoneMatch: "*",
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: 3600,
      signableHeaders: new Set(["content-type", "if-none-match"]),
    });

    return NextResponse.json({
      url,
      key,
      bucket: bucketName,
      region,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid key") {
        return jsonError(400, error.message);
      }
      // requireAuthRole throws these strings. Map them or role failures become 500.
      if (error.message === "The session has not been authenticated") {
        return jsonError(401, "Unauthorized");
      }
      if (
        error.message.startsWith("Forbidden") ||
        error.message.startsWith("No active implementer")
      ) {
        return jsonError(403, "Forbidden");
      }
    }
    console.error("Error generating presigned URL:", error);
    return jsonError(500, "Internal server error");
  }
}
