/**
 * Fidelity API Client
 *
 * This module provides a typed client for communicating with the Fidelity Ratings
 * FastAPI service (behind a Caddy reverse proxy with TLS). It handles:
 * - API key authentication via X-API-Key header
 * - Job submission (POST /jobs) and status checking (GET /jobs/{job_id})
 * - Proper error handling with timeouts
 *
 * Transport security: Caddy terminates TLS (self-signed via `tls internal`) in
 * front of the FastAPI service. An undici Agent is configured to skip certificate
 * verification ONLY for Fidelity API requests — all other outbound TLS connections
 * from the Node.js process are unaffected.
 *
 * The Fidelity API processes audio recordings asynchronously and returns results
 * via webhook callbacks. Both transcript and fidelity_ratings are included in results.
 */

import { Agent } from "undici";

export type FidelityRecording = {
  id: string;
  s3_key: string;
};

export type CreateJobRequest = {
  job_id?: string;
  recordings: FidelityRecording[];
  progress_webhook_url?: string;
  completion_webhook_url: string;
};

export type FidelityJobStatus = "queued" | "processing" | "completed" | "error" | "cancelled";

export type RecordingResult = {
  recording_id: string | number;
  s3_key: string;
  status: "success" | "failed";
  transcript?: Record<string, unknown> | unknown[];
  fidelity_ratings?: Record<string, unknown> & { overall_score?: string };
  error?: string;
};

export type JobResult = {
  results: RecordingResult[];
  total: number;
  succeeded: number;
  failed: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
};

export type JobResponse = {
  job_id: string;
  status: FidelityJobStatus;
  result?: JobResult; // only present when status is "completed"
};

// ---------------------------------------------------------------------------
// Internal State & Initialization
// ---------------------------------------------------------------------------

type FidelityConfig = {
  baseUrl: string;
  apiKey: string;
};

let _config: FidelityConfig | null = null;

const fidelityDispatcher = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

/**
 * Initialize the Fidelity client configuration.
 * Lazily called on first API request to avoid crashing at import time.
 */
function getConfig(): FidelityConfig {
  if (!_config) {
    const baseUrl = process.env.FIDELITY_API_URL;
    const apiKey = process.env.RECORDINGS_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new Error(
        "Missing Fidelity API configuration. Ensure FIDELITY_API_URL and " +
          "RECORDINGS_API_KEY environment variables are set.",
      );
    }

    _config = {
      baseUrl: baseUrl.replace(/\/$/, ""),
      apiKey,
    };
  }

  return _config;
}

// ---------------------------------------------------------------------------
// Public API Functions
// ---------------------------------------------------------------------------

/**
 * Submit recordings for processing.
 * Returns immediately with a job_id, does NOT wait for processing to complete.
 * The Fidelity API will call the completion_webhook_url when done.
 */
export async function createJob(request: CreateJobRequest): Promise<JobResponse> {
  const config = getConfig();

  try {
    const response = await fetch(`${config.baseUrl}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
      // @ts-expect-error — dispatcher is a valid undici option on Node's native fetch
      dispatcher: fidelityDispatcher,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fidelity API error: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as JobResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to submit job to Fidelity API: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check the current status of a job.
 * Intended for manual checks and/or admin dashboards — NOT for polling.
 * Normal flow relies on webhook callbacks.
 */
export async function getJobStatus(jobId: string): Promise<JobResponse> {
  const config = getConfig();

  try {
    const response = await fetch(`${config.baseUrl}/jobs/${jobId}`, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey,
      },
      signal: AbortSignal.timeout(10_000),
      // @ts-expect-error — dispatcher is a valid undici option on Node's native fetch
      dispatcher: fidelityDispatcher,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Job ${jobId} not found`);
      }
      const errorText = await response.text();
      throw new Error(`Fidelity API error: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as JobResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get job status: ${error.message}`);
    }
    throw error;
  }
}
