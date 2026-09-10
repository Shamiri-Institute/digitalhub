import { ImplementerRole } from "@prisma/client";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ALLOWED_AUDIO_TYPES,
  MAX_FILE_SIZE,
} from "#/app/(platform)/sc/reporting/recordings/schemas";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { getCachedSession } from "#/lib/auth-options";
import { getPresignedUploadUrl } from "#/lib/s3";
import { S3_BUCKETS, type S3Bucket } from "#/lib/s3-buckets";

// Mint PutObject URLs only. proxy.ts skips /api/*, so auth must live here.

const RequestSchema = z.object({
  contentType: z.string(),
  key: z.string(),
  bucket: z.enum(S3_BUCKETS),
  size: z.number().int().positive(),
});

// Bucket-specific allowlists. A URL minted for one bucket cannot carry a
// content type that bucket should never store.
const ATTENDANCE_CONTENT_TYPES = new Set<string>(["application/pdf"]);
const RECORDINGS_CONTENT_TYPES = new Set<string>(ALLOWED_AUDIO_TYPES);

// Same 500 MB cap the recordings UI already enforces. Attendance has no
// separate client limit; a phone-photo PDF can exceed a tighter number.
const BUCKET_MAX_BYTES: Record<S3Bucket, number> = {
  recordings: MAX_FILE_SIZE,
  "student-attendance": MAX_FILE_SIZE,
};

function allowedContentTypes(bucket: S3Bucket): Set<string> {
  return bucket === "recordings" ? RECORDINGS_CONTENT_TYPES : ATTENDANCE_CONTENT_TYPES;
}

function isAllowedContentType(bucket: S3Bucket, contentType: string): boolean {
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  return allowedContentTypes(bucket).has(normalized);
}

function sanitizeObjectKey(key: string): string {
  return key.replace(/[^0-9a-zA-Z!_.*'()\-/]/g, "-");
}

// Callers pass a key they built. Do not accept an arbitrary path: no traversal,
// no empty segments, and it must stay under the bucket's own prefix.
function resolveObjectKey(providedKey: string, bucket: S3Bucket): string {
  const key = sanitizeObjectKey(providedKey);
  if (!key || key.startsWith("/") || key.includes("..") || key.includes("//")) {
    throw new Error("Invalid key");
  }
  if (!key.startsWith(`${bucket}/`)) {
    throw new Error("Invalid key");
  }
  return key;
}

async function assertBucketRole(bucket: S3Bucket): Promise<void> {
  if (bucket === "recordings") {
    await requireAuthRole(ImplementerRole.SUPERVISOR);
    return;
  }
  await requireAuthRole(ImplementerRole.FELLOW);
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    // Fail closed before parse/sign. Keep the 401 ahead of zod so an
    // unauthenticated caller never learns whether the body was valid.
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

    const { contentType, key: providedKey, bucket, size } = parsed.data;

    await assertBucketRole(bucket);

    if (!isAllowedContentType(bucket, contentType)) {
      return jsonError(400, "Unsupported content type");
    }

    if (size > BUCKET_MAX_BYTES[bucket]) {
      return jsonError(400, "File too large");
    }

    const key = resolveObjectKey(providedKey, bucket);

    const { url, bucket: bucketName } = await getPresignedUploadUrl(key, bucket, contentType, {
      contentLength: size,
    });

    return NextResponse.json({ url, key, bucket: bucketName });
  } catch (error) {
    // getCurrentUserSession() calls redirect() when there is no active
    // membership (#812/#814). Re-throw so Next can follow it instead of 500.
    if (isRedirectError(error)) {
      throw error;
    }
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
