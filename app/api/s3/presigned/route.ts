import { NextResponse } from "next/server";
import { z } from "zod";

import { getCachedSession } from "#/lib/auth-options";
import { getPresignedUploadUrl } from "#/lib/s3";
import { S3_BUCKETS } from "#/lib/s3-buckets";

const RequestSchema = z.object({
  contentType: z.string(),
  key: z.string(),
  bucket: z.enum(S3_BUCKETS),
});

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
    const { url, bucket: bucketName } = await getPresignedUploadUrl(key, bucket, contentType);

    return NextResponse.json({ url, key, bucket: bucketName });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
