import { describe, expect, it, vi } from "vitest";

vi.mock("#/env", () => ({
  env: {
    S3_UPLOAD_KEY: "key",
    S3_UPLOAD_SECRET: "secret",
    S3_RECORDINGS_BUCKET: "recordings-bucket",
    S3_RECORDINGS_REGION: "af-south-1",
    S3_STUDENT_ATTENDANCE_BUCKET: "attendance-bucket",
    S3_STUDENT_ATTENDANCE_REGION: "af-south-1",
  },
}));

import { deleteObject, getPresignedUrl } from "#/lib/s3";

/**
 * The general uploads bucket is gone. A caller that does not name one of the
 * remaining buckets must fail before it touches S3, not fall back to a default.
 */
describe("lib/s3 bucket guard", () => {
  it("rejects the removed uploads bucket", async () => {
    await expect(getPresignedUrl("some/key", "uploads" as never)).rejects.toThrow(
      /S3 bucket must be one of recordings, student-attendance/,
    );
  });

  it("rejects a missing bucket", () => {
    expect(() => deleteObject({ Key: "some/key" }, undefined as never)).toThrow(
      /received undefined/,
    );
  });
});
