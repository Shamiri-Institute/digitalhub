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
