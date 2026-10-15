import type { NextRequest } from "next/server";
import { z } from "zod";

export function verifyRecordingsApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.RECORDINGS_API_KEY;

  if (!expectedKey) {
    console.error("RECORDINGS_API_KEY environment variable not set");
    return false;
  }

  return apiKey === expectedKey;
}

export const RecordingStatusUpdateSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  overallScore: z.string().optional(),
  fidelityFeedback: z.unknown().optional(),
  errorMessage: z.string().optional(),
});
