import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";
import { env } from "#/env";
import { UploadTokenError } from "#/lib/s3/s3.errors";
import { UPLOAD_TOKEN_TTL_SECONDS } from "#/lib/s3/s3.types";

const RecordingsClaimSchema = z.object({
  bucket: z.literal("recordings"),
  key: z.string().min(1),
  uploaderId: z.string().min(1),
  contentType: z.string().min(1),
  fileName: z.string().min(1),
  context: z.object({
    recordingId: z.string().min(1),
    fellowId: z.string().min(1),
    groupId: z.string().min(1),
    sessionId: z.string().min(1),
    schoolId: z.string().min(1),
    fileName: z.string().min(1),
  }),
});

const AttendanceClaimSchema = z.object({
  bucket: z.literal("student-attendance"),
  key: z.string().min(1),
  uploaderId: z.string().min(1),
  contentType: z.string().min(1),
  fileName: z.string().min(1),
  context: z.object({
    groupId: z.string().min(1),
    sessionId: z.string().min(1),
    fellowId: z.string().min(1),
  }),
});

const UploadClaimSchema = z.discriminatedUnion("bucket", [
  RecordingsClaimSchema,
  AttendanceClaimSchema,
]);

const SignedClaimSchema = z.discriminatedUnion("bucket", [
  RecordingsClaimSchema.extend({ exp: z.number() }),
  AttendanceClaimSchema.extend({ exp: z.number() }),
]);

export type UploadClaim = z.infer<typeof UploadClaimSchema>;

type SignedClaim = z.infer<typeof SignedClaimSchema>;

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

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new UploadTokenError("Malformed upload token payload");
  }

  const parsed = SignedClaimSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new UploadTokenError("Malformed upload token payload");
  }

  const signed = parsed.data;
  if (signed.exp <= Math.floor(Date.now() / 1000)) {
    throw new UploadTokenError("Upload token expired");
  }

  const { exp: _exp, ...claim } = signed;
  return claim;
}
