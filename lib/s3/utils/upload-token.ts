import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "#/env";
import { UploadTokenError } from "#/lib/s3/s3.errors";
import { UPLOAD_TOKEN_TTL_SECONDS, type UploadTarget } from "#/lib/s3/s3.types";

export type UploadClaim = {
  [B in UploadTarget["bucket"]]: {
    bucket: B;
    key: string;
    uploaderId: string;
    contentType: string;
    fileName: string;
    context: Extract<UploadTarget, { bucket: B }>["context"];
  };
}[UploadTarget["bucket"]];

type SignedClaim = UploadClaim & { exp: number };

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function hmac(payload: string): Buffer {
  return createHmac("sha256", env.NEXTAUTH_SECRET).update(payload).digest();
}

export function signUploadToken(claim: UploadClaim): string {
  const exp = Math.floor(Date.now() / 1000) + UPLOAD_TOKEN_TTL_SECONDS;
  const signed: SignedClaim = { ...claim, exp };
  const payload = base64url(Buffer.from(JSON.stringify(signed), "utf8"));
  const signature = base64url(hmac(payload));
  return `${payload}.${signature}`;
}

export function verifyUploadToken(token: string): UploadClaim {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new UploadTokenError("Malformed upload token");
  }

  const [payload, signature] = parts as [string, string];

  const expected = hmac(payload);
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new UploadTokenError("Invalid upload token signature");
  }

  let signed: SignedClaim;
  try {
    signed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignedClaim;
  } catch {
    throw new UploadTokenError("Malformed upload token payload");
  }

  if (typeof signed.exp !== "number" || signed.exp <= Math.floor(Date.now() / 1000)) {
    throw new UploadTokenError("Upload token expired");
  }

  const { exp: _exp, ...claim } = signed;
  return claim;
}
