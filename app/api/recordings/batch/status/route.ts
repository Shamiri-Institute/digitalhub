import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import {
  type BatchRecordingUpdate,
  updateRecordingsStatusBatch,
} from "#/app/(platform)/sc/reporting/recordings/actions";
import type { RecordingResult } from "#/lib/fidelity-ratings-api";
import { verifyRecordingsApiKey } from "#/lib/recordings-api";

export const dynamic = "force-dynamic";

/**
 * POST /api/recordings/batch/status
 *
 * Completion webhook called by the Fidelity Ratings API when a job finishes
 * processing asynchronously.
 */
export async function POST(request: NextRequest) {
  if (!verifyRecordingsApiKey(request)) {
    console.warn("Unauthorized webhook attempt to /api/recordings/batch/status");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    let updates: BatchRecordingUpdate[];

    if (body.result?.results && Array.isArray(body.result.results)) {
      const jobId = body.job_id ?? "unknown";
      const results: RecordingResult[] = body.result.results;

      console.log(
        `Received Fidelity API completion webhook for job ${jobId}:`,
        `${results.length} recording(s), ` +
          `${body.result.succeeded ?? 0} succeeded, ${body.result.failed ?? 0} failed`,
      );

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
    } else {
      console.error("Invalid webhook payload: unrecognized format", {
        hasResult: !!body.result,
        hasRecordings: !!body.recordings,
        keys: Object.keys(body),
      });
      return NextResponse.json(
        { error: "Invalid request: expected Fidelity API format" },
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

    const updateResult = await updateRecordingsStatusBatch(updates);

    if (!updateResult.success) {
      console.error("Batch update failed:", updateResult.message);
      const statusCode = updateResult.message.startsWith("Recordings not found:") ? 404 : 500;
      return NextResponse.json(
        { success: false, message: updateResult.message, updatedCount: 0 },
        { status: statusCode },
      );
    }

    console.log(`Successfully updated ${updateResult.updatedCount} recording(s)`);

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
