import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import {
  type BatchRecordingUpdate,
  updateRecordingsStatusBatch,
} from "#/app/(platform)/sc/reporting/recordings/actions";
import type { RecordingResult } from "#/lib/fidelity-api-client";
import { verifyRecordingsApiKey } from "#/lib/recordings-api";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Shared handler logic
// ---------------------------------------------------------------------------

/**
 * Process a Fidelity API webhook payload (completion callback).
 *
 * The Fidelity API sends the full JobResponse on completion:
 * {
 *   "job_id": "uuid",
 *   "status": "completed",
 *   "result": {
 *     "results": [
 *       {
 *         "recording_id": "rec_xxx",
 *         "s3_key": "...",
 *         "status": "success" | "failed",
 *         "transcript": { ... },          // CRITICAL: full transcript JSON
 *         "fidelity_ratings": { ... },     // CRITICAL: fidelity analysis
 *         "error": "..."
 *       }
 *     ],
 *     "total": 1,
 *     "succeeded": 1,
 *     "failed": 0,
 *     ...
 *   }
 * }
 *
 * This handler also supports the legacy SDH batch format (array of recordings)
 * for backward compatibility.
 */
async function handleWebhookPayload(request: NextRequest) {
  // Verify API key from Fidelity API
  if (!verifyRecordingsApiKey(request)) {
    console.warn("Unauthorized webhook attempt to /api/recordings/batch/status");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Determine payload format:
    // - Fidelity API sends: { job_id, status, result: { results: [...] } }
    // - Legacy SDH format:  { recordings: [...] }
    let updates: BatchRecordingUpdate[];

    if (body.result?.results && Array.isArray(body.result.results)) {
      // ---- Fidelity API completion webhook format ----
      const jobId = body.job_id ?? "unknown";
      const results: RecordingResult[] = body.result.results;

      console.log(
        `Received Fidelity API completion webhook for job ${jobId}:`,
        `${results.length} recording(s), ` +
          `${body.result.succeeded ?? 0} succeeded, ${body.result.failed ?? 0} failed`,
      );

      // Transform Fidelity API format → SDH internal format
      // CRITICAL: Map both transcript AND fidelity_ratings — no data loss
      updates = results.map((result) => ({
        id: String(result.recording_id),
        status: (result.status === "success"
          ? "COMPLETED"
          : "FAILED") as BatchRecordingUpdate["status"],
        overallScore: result.fidelity_ratings?.overall_score,
        fidelityFeedback: result.fidelity_ratings as Prisma.InputJsonValue | undefined,
        transcript: result.transcript as Prisma.InputJsonValue | undefined,
        errorMessage: result.error,
      }));
    } else if (body.recordings && Array.isArray(body.recordings)) {
      // ---- Legacy SDH batch format (backward compatible) ----
      console.log(`Received legacy batch update for ${body.recordings.length} recording(s)`);

      updates = body.recordings.map((recording: Record<string, unknown>) => ({
        id: recording.id as string,
        status: recording.status as BatchRecordingUpdate["status"],
        overallScore: recording.overallScore as string | undefined,
        fidelityFeedback: recording.fidelityFeedback as Prisma.InputJsonValue | undefined,
        transcript: recording.transcript as Prisma.InputJsonValue | undefined,
        errorMessage: recording.errorMessage as string | undefined,
      }));
    } else {
      console.error("Invalid webhook payload: unrecognized format", {
        hasResult: !!body.result,
        hasRecordings: !!body.recordings,
        keys: Object.keys(body),
      });
      return NextResponse.json(
        { error: "Invalid request: expected Fidelity API or legacy batch format" },
        { status: 400 },
      );
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recordings to update",
        updatedCount: 0,
      });
    }

    // Use existing batch update function (handles idempotency, validation, etc.)
    const updateResult = await updateRecordingsStatusBatch(updates);

    if (!updateResult.success) {
      console.error("Batch update failed:", updateResult.message);
      const statusCode = updateResult.message.startsWith("Recordings not found:") ? 404 : 500;
      return NextResponse.json(
        { success: false, message: updateResult.message, updatedCount: 0 },
        { status: statusCode },
      );
    }

    console.log(`✓ Successfully updated ${updateResult.updatedCount} recording(s)`);

    return NextResponse.json({
      success: true,
      message: updateResult.message,
      updatedCount: updateResult.updatedCount,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// HTTP Handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/recordings/batch/status
 *
 * Completion webhook called by the Fidelity API when a job finishes processing.
 * The Fidelity API uses POST (see workflows/jobs.py send_completion_webhook).
 *
 * Accepts the full JobResponse payload including transcript and fidelity_ratings.
 */
export async function POST(request: NextRequest) {
  return handleWebhookPayload(request);
}

/**
 * PATCH /api/recordings/batch/status
 *
 * Legacy endpoint for backward compatibility with the original SDH batch format.
 * Also handles Fidelity API format if sent via PATCH.
 */
export async function PATCH(request: NextRequest) {
  return handleWebhookPayload(request);
}
