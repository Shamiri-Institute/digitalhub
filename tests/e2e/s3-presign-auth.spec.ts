import { type APIRequestContext, expect, test } from "@playwright/test";

import { generateSessionToken, PersonnelFixtures } from "#/tests/helpers";

/**
 * Exercises POST /api/s3/presigned only. Does not PUT to S3. Does not hit production.
 * Buckets follow lib/s3-buckets.ts: recordings (Supervisor, audio) and
 * student-attendance (Fellow, pdf). There is no uploads bucket any more (#816).
 */
const PRESIGN = "/api/s3/presigned";

const SIZE = 1024;

// PersonnelFixtures.fellow is seeded as ADMIN (fixture fix lands in #815), so
// mint a session for a seeded FELLOW here instead of using the shared state file.
const FELLOW_EMAIL = "bukayo.saka@test.com";

async function fellowStorageState() {
  const token = await generateSessionToken(FELLOW_EMAIL);
  return {
    cookies: [
      {
        name: "next-auth.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 60 * 60,
      },
    ],
    origins: [],
  };
}

const attendanceBody = {
  contentType: "application/pdf",
  bucket: "student-attendance" as const,
  key: "student-attendance/example.pdf",
  size: SIZE,
};

const recordingBody = {
  contentType: "audio/mpeg",
  bucket: "recordings" as const,
  key: "recordings/x.mp3",
  size: SIZE,
};

async function postPresign(request: APIRequestContext, data: unknown) {
  const res = await request.post(PRESIGN, { data });
  const body = await res.json();
  return { res, body };
}

test.describe("S3 presign auth gate (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("POST student-attendance without a session returns 401 and no url", async ({ request }) => {
    const { res, body } = await postPresign(request, attendanceBody);

    expect(res.status()).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(body.url).toBeUndefined();
  });

  test("POST recordings without a session returns 401 and no url", async ({ request }) => {
    const { res, body } = await postPresign(request, recordingBody);

    expect(res.status()).toBe(401);
    expect(body.url).toBeUndefined();
  });

  test("POST empty JSON without a session returns 401 (auth before zod)", async ({ request }) => {
    const { res, body } = await postPresign(request, {});

    expect(res.status()).toBe(401);
    expect(body.url).toBeUndefined();
  });

  test("POST unknown bucket without a session returns 401", async ({ request }) => {
    const { res, body } = await postPresign(request, { ...attendanceBody, bucket: "payments" });

    expect(res.status()).toBe(401);
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign student-attendance (Fellow session)", () => {
  test.use({
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructuring pattern here
    storageState: async ({}, use) => {
      await use(await fellowStorageState());
    },
  });

  test("Fellow can mint a student-attendance URL with signed headers", async ({ request }) => {
    const { res, body } = await postPresign(request, attendanceBody);

    expect(res.status()).toBe(200);
    expect(body.key).toBe(attendanceBody.key);
    expect(body.bucket).toBeDefined();
    expect(body.url).toEqual(expect.stringContaining("X-Amz-"));
    expect(body.url).toEqual(expect.stringMatching(/content-type/i));
    expect(body.url).toEqual(expect.stringMatching(/if-none-match/i));
    expect(body.url).toEqual(expect.stringMatching(/content-length/i));
    expect(body.accessKeyId).toBeUndefined();
    expect(body.secretAccessKey).toBeUndefined();
  });

  test("uploads bucket no longer exists (schema 400)", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      bucket: "uploads",
      key: "uploads/example.pdf",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("missing size is rejected by the schema", async ({ request }) => {
    const { size: _size, ...withoutSize } = attendanceBody;
    const { res, body } = await postPresign(request, withoutSize);

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("attendance rejects a file over the bucket maximum", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      size: 500 * 1024 * 1024 + 1,
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("File too large");
    expect(body.url).toBeUndefined();
  });

  test("attendance is pdf only: text/html is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      contentType: "text/html",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("attendance is pdf only: image/svg+xml is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      contentType: "image/svg+xml",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("attendance is pdf only: audio/mpeg is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      contentType: "audio/mpeg",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("path traversal in key is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      key: "student-attendance/../x.pdf",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("student-attendance rejects a key under another prefix", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      key: "recordings/example.pdf",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("student-attendance rejects a key containing empty path segments", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      key: "student-attendance/school//x.pdf",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("Fellow cannot mint a recordings URL", async ({ request }) => {
    const { res, body } = await postPresign(request, recordingBody);

    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });

  test("zero-byte size is rejected by the schema", async ({ request }) => {
    const { res, body } = await postPresign(request, { ...attendanceBody, size: 0 });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("size sent as a string is rejected by the schema", async ({ request }) => {
    const { res, body } = await postPresign(request, { ...attendanceBody, size: "1024" });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("empty key is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, { ...attendanceBody, key: "" });

    expect(res.status()).toBe(400);
    expect(body.url).toBeUndefined();
  });

  test("key with a leading slash is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      key: "/student-attendance/x.pdf",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("content-type with a charset parameter is still accepted", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      contentType: "application/pdf; charset=utf-8",
    });

    expect(res.status()).toBe(200);
    expect(body.url).toBeDefined();
  });

  test("extra filename field is ignored (callers used to send it)", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...attendanceBody,
      filename: "legacy.pdf",
    });

    expect(res.status()).toBe(200);
    expect(body.key).toBe(attendanceBody.key);
  });
});

test.describe("S3 presign recordings (Supervisor session)", () => {
  test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

  test("Supervisor can mint a recordings URL with signed headers", async ({ request }) => {
    const { res, body } = await postPresign(request, recordingBody);

    expect(res.status()).toBe(200);
    expect(body.key).toBe(recordingBody.key);
    expect(body.url).toEqual(expect.stringMatching(/content-type/i));
    expect(body.url).toEqual(expect.stringMatching(/if-none-match/i));
    expect(body.url).toEqual(expect.stringMatching(/content-length/i));
  });

  test("recordings is audio only: application/pdf is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...recordingBody,
      contentType: "application/pdf",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("recordings is audio only: text/html is rejected", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...recordingBody,
      contentType: "text/html",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("recordings rejects a key under another prefix", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...recordingBody,
      key: "student-attendance/x.mp3",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("recordings rejects a key containing empty path segments", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...recordingBody,
      key: "recordings/school//x.mp3",
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid key");
    expect(body.url).toBeUndefined();
  });

  test("Supervisor cannot mint a student-attendance URL", async ({ request }) => {
    const { res, body } = await postPresign(request, attendanceBody);

    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });

  test("recordings rejects a file over the 500MB maximum", async ({ request }) => {
    const { res, body } = await postPresign(request, {
      ...recordingBody,
      size: 500 * 1024 * 1024 + 1,
    });

    expect(res.status()).toBe(400);
    expect(body.error).toBe("File too large");
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign other roles", () => {
  test.describe("Hub coordinator session", () => {
    test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });

    test("cannot mint recordings", async ({ request }) => {
      const { res, body } = await postPresign(request, recordingBody);
      expect(res.status()).toBe(403);
      expect(body.url).toBeUndefined();
    });

    test("cannot mint student-attendance", async ({ request }) => {
      const { res, body } = await postPresign(request, attendanceBody);
      expect(res.status()).toBe(403);
      expect(body.url).toBeUndefined();
    });
  });

  test.describe("Admin session (shared fellow fixture email)", () => {
    test.use({ storageState: PersonnelFixtures.fellow.stateFile });

    test("ADMIN cannot mint student-attendance as if they were a Fellow", async ({ request }) => {
      const { res, body } = await postPresign(request, attendanceBody);
      expect(res.status()).toBe(403);
      expect(body.url).toBeUndefined();
    });

    test("ADMIN cannot mint recordings", async ({ request }) => {
      const { res, body } = await postPresign(request, recordingBody);
      expect(res.status()).toBe(403);
      expect(body.url).toBeUndefined();
    });
  });
});
