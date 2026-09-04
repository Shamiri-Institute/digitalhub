import { type APIRequestContext, expect, test } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";

/**
 * without a session. Does not PUT to S3. Does not hit production.
 */
const PRESIGN = "/api/s3/presigned";

const benignBody = {
  filename: "example.pdf",
  contentType: "application/pdf",
  bucket: "uploads" as const,
};

async function postPresign(request: APIRequestContext, data: unknown) {
  const res = await request.post(PRESIGN, { data });
  const body = await res.json();
  return { res, body };
}

test.describe("S3 presign auth gate (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("POST without a session returns 401 and no url", async ({ request }) => {
    const { res, body } = await postPresign(request, benignBody);

    expect(res.status()).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(body.url).toBeUndefined();
  });

  test("POST empty JSON without a session returns 401 (auth before zod)", async ({ request }) => {
    const { res, body } = await postPresign(request, {});

    expect(res.status()).toBe(401);
    expect(body.url).toBeUndefined();
  });

  test("POST unknown bucket without a session returns 401", async ({ request }) => {
    const { res, body } = await postPresign(request, { ...benignBody, bucket: "payments" });

    expect(res.status()).toBe(401);
    expect(body.url).toBeUndefined();
  });

  test("POST recordings without a session returns 401 and no url", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "probe.txt",
      contentType: "text/plain",
      bucket: "recordings",
    });

    expect(res.status()).toBe(401);
    expect(body.url).toBeUndefined();
  });

  test("POST student-attendance without a session returns 401 and no url", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "probe.txt",
      contentType: "text/plain",
      bucket: "student-attendance",
    });

    expect(res.status()).toBe(401);
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign happy path (Fellow session)", () => {
  test.use({ storageState: PersonnelFixtures.fellow.stateFile });

  test("authenticated Fellow can mint an uploads PutObject URL", async ({ request }) => {
    const { res, body } = await postPresign(request, benignBody);

    expect(res.status()).toBe(200);
    expect(body.url).toEqual(expect.stringContaining("X-Amz-"));
    expect(body.url).toEqual(expect.stringMatching(/content-type/i));
    expect(body.url).toEqual(expect.stringMatching(/if-none-match/i));
    expect(body.key).toEqual(expect.stringMatching(/^uploads\//));
    expect(body.bucket).toBeDefined();
    expect(body.region).toBeDefined();
    expect(body.accessKeyId).toBeUndefined();
    expect(body.secretAccessKey).toBeUndefined();
  });

  test("receipt zip content type is still accepted on uploads", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...benignBody,
      filename: "receipt.zip",
      contentType: "application/zip",
    });

    expect(res.status()).toBe(200);
    expect(body.url).toBeDefined();
  });

  test("text/html content type is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, { ...benignBody, contentType: "text/html" });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("image/svg+xml content type is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...benignBody,
      contentType: "image/svg+xml",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("path traversal in key is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, { ...benignBody, key: "uploads/../x" });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("Fellow cannot mint a recordings URL", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "x.mp3",
      contentType: "audio/mpeg",
      bucket: "recordings",
      key: "recordings/x.mp3",
    });

    expect(res.status()).toBe(403);
    expect(body.url).toBeUndefined();
  });

  test("Fellow can mint a student-attendance URL with the correct prefix", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "attendance.pdf",
      contentType: "application/pdf",
      bucket: "student-attendance",
      key: "student-attendance/example.pdf",
    });

    expect(res.status()).toBe(200);
    expect(body.key).toBe("student-attendance/example.pdf");
    expect(body.url).toEqual(expect.stringMatching(/content-type/i));
    expect(body.url).toEqual(expect.stringMatching(/if-none-match/i));
  });

  test("student-attendance without a key is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "attendance.pdf",
      contentType: "application/pdf",
      bucket: "student-attendance",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("student-attendance rejects an uploads/ key", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "attendance.pdf",
      contentType: "application/pdf",
      bucket: "student-attendance",
      key: "uploads/example.pdf",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign recordings prefix (Supervisor session)", () => {
  test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

  test("recordings without a key is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "x.mp3",
      contentType: "audio/mpeg",
      bucket: "recordings",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("recordings bucket rejects an uploads/ key", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "x.mp3",
      contentType: "audio/mpeg",
      bucket: "recordings",
      key: "uploads/x",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("recordings rejects a key containing empty path segments", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "x.mp3",
      contentType: "audio/mpeg",
      bucket: "recordings",
      key: "recordings/school//x.mp3",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("Supervisor can mint a recordings URL with the correct prefix", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "x.mp3",
      contentType: "audio/mpeg",
      bucket: "recordings",
      key: "recordings/x.mp3",
    });

    expect(res.status()).toBe(200);
    expect(body.key).toBe("recordings/x.mp3");
    expect(body.url).toEqual(expect.stringMatching(/content-type/i));
    expect(body.url).toEqual(expect.stringMatching(/if-none-match/i));
  });

  test("Supervisor cannot mint a student-attendance URL", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      filename: "attendance.pdf",
      contentType: "application/pdf",
      bucket: "student-attendance",
      key: "student-attendance/example.pdf",
    });

    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });
});
