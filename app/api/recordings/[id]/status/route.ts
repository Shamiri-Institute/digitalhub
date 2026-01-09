import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateRecordingStatus } from "#/app/(platform)/sc/recordings/actions";

export const dynamic = "force-dynamic";

/**
 * Verify the API key from the request headers
 */
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.RECORDINGS_API_KEY;

  if (!expectedKey) {
    console.error("RECORDINGS_API_KEY environment variable not set");
    return false;
  }

  return apiKey === expectedKey;
}

// Schema for validating the request body
const UpdateStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  overallScore: z.string().optional(),
  fidelityFeedback: z.unknown().optional(),
  errorMessage: z.string().optional(),
});

/**
 * PATCH /api/recordings/[id]/status
 *
 * Updates the status and feedback for a recording.
 * Called by the fidelity-inference service after processing.
 * Protected by API key authentication.
 *
 * Headers:
 *   x-api-key: API key for authentication
 *   Content-Type: application/json
 *
 * Body:
 *   {
 *     status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
 *     overallScore?: string,
 *     fidelityFeedback?: object,
 *     errorMessage?: string
 *   }
 *
 * Response:
 *   { success: boolean, message: string }
 */
export async function PATCH(
  request: NextRequest,
  props: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  // Verify API key
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const recordingId = params.id;

  if (!recordingId) {
    return NextResponse.json({ error: "Recording ID is required" }, { status: 400 });
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { status, overallScore, fidelityFeedback, errorMessage } = validationResult.data;

    // Update the recording status using the server action
    const result = await updateRecordingStatus(recordingId, status, {
      overallScore,
      fidelityFeedback: fidelityFeedback as Prisma.InputJsonValue | undefined,
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
