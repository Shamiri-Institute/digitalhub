import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NextResponse } from "next/server";

import { getCachedSession } from "#/lib/auth-options";
import { issuePresignedUploadUrl } from "#/lib/s3/auth/issue-presigned-upload-url";
import { UploadAuthorizationError } from "#/lib/s3/s3.errors";
import { S3ApiRequestSchema } from "#/lib/s3/s3.types";

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    const session = await getCachedSession();
    if (!session?.user?.id) {
      return jsonError(401, "Unauthorized");
    }

    const parsed = S3ApiRequestSchema.omit({ uploaderId: true }).safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(400, "Invalid request body");
    }

    const issued = await issuePresignedUploadUrl({
      ...parsed.data,
      uploaderId: session.user.id,
    });

    return NextResponse.json({
      url: issued.url,
      key: issued.key,
      bucket: issued.s3Bucket,
      ...(issued.bucket === "recordings" ? { recordingId: issued.recordingId } : {}),
      fileName: issued.fileName,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof UploadAuthorizationError) {
      return jsonError(error.message === "Forbidden" ? 403 : 400, error.message);
    }
    console.error("Error generating presigned URL:", error);
    return jsonError(500, "Internal server error");
  }
}
