import { expect, test } from "@playwright/test";

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

test.describe("S3 presign auth gate (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("POST without a session returns 401 and no url", async ({ request }) => {
    const res = await request.post(PRESIGN, { data: benignBody });
    const body = await res.json();

    expect(res.status()).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(body.url).toBeUndefined();
  });

  test("POST empty JSON without a session returns 401 (auth before zod)", async ({ request }) => {
    const res = await request.post(PRESIGN, { data: {} });
    const body = await res.json();

    expect(res.status()).toBe(401);
    expect(body.url).toBeUndefined();
  });

  test("POST unknown bucket without a session returns 401", async ({ request }) => {
    const res = await request.post(PRESIGN, {
      data: { ...benignBody, bucket: "payments" },
    });
    const body = await res.json();

    expect(res.status()).toBe(401);
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign happy path (Fellow session)", () => {
  test.use({ storageState: PersonnelFixtures.fellow.stateFile });

  test("authenticated Fellow can mint an uploads PutObject URL", async ({ request }) => {
    const res = await request.post(PRESIGN, { data: benignBody });
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.url).toEqual(expect.stringContaining("X-Amz-"));
    expect(body.key).toEqual(expect.stringMatching(/^uploads\//));
    expect(body.bucket).toBeDefined();
    expect(body.region).toBeDefined();
    expect(body.accessKeyId).toBeUndefined();
    expect(body.secretAccessKey).toBeUndefined();
  });
});
