/**
 * Fidelity API Client with mTLS Authentication
 *
 * This module provides a typed client for communicating with the Fidelity Ratings
 * FastAPI service. It handles:
 * - Mutual TLS authentication using base64-encoded certificates from env vars
 * - Job submission (POST /jobs) and status checking (GET /jobs/{job_id})
 * - Proper error handling with timeouts
 *
 * The Fidelity API processes audio recordings asynchronously and returns results
 * via webhook callbacks. Both transcript and fidelity_ratings are included in results.
 */

import {
  Agent as UndiciAgent,
  type RequestInit as UndiciRequestInit,
  fetch as undiciFetch,
} from "undici";

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
  agent: UndiciAgent | null;
};

let _config: FidelityConfig | null = null;

/**
 * Create an HTTPS agent configured with mutual TLS certificates.
 *
 * Returns `null` when certificates are not configured (dev mode) in which case
 * plain HTTP/HTTPS requests are made without mTLS
 */
function createMTLSAgent(): UndiciAgent | null {
  const caCertB64 = process.env.FIDELITY_CA_CERT; // for verifying server
  const clientCertB64 = process.env.FIDELITY_CLIENT_CERT; // our identity
  const clientKeyB64 = process.env.FIDELITY_CLIENT_KEY;

  if (!caCertB64 || !clientCertB64 || !clientKeyB64) {
    console.warn(
      "mTLS certificates not configured — running without mTLS. " +
        "This is expected in development but NOT in production.",
    );
    return null;
  }

  const caCert = Buffer.from(caCertB64, "base64").toString("utf-8");
  const clientCert = Buffer.from(clientCertB64, "base64").toString("utf-8");
  const clientKey = Buffer.from(clientKeyB64, "base64").toString("utf-8");

  return new UndiciAgent({
    connect: {
      ca: caCert,
      cert: clientCert,
      key: clientKey,
      rejectUnauthorized: true,
    },
  });
}

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
      agent: createMTLSAgent(),
    };
  }

  return _config;
}

/**
 * Build fetch options, attaching the mTLS agent only when configured.
 * In dev mode (no certs), plain fetch is used. Works with http://localhost.
 */
function buildFetchOptions(
  options: UndiciRequestInit & { signal?: AbortSignal },
): UndiciRequestInit {
  const config = getConfig();

  if (config.agent) {
    return { ...options, dispatcher: config.agent };
  }
  return options;
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
    const response = await undiciFetch(
      `${config.baseUrl}/jobs`,
      buildFetchOptions({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": config.apiKey,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30_000),
      }),
    );

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
 * Intended for manual checks and/or admin dashboards NOT for polling.
 * Normal flow relies on webhook callbacks.
 */
export async function getJobStatus(jobId: string): Promise<JobResponse> {
  const config = getConfig();

  try {
    const response = await undiciFetch(
      `${config.baseUrl}/jobs/${jobId}`,
      buildFetchOptions({
        method: "GET",
        headers: {
          "X-API-Key": config.apiKey,
        },
        signal: AbortSignal.timeout(10_000), // 10s timeout for status checks
      }),
    );

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
