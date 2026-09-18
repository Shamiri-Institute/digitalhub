// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("#/env", () => ({
  env: { NEXTAUTH_SECRET: "test-secret-for-upload-token-unit-tests" },
}));

const TEST_SECRET = "test-secret-for-upload-token-unit-tests";

import { UploadTokenError } from "#/lib/s3/s3.errors";
import type { UploadClaim } from "#/lib/s3/utils/upload-token";
import { signUploadToken, verifyUploadToken } from "#/lib/s3/utils/upload-token";

const attendanceClaim: UploadClaim = {
  bucket: "student-attendance",
  key: "student-attendance/2026/09/school/fellow/group/file_abc.pdf",
  uploaderId: "usr_123",
  contentType: "application/pdf",
  fileName: "attendance.pdf",
  context: {
    groupId: "grp_1",
    sessionId: "ses_1",
    fellowId: "fel_1",
  },
};

const recordingsClaim: UploadClaim = {
  bucket: "recordings",
  key: "recordings/2026/09/school/fellow/group/s1_rec_abc.mp3",
  uploaderId: "usr_123",
  contentType: "audio/mpeg",
  fileName: "s1_rec_abc.mp3",
  context: {
    recordingId: "rec_abc",
    fellowId: "fel_1",
    groupId: "grp_1",
    sessionId: "ses_1",
    schoolId: "sch_1",
    fileName: "s1_rec_abc.mp3",
  },
};

function sign(payload: string): string {
  return createHmac("sha256", TEST_SECRET).update(payload).digest().toString("base64url");
}

function tamperPayload(token: string, mutate: (claim: Record<string, unknown>) => void): string {
  const [payload = ""] = token.split(".");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
  mutate(decoded);
  const repacked = Buffer.from(JSON.stringify(decoded), "utf8").toString("base64url");
  return `${repacked}.${sign(repacked)}`;
}

describe("upload token", () => {
  it("round-trips an attendance claim", () => {
    const token = signUploadToken(attendanceClaim);
    expect(verifyUploadToken(token)).toEqual(attendanceClaim);
  });

  it("round-trips a recordings claim", () => {
    const token = signUploadToken(recordingsClaim);
    expect(verifyUploadToken(token)).toEqual(recordingsClaim);
  });

  it("rejects a malformed token", () => {
    expect(() => verifyUploadToken("not-a-token")).toThrow(UploadTokenError);
  });

  it("rejects a token whose payload was tampered with but not re-signed", () => {
    const token = signUploadToken(attendanceClaim);
    const [payload = "", signature = ""] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    decoded.uploaderId = "attacker";
    const repacked = Buffer.from(JSON.stringify(decoded), "utf8").toString("base64url");
    expect(() => verifyUploadToken(`${repacked}.${signature}`)).toThrow(UploadTokenError);
  });

  it("rejects a correctly-signed token whose claim shape is invalid", () => {
    const token = signUploadToken(attendanceClaim);
    const tampered = tamperPayload(token, (claim) => {
      claim.context = undefined;
    });
    expect(() => verifyUploadToken(tampered)).toThrow(UploadTokenError);
  });

  it("rejects an expired token", () => {
    const token = signUploadToken(attendanceClaim);
    const expired = tamperPayload(token, (claim) => {
      claim.exp = Math.floor(Date.now() / 1000) - 10;
    });
    expect(() => verifyUploadToken(expired)).toThrow(UploadTokenError);
  });
});
