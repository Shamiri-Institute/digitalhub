import type { NextRequest } from "next/server";
import { z } from "zod";

/**
 * Verify the API key from the request headers for recordings API endpoints
 */
export function verifyRecordingsApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.RECORDINGS_API_KEY;

  if (!expectedKey) {
    console.error("RECORDINGS_API_KEY environment variable not set");
    return false;
  }

  return apiKey === expectedKey;
}

/**
 * Schema for validating a single recording status update
 */
export const RecordingStatusUpdateSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  overallScore: z.string().optional(),
  fidelityFeedback: z.unknown().optional(),
  errorMessage: z.string().optional(),
});

/**
 * Schema for validating a recording update with required ID (used in batch updates)
 */
export const RecordingStatusUpdateWithIdSchema = RecordingStatusUpdateSchema.extend({
  id: z.string().min(1, "Recording ID is required"),
});

/**
 * Schema for validating the batch update request body
 */
export const BatchRecordingStatusUpdateSchema = z.object({
  recordings: z
    .array(RecordingStatusUpdateWithIdSchema)
    .min(1, "At least one recording is required")
    .max(100, "Maximum 100 recordings per batch"),
});

export type RecordingStatusUpdate = z.infer<typeof RecordingStatusUpdateSchema>;
export type RecordingStatusUpdateWithId = z.infer<typeof RecordingStatusUpdateWithIdSchema>;
export type BatchRecordingStatusUpdate = z.infer<typeof BatchRecordingStatusUpdateSchema>;
