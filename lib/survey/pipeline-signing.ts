// Signing v1 between the SDH and the extraction pipeline, as the contract states it: one secret per
// environment, and an HMAC over a string that names the direction, so a request signed one way is
// never valid the other way. ENG-2641 signs the SDH's notifications with signPipelineRequest.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { SURVEY_PIPELINE_SECRET_MIN_LENGTH } from "#/env";

export const PipelineDirection = {
  PIPELINE_TO_SDH: "pipeline-to-sdh",
  SDH_TO_PIPELINE: "sdh-to-pipeline",
} as const;
export type PipelineDirection = (typeof PipelineDirection)[keyof typeof PipelineDirection];

export const TIMESTAMP_HEADER = "x-sdh-timestamp";
export const SIGNATURE_HEADER = "x-sdh-signature";
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export type SignedRequestParts = {
  direction: PipelineDirection;
  /** Unix seconds, as the header carries them. */
  timestamp: number | string;
  method: string;
  /** Exactly as sent, prefix included. */
  path: string;
  body: Uint8Array | string;
};

export function signPipelineRequest(secret: string, parts: SignedRequestParts) {
  const bodySha256 = createHash("sha256").update(parts.body).digest("hex");
  const signed = [
    "v1",
    parts.direction,
    String(parts.timestamp),
    parts.method,
    parts.path,
    bodySha256,
  ].join("\n");
  return createHmac("sha256", secret).update(signed).digest("hex");
}

// Read at each call rather than from env.ts, which parses the environment once at start.
// env.ts refuses a short secret at start, but isn't parsed when CI is set; here it counts as unset.
export function pipelineSecret() {
  const secret = process.env.SURVEY_PIPELINE_SECRET;
  return secret && secret.length >= SURVEY_PIPELINE_SECRET_MIN_LENGTH ? secret : undefined;
}

/**
 * The raw body of a request the pipeline signed for the SDH, or undefined when it isn't one: no
 * secret is set, the signature or timestamp is missing or wrong, the clock is more than five
 * minutes off, or the URL has a query string, which the signature doesn't cover.
 */
export async function verifiedPipelineBody(
  request: Request,
  now = Date.now(),
): Promise<string | undefined> {
  const secret = pipelineSecret();
  const url = new URL(request.url);
  const timestampText = request.headers.get(TIMESTAMP_HEADER) ?? "";
  const signature = (request.headers.get(SIGNATURE_HEADER) ?? "").toLowerCase();
  if (!secret || url.search !== "" || !/^\d{1,12}$/.test(timestampText)) {
    return undefined;
  }
  const timestamp = Number(timestampText);
  if (Math.abs(now / 1000 - timestamp) > MAX_CLOCK_SKEW_SECONDS) {
    return undefined;
  }
  const body = new Uint8Array(await request.arrayBuffer());
  const expected = Buffer.from(
    signPipelineRequest(secret, {
      direction: PipelineDirection.PIPELINE_TO_SDH,
      // As sent, so the signature covers exactly the header the caller signed.
      timestamp: timestampText,
      method: request.method,
      path: url.pathname,
      body,
    }),
    "hex",
  );
  const received = /^[0-9a-f]{64}$/.test(signature) ? Buffer.from(signature, "hex") : undefined;
  if (!received || !timingSafeEqual(received, expected)) {
    return undefined;
  }
  return new TextDecoder().decode(body);
}
