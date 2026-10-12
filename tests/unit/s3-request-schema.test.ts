import { describe, expect, it } from "vitest";

import { S3ApiRequestSchema } from "#/lib/s3/s3.types";

// The presign route takes the uploader from the session, so it parses the body without it.
const presignBody = S3ApiRequestSchema.omit({ uploaderId: true });

const attendanceBody = {
  contentType: "application/pdf",
  bucket: "student-attendance",
  size: 1024,
  groupId: "grp_1",
  sessionId: "ses_1",
};

describe("the presign request body", () => {
  it("accepts a complete body", () => {
    expect(presignBody.safeParse(attendanceBody).success).toBe(true);
  });

  it.each([
    ["groupId is missing", { ...attendanceBody, groupId: undefined }],
    ["sessionId is missing", { ...attendanceBody, sessionId: undefined }],
    ["size is missing", { ...attendanceBody, size: undefined }],
    ["size is zero", { ...attendanceBody, size: 0 }],
    ["size is a string", { ...attendanceBody, size: "1024" }],
    ["the bucket is unknown", { ...attendanceBody, bucket: "uploads" }],
  ])("rejects a body where %s", (_case, body) => {
    expect(presignBody.safeParse(body).success).toBe(false);
  });
});
