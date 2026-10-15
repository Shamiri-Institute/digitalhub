import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { updateRecordingStatus } from "#/lib/recordings/status";
import type { JsonValue } from "#/db/schema";
import { RecordingStatusUpdateSchema, verifyRecordingsApiKey } from "#/lib/recordings-api";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/recordings/[id]/status
 *
 * Updates the status and feedback for a recording.
 * Called by the fidelity-inference service after processing.
 * Protected by API key authentication.
 */
export async function PATCH(
  request: NextRequest,
  props: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  if (!verifyRecordingsApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const recordingId = params.id;

  if (!recordingId) {
    return NextResponse.json({ error: "Recording ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validationResult = RecordingStatusUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: z.flattenError(validationResult.error),
        },
        { status: 400 },
      );
    }

    const { status, overallScore, fidelityFeedback, errorMessage } = validationResult.data;

    const result = await updateRecordingStatus(recordingId, status, {
      overallScore,
      fidelityFeedback: fidelityFeedback as JsonValue | undefined,
      errorMessage,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error updating recording status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
