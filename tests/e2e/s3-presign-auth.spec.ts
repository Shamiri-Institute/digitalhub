import { type APIRequestContext, expect, test } from "@playwright/test";

import { db } from "#/lib/db";
import { generateSessionToken } from "#/tests/helpers";

const PRESIGN = "/api/s3/presigned";
const SIZE = 1024;
const TOO_LARGE = 500 * 1024 * 1024 + 1;

const attendanceBody = {
  contentType: "application/pdf",
  bucket: "student-attendance" as const,
  size: SIZE,
  groupId: "grp_dummy",
  sessionId: "ses_dummy",
};

const recordingBody = {
  contentType: "audio/mpeg",
  bucket: "recordings" as const,
  size: SIZE,
  groupId: "grp_dummy",
  sessionId: "ses_dummy",
};

type UploadTarget = {
  email: string;
  fellowId: string;
  groupId: string;
  sessionId: string;
  foreignGroupId: string | null;
};

function cookieHeader(token: string): Record<string, string> {
  return { cookie: `next-auth.session-token=${token}` };
}

async function postPresign(request: APIRequestContext, data: unknown, token?: string) {
  const res = await request.post(PRESIGN, {
    data,
    headers: token ? cookieHeader(token) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function emailForProfile(identifier: string, role: "FELLOW" | "SUPERVISOR") {
  const member = await db.implementerMember.findFirst({
    where: { identifier, role },
    orderBy: { id: "asc" },
    select: { userId: true },
  });
  if (!member) return null;
  const user = await db.user.findUnique({
    where: { id: member.userId },
    select: { email: true },
  });
  return user?.email ?? null;
}

async function anyEmailForRole(role: "FELLOW" | "SUPERVISOR" | "HUB_COORDINATOR" | "ADMIN") {
  const member = await db.implementerMember.findFirst({
    where: { role },
    orderBy: { id: "asc" },
    select: { userId: true },
  });
  if (!member) return null;
  const user = await db.user.findUnique({
    where: { id: member.userId },
    select: { email: true },
  });
  return user?.email ?? null;
}

async function findFellowUploadTarget(): Promise<UploadTarget | null> {
  const group = await db.interventionGroup.findFirst({
    where: {
      leader: { OR: [{ droppedOut: false }, { droppedOut: null }] },
      school: { interventionSessions: { some: { occurred: true } } },
    },
    orderBy: { id: "asc" },
    select: { id: true, schoolId: true, leaderId: true },
  });
  if (!group) return null;

  const session = await db.interventionSession.findFirst({
    where: { schoolId: group.schoolId, occurred: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!session) return null;

  const email = await emailForProfile(group.leaderId, "FELLOW");
  if (!email) return null;

  const foreign = await db.interventionGroup.findFirst({
    where: { leaderId: { not: group.leaderId } },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  return {
    email,
    fellowId: group.leaderId,
    groupId: group.id,
    sessionId: session.id,
    foreignGroupId: foreign?.id ?? null,
  };
}

async function findRecordingUploadTarget(): Promise<UploadTarget | null> {
  const groups = await db.interventionGroup.findMany({
    where: {
      leader: {
        supervisorId: { not: null },
        OR: [{ droppedOut: false }, { droppedOut: null }],
      },
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      schoolId: true,
      leaderId: true,
      leader: { select: { supervisorId: true } },
    },
    take: 25,
  });

  for (const group of groups) {
    const supervisorId = group.leader.supervisorId;
    if (!supervisorId) continue;

    const sessions = await db.interventionSession.findMany({
      where: { schoolId: group.schoolId, occurred: true },
      orderBy: { id: "asc" },
      select: { id: true },
      take: 25,
    });

    for (const session of sessions) {
      const existing = await db.sessionRecording.findUnique({
        where: {
          unique_recording_per_session: {
            fellowId: group.leaderId,
            schoolId: group.schoolId,
            groupId: group.id,
            sessionId: session.id,
          },
        },
        select: { id: true },
      });
      if (existing) continue;

      const email = await emailForProfile(supervisorId, "SUPERVISOR");
      if (!email) continue;

      const foreign = await db.interventionGroup.findFirst({
        where: { leader: { supervisorId: { not: supervisorId } } },
        orderBy: { id: "asc" },
        select: { id: true },
      });

      return {
        email,
        fellowId: group.leaderId,
        groupId: group.id,
        sessionId: session.id,
        foreignGroupId: foreign?.id ?? null,
      };
    }
  }
  return null;
}

let fellowToken: string | null = null;
let supervisorToken: string | null = null;
let hubToken: string | null = null;
let adminToken: string | null = null;

let attendanceTarget: UploadTarget | null = null;
let attendanceTargetToken: string | null = null;
let recordingTarget: UploadTarget | null = null;
let recordingTargetToken: string | null = null;

test.beforeAll(async () => {
  const [fellowEmail, supervisorEmail, hubEmail, adminEmail] = await Promise.all([
    anyEmailForRole("FELLOW"),
    anyEmailForRole("SUPERVISOR"),
    anyEmailForRole("HUB_COORDINATOR"),
    anyEmailForRole("ADMIN"),
  ]);

  fellowToken = fellowEmail ? await generateSessionToken(fellowEmail) : null;
  supervisorToken = supervisorEmail ? await generateSessionToken(supervisorEmail) : null;
  hubToken = hubEmail ? await generateSessionToken(hubEmail) : null;
  adminToken = adminEmail ? await generateSessionToken(adminEmail) : null;

  attendanceTarget = await findFellowUploadTarget();
  attendanceTargetToken = attendanceTarget
    ? await generateSessionToken(attendanceTarget.email)
    : null;

  recordingTarget = await findRecordingUploadTarget();
  recordingTargetToken = recordingTarget ? await generateSessionToken(recordingTarget.email) : null;
});

test.describe("S3 presign auth gate (unauthenticated)", () => {
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

test.describe("S3 presign request-schema validation (Fellow session)", () => {
  test("missing groupId is rejected by the schema", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { groupId: _g, ...withoutGroup } = attendanceBody;
    const { res, body } = await postPresign(request, withoutGroup, fellowToken ?? undefined);
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("missing sessionId is rejected by the schema", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { sessionId: _s, ...withoutSession } = attendanceBody;
    const { res, body } = await postPresign(request, withoutSession, fellowToken ?? undefined);
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("missing size is rejected by the schema", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { size: _size, ...withoutSize } = attendanceBody;
    const { res, body } = await postPresign(request, withoutSize, fellowToken ?? undefined);
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("zero-byte size is rejected by the schema", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, size: 0 },
      fellowToken ?? undefined,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("size sent as a string is rejected by the schema", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, size: "1024" },
      fellowToken ?? undefined,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("an unknown bucket is rejected by the schema", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, bucket: "uploads" },
      fellowToken ?? undefined,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign student-attendance (Fellow session)", () => {
  test("Fellow can mint a student-attendance URL for a group they lead", async ({ request }) => {
    test.skip(!attendanceTargetToken || !attendanceTarget, "no seeded fellow upload target");
    const { res, body } = await postPresign(
      request,
      {
        ...attendanceBody,
        groupId: attendanceTarget?.groupId,
        sessionId: attendanceTarget?.sessionId,
      },
      attendanceTargetToken ?? undefined,
    );

    expect(res.status()).toBe(200);
    expect(body.bucket).toBeDefined();
    expect(body.url).toEqual(expect.stringContaining("X-Amz-"));
    expect(body.url).toEqual(expect.stringMatching(/content-type/i));
    expect(body.url).toEqual(expect.stringMatching(/if-none-match/i));
    expect(body.url).toEqual(expect.stringMatching(/content-length/i));
    expect(body.key).toEqual(expect.stringMatching(/^student-attendance\//));
    expect(body.accessKeyId).toBeUndefined();
    expect(body.secretAccessKey).toBeUndefined();
  });

  test("a client-supplied key in the body is ignored — server derives its own", async ({
    request,
  }) => {
    test.skip(!attendanceTargetToken || !attendanceTarget, "no seeded fellow upload target");
    const attackerKey = "student-attendance/attacker-controlled.pdf";
    const { res, body } = await postPresign(
      request,
      {
        ...attendanceBody,
        groupId: attendanceTarget?.groupId,
        sessionId: attendanceTarget?.sessionId,
        key: attackerKey,
      },
      attendanceTargetToken ?? undefined,
    );

    expect(res.status()).toBe(200);
    expect(body.key).not.toBe(attackerKey);
    expect(body.key).toEqual(expect.stringMatching(/^student-attendance\//));
  });

  test("Fellow cannot mint for a group they do not lead (IDOR)", async ({ request }) => {
    test.skip(!attendanceTargetToken || !attendanceTarget, "no seeded fellow upload target");
    const foreignGroupId = attendanceTarget?.foreignGroupId ?? "grp_not_mine";
    const { res, body } = await postPresign(
      request,
      {
        ...attendanceBody,
        groupId: foreignGroupId,
        sessionId: attendanceTarget?.sessionId,
      },
      attendanceTargetToken ?? undefined,
    );

    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });

  test("attendance is pdf only: text/html is rejected", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, contentType: "text/html" },
      fellowToken ?? undefined,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("attendance is pdf only: audio/mpeg is rejected", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, contentType: "audio/mpeg" },
      fellowToken ?? undefined,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("attendance rejects a file over the bucket maximum", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, size: TOO_LARGE },
      fellowToken ?? undefined,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("File too large");
    expect(body.url).toBeUndefined();
  });

  test("content-type with a charset parameter is still accepted", async ({ request }) => {
    test.skip(!attendanceTargetToken || !attendanceTarget, "no seeded fellow upload target");
    const { res, body } = await postPresign(
      request,
      {
        ...attendanceBody,
        contentType: "application/pdf; charset=utf-8",
        groupId: attendanceTarget?.groupId,
        sessionId: attendanceTarget?.sessionId,
      },
      attendanceTargetToken ?? undefined,
    );
    expect(res.status()).toBe(200);
    expect(body.url).toBeDefined();
  });

  test("Fellow cannot mint a recordings URL", async ({ request }) => {
    test.skip(!fellowToken, "no seeded FELLOW");
    const { res, body } = await postPresign(request, recordingBody, fellowToken ?? undefined);
    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign recordings (Supervisor session)", () => {
  test("Supervisor can mint a recordings URL for their fellow's group", async ({ request }) => {
    test.skip(!recordingTargetToken || !recordingTarget, "no seeded recording upload target");
    const { res, body } = await postPresign(
      request,
      {
        ...recordingBody,
        groupId: recordingTarget?.groupId,
        sessionId: recordingTarget?.sessionId,
      },
      recordingTargetToken ?? undefined,
    );

    expect(res.status()).toBe(200);
    expect(body.url).toEqual(expect.stringMatching(/content-type/i));
    expect(body.url).toEqual(expect.stringMatching(/if-none-match/i));
    expect(body.url).toEqual(expect.stringMatching(/content-length/i));
    expect(body.key).toEqual(expect.stringMatching(/^recordings\//));
    expect(body.recordingId).toBeDefined();
    expect(body.accessKeyId).toBeUndefined();
    expect(body.secretAccessKey).toBeUndefined();
  });

  test("Supervisor cannot mint for a group outside their supervision (IDOR)", async ({
    request,
  }) => {
    test.skip(!recordingTargetToken || !recordingTarget, "no seeded recording upload target");
    const foreignGroupId = recordingTarget?.foreignGroupId ?? "grp_not_mine";
    const { res, body } = await postPresign(
      request,
      {
        ...recordingBody,
        groupId: foreignGroupId,
        sessionId: recordingTarget?.sessionId,
      },
      recordingTargetToken ?? undefined,
    );

    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });

  test("recordings is audio only: application/pdf is rejected", async ({ request }) => {
    test.skip(!supervisorToken, "no seeded SUPERVISOR");
    const { res, body } = await postPresign(
      request,
      { ...recordingBody, contentType: "application/pdf" },
      supervisorToken ?? undefined,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("recordings rejects a file over the 500MB maximum", async ({ request }) => {
    test.skip(!supervisorToken, "no seeded SUPERVISOR");
    const { res, body } = await postPresign(
      request,
      { ...recordingBody, size: TOO_LARGE },
      supervisorToken ?? undefined,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("File too large");
    expect(body.url).toBeUndefined();
  });

  test("Supervisor cannot mint a student-attendance URL", async ({ request }) => {
    test.skip(!supervisorToken, "no seeded SUPERVISOR");
    const { res, body } = await postPresign(request, attendanceBody, supervisorToken ?? undefined);
    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign other roles", () => {
  test("Hub coordinator cannot mint recordings", async ({ request }) => {
    test.skip(!hubToken, "no seeded HUB_COORDINATOR");
    const { res, body } = await postPresign(request, recordingBody, hubToken ?? undefined);
    expect(res.status()).toBe(403);
    expect(body.url).toBeUndefined();
  });

  test("Hub coordinator cannot mint student-attendance", async ({ request }) => {
    test.skip(!hubToken, "no seeded HUB_COORDINATOR");
    const { res, body } = await postPresign(request, attendanceBody, hubToken ?? undefined);
    expect(res.status()).toBe(403);
    expect(body.url).toBeUndefined();
  });

  test("Admin cannot mint student-attendance as if they were a Fellow", async ({ request }) => {
    test.skip(!adminToken, "no seeded ADMIN");
    const { res, body } = await postPresign(request, attendanceBody, adminToken ?? undefined);
    expect(res.status()).toBe(403);
    expect(body.url).toBeUndefined();
  });

  test("Admin cannot mint recordings", async ({ request }) => {
    test.skip(!adminToken, "no seeded ADMIN");
    const { res, body } = await postPresign(request, recordingBody, adminToken ?? undefined);
    expect(res.status()).toBe(403);
    expect(body.url).toBeUndefined();
  });
});
