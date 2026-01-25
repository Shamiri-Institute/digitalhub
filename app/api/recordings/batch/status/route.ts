import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { updateRecordingsStatusBatch } from "#/app/(platform)/sc/reporting/recordings/actions";
import { BatchRecordingStatusUpdateSchema, verifyRecordingsApiKey } from "#/lib/recordings-api";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/recordings/batch/status
 *
 * Updates the status and feedback for multiple recordings in a single atomic transaction.
 * Called by the fidelity-inference service after batch processing.
 * Protected by API key authentication.
 *
 * All updates succeed or all fail - if any recording ID is not found,
 * the entire batch is rolled back.
 */
export async function PATCH(request: NextRequest) {
  if (!verifyRecordingsApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = BatchRecordingStatusUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { recordings } = validationResult.data;

    const updates = recordings.map((recording) => ({
      id: recording.id,
      status: recording.status,
      overallScore: recording.overallScore,
      fidelityFeedback: recording.fidelityFeedback as Prisma.InputJsonValue | undefined,
      errorMessage: recording.errorMessage,
    }));

    const result = await updateRecordingsStatusBatch(updates);

    if (!result.success) {
      if (result.message.startsWith("Recordings not found:")) {
        return NextResponse.json(
          { success: false, message: result.message, updatedCount: 0 },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { success: false, message: result.message, updatedCount: 0 },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      updatedCount: result.updatedCount,
    });
  } catch (error) {
    console.error("Error updating recording statuses in batch:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
