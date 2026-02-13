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

import https from "node:https";
import {
  Agent as UndiciAgent,
  fetch as undiciFetch,
  RequestInit as UndiciRequestInit,
} from "undici";

// ---------------------------------------------------------------------------
// Types — mirror the Fidelity API's Pydantic models
// ---------------------------------------------------------------------------

/** A single recording to submit for processing */
export type FidelityRecording = {
  id: string;
  s3_key: string;
};

/** Request body for POST /jobs */
export type CreateJobRequest = {
  job_id?: string;
  recordings: FidelityRecording[];
  progress_webhook_url?: string;
  completion_webhook_url: string;
};

/** Possible statuses for a job in the Fidelity API */
export type FidelityJobStatus = "queued" | "processing" | "completed" | "error" | "cancelled";

/** Result for an individual recording within a completed job */
export type RecordingResult = {
  recording_id: string | number;
  s3_key: string;
  status: "success" | "failed";
  /** Full transcript JSON with speaker labels, timestamps, and prosody annotations */
  transcript?: Record<string, unknown> | unknown[];
  /** Fidelity ratings including overall_score and per-dimension feedback */
  fidelity_ratings?: Record<string, unknown> & { overall_score?: string };
  error?: string;
};

/** Aggregate result for a completed job */
export type JobResult = {
  results: RecordingResult[];
  total: number;
  succeeded: number;
  failed: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
};

/** Response from POST /jobs and GET /jobs/{job_id} */
export type JobResponse = {
  job_id: string;
  status: FidelityJobStatus;
  /** Only present when status === "completed" */
  result?: JobResult;
};

// ---------------------------------------------------------------------------
// mTLS Agent
// ---------------------------------------------------------------------------

/**
 * Create an HTTPS agent configured with mutual TLS certificates.
 * Certificates are read from base64-encoded environment variables:
 * - FIDELITY_CA_CERT: CA certificate (for verifying server)
 * - FIDELITY_CLIENT_CERT: Client certificate (our identity)
 * - FIDELITY_CLIENT_KEY: Client private key
 *
 * Returns `null` when certificates are not configured (dev mode).
 * In that case, plain HTTP/HTTPS requests are made without mTLS,
 * which works for local development against a Fidelity API running
 * on localhost without Caddy.
 */
function createMTLSAgent(): UndiciAgent | null {
  const caCertB64 = process.env.FIDELITY_CA_CERT;
  const clientCertB64 = process.env.FIDELITY_CLIENT_CERT;
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

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class FidelityAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private agent: UndiciAgent | null;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.agent = createMTLSAgent();
  }

  /**
   * Build fetch options, attaching the mTLS agent only when configured.
   * In dev mode (no certs), plain fetch is used — works with http://localhost.
   */
  private fetchOptions(options: UndiciRequestInit & { signal?: AbortSignal }): UndiciRequestInit {
    if (this.agent) {
      // @ts-expect-error — Node.js fetch supports `agent` but it's not in the DOM types
      return { ...options, dispatcher: this.agent };
    }
    return options;
  }

  /**
   * Submit recordings for processing.
   * Returns immediately with a job_id — does NOT wait for processing to complete.
   *
   * The Fidelity API will call the completion_webhook_url when done.
   */
  async createJob(request: CreateJobRequest): Promise<JobResponse> {
    try {
      const response = await undiciFetch(
        `${this.baseUrl}/jobs`,
        this.fetchOptions({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.apiKey,
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
   * Intended for manual checks / admin dashboards, NOT for polling.
   * Normal flow relies on webhook callbacks.
   */
  async getJobStatus(jobId: string): Promise<JobResponse> {
    try {
      const response = await undiciFetch(
        `${this.baseUrl}/jobs/${jobId}`,
        this.fetchOptions({
          method: "GET",
          headers: {
            "X-API-Key": this.apiKey,
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
}

// ---------------------------------------------------------------------------
// Singleton — lazily initialized to avoid crashing at import time
// if env vars are missing (e.g. during build)
// ---------------------------------------------------------------------------

let _client: FidelityAPIClient | null = null;

/**
 * Get the singleton Fidelity API client instance.
 * Lazily initialized on first call so missing env vars don't crash at import time.
 */
export function getFidelityClient(): FidelityAPIClient {
  if (!_client) {
    const baseUrl = process.env.FIDELITY_API_URL;
    const apiKey = process.env.RECORDINGS_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error(
        "Missing Fidelity API configuration. Ensure FIDELITY_API_URL and " +
          "RECORDINGS_API_KEY environment variables are set.",
      );
    }

    _client = new FidelityAPIClient(baseUrl, apiKey);
  }

  return _client;
}
