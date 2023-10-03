import { NextResponse, type NextRequest } from "next/server";

import { getObject } from "#/lib/s3";
import { db } from "#/lib/db";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      fileIdHash: string;
      fileName: string;
    };
  }
) {
  try {
    const fileId = `file_${params.fileIdHash}`;
    const file = await db.file.findUniqueOrThrow({
      where: { id: fileId },
    });

    if (params.fileName !== file.fileName) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/api/files/${params.fileIdHash}/${file.fileName}`;
      return NextResponse.redirect(redirectUrl);
    }

    const objectResponse = await getObject({ Key: file.key });
    const imageBody = objectResponse.Body?.transformToWebStream();
    if (!imageBody) {
      return NextResponse.json({
        status: 500,
        error: "Image download failed.",
      });
    }

    if (imageBody instanceof ReadableStream) {
      return new Response(imageBody);
    } else {
      return NextResponse.json({
        status: 500,
        error: "Image download failed.",
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 404,
      error: "File not found.",
    });
  }
}
