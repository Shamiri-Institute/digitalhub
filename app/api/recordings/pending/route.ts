import { type NextRequest, NextResponse } from "next/server";

import { db } from "#/db/client";
import { verifyRecordingsApiKey } from "#/lib/recordings-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/recordings/pending
 *
 * Returns all recordings with PENDING status for processing by the fidelity-inference service.
 * Protected by API key authentication.
 *
 * Headers:
 *   x-api-key: API key for authentication
 *
 * Query params:
 *   limit: Maximum number of recordings to return (default: 50, max: 100)
 *
 * Response:
 *   { recordings: Array<{ id, s3Key, fileName, fellowId, schoolId, groupId, sessionId, createdAt }> }
 */
export async function GET(request: NextRequest) {
  // Verify API key
  if (!verifyRecordingsApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Number.parseInt(limitParam ?? "50", 10) || 50, 100);

    // Fetch pending recordings
    const recordings = await db.query.sessionRecording.findMany({
      where: (r, { and, eq, isNull }) => and(eq(r.status, "PENDING"), isNull(r.archivedAt)),
      columns: {
        id: true,
        s3Key: true,
        fileName: true,
        originalFileName: true,
        contentType: true,
        fileSize: true,
        fellowId: true,
        schoolId: true,
        groupId: true,
        sessionId: true,
        createdAt: true,
        retryCount: true,
      },
      with: {
        fellow: { columns: { fellowName: true } },
        school: { columns: { schoolName: true } },
        group: { columns: { groupName: true } },
        session: {
          columns: { sessionType: true, sessionDate: true },
          with: { session: { columns: { sessionName: true } } },
        },
      },
      orderBy: (r, { asc }) => asc(r.createdAt), // Process oldest first
      limit,
    });

    // Transform response to flat structure
    const response = recordings.map((rec) => ({
      id: rec.id,
      s3Key: rec.s3Key,
      fileName: rec.fileName,
      originalFileName: rec.originalFileName,
      contentType: rec.contentType,
      fileSize: rec.fileSize,
      fellowId: rec.fellowId,
      schoolId: rec.schoolId,
      groupId: rec.groupId,
      sessionId: rec.sessionId,
      createdAt: rec.createdAt.toISOString(),
      retryCount: rec.retryCount,
      fellowName: rec.fellow.fellowName,
      schoolName: rec.school.schoolName,
      groupName: rec.group.groupName,
      sessionType: rec.session.sessionType,
      sessionDate: rec.session.sessionDate?.toISOString() ?? null,
      sessionName: rec.session.session?.sessionName ?? rec.session.sessionType,
    }));

    return NextResponse.json({
      recordings: response,
      count: response.length,
    });
  } catch (error) {
    console.error("Error fetching pending recordings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
