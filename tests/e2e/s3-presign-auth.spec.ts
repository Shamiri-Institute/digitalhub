import { type APIRequestContext, expect, test } from "@playwright/test";

import { and, asc, eq, inArray, isNotNull, isNull, ne, notExists, or } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  implementerMember,
  interventionGroup,
  interventionSession,
  sessionRecording,
  user,
} from "#/db/schema";
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

async function emailForUser(userId: string) {
  const user = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { email: true },
  });
  return user?.email ?? null;
}

async function emailForProfile(identifier: string, role: "FELLOW" | "SUPERVISOR") {
  const member = await db.query.implementerMember.findFirst({
    where: (m, { and, eq }) => and(eq(m.identifier, identifier), eq(m.role, role)),
    orderBy: (m, { asc }) => asc(m.id),
    columns: { userId: true },
  });
  return member ? emailForUser(member.userId) : null;
}

async function anyEmailForRole(role: "FELLOW" | "SUPERVISOR" | "HUB_COORDINATOR" | "ADMIN") {
  const member = await db.query.implementerMember.findFirst({
    where: (m, { eq }) => eq(m.role, role),
    orderBy: (m, { asc }) => asc(m.id),
    columns: { userId: true },
  });
  return member ? emailForUser(member.userId) : null;
}

/** Fellows who have not dropped out, as a subquery for `inArray(group.leaderId, …)`. */
const activeFellowIds = db
  .select({ id: fellow.id })
  .from(fellow)
  .where(or(eq(fellow.droppedOut, false), isNull(fellow.droppedOut)));

/** Schools with at least one session that occurred. */
const schoolsWithOccurredSessions = db
  .select({ schoolId: interventionSession.schoolId })
  .from(interventionSession)
  .where(eq(interventionSession.occurred, true));

async function findFellowUploadTarget(): Promise<UploadTarget | null> {
  const [group] = await db
    .select({
      id: interventionGroup.id,
      schoolId: interventionGroup.schoolId,
      leaderId: interventionGroup.leaderId,
    })
    .from(interventionGroup)
    .where(
      and(
        inArray(interventionGroup.leaderId, activeFellowIds),
        inArray(interventionGroup.schoolId, schoolsWithOccurredSessions),
      ),
    )
    .orderBy(asc(interventionGroup.id))
    .limit(1);
  if (!group) return null;

  const session = await db.query.interventionSession.findFirst({
    where: (s, { and, eq }) => and(eq(s.schoolId, group.schoolId), eq(s.occurred, true)),
    orderBy: (s, { asc }) => asc(s.id),
    columns: { id: true },
  });
  if (!session) return null;

  const email = await emailForProfile(group.leaderId, "FELLOW");
  if (!email) return null;

  const foreign = await db.query.interventionGroup.findFirst({
    where: (g, { ne }) => ne(g.leaderId, group.leaderId),
    orderBy: (g, { asc }) => asc(g.id),
    columns: { id: true },
  });

  return {
    email,
    fellowId: group.leaderId,
    groupId: group.id,
    sessionId: session.id,
    foreignGroupId: foreign?.id ?? null,
  };
}

/**
 * A supervised fellow's group with an occurred session that has no recording yet and a
 * supervisor who can sign in, found in one query. The seed records every session of the first groups at each school, so a scan over the
 * first few groups finds nothing.
 */
async function findRecordingUploadTarget(): Promise<UploadTarget | null> {
  const [target] = await db
    .select({
      groupId: interventionGroup.id,
      fellowId: interventionGroup.leaderId,
      sessionId: interventionSession.id,
      supervisorId: fellow.supervisorId,
      email: user.email,
    })
    .from(interventionGroup)
    .innerJoin(
      fellow,
      and(
        eq(fellow.id, interventionGroup.leaderId),
        isNotNull(fellow.supervisorId),
        or(eq(fellow.droppedOut, false), isNull(fellow.droppedOut)),
      ),
    )
    .innerJoin(
      interventionSession,
      and(
        eq(interventionSession.schoolId, interventionGroup.schoolId),
        eq(interventionSession.occurred, true),
      ),
    )
    .innerJoin(
      implementerMember,
      and(
        eq(implementerMember.identifier, fellow.supervisorId),
        eq(implementerMember.role, "SUPERVISOR"),
      ),
    )
    // Some seeded supervisors have no email, and the test signs in by email.
    .innerJoin(user, and(eq(user.id, implementerMember.userId), isNotNull(user.email)))
    .where(
      notExists(
        db
          .select({ id: sessionRecording.id })
          .from(sessionRecording)
          .where(
            and(
              eq(sessionRecording.fellowId, interventionGroup.leaderId),
              eq(sessionRecording.schoolId, interventionGroup.schoolId),
              eq(sessionRecording.groupId, interventionGroup.id),
              eq(sessionRecording.sessionId, interventionSession.id),
            ),
          ),
      ),
    )
    .orderBy(asc(interventionGroup.id), asc(interventionSession.id))
    .limit(1);
  if (!target?.supervisorId || !target.email) return null;

  const supervisorId = target.supervisorId;
  const otherSupervisorsFellows = db
    .select({ id: fellow.id })
    .from(fellow)
    .where(ne(fellow.supervisorId, supervisorId));
  const foreign = await db.query.interventionGroup.findFirst({
    where: (g, { inArray }) => inArray(g.leaderId, otherSupervisorsFellows),
    orderBy: (g, { asc }) => asc(g.id),
    columns: { id: true },
  });

  return {
    email: target.email,
    fellowId: target.fellowId,
    groupId: target.groupId,
    sessionId: target.sessionId,
    foreignGroupId: foreign?.id ?? null,
  };
}

/** CI seeds the same data on every run, so missing data is a seed regression, not a reason to skip. */
function required<T>(value: T | null, what: string): T {
  if (value === null) throw new Error(`seed the database first: no ${what}`);
  return value;
}

let fellowToken: string;
let supervisorToken: string;
let hubToken: string;
let adminToken: string;

let attendanceTarget: UploadTarget;
let attendanceTargetToken: string;
let recordingTarget: UploadTarget;
let recordingTargetToken: string;

test.beforeAll(async () => {
  const [fellowEmail, supervisorEmail, hubEmail, adminEmail] = await Promise.all([
    anyEmailForRole("FELLOW"),
    anyEmailForRole("SUPERVISOR"),
    anyEmailForRole("HUB_COORDINATOR"),
    anyEmailForRole("ADMIN"),
  ]);

  fellowToken = await generateSessionToken(required(fellowEmail, "FELLOW"));
  supervisorToken = await generateSessionToken(required(supervisorEmail, "SUPERVISOR"));
  hubToken = await generateSessionToken(required(hubEmail, "HUB_COORDINATOR"));
  adminToken = await generateSessionToken(required(adminEmail, "ADMIN"));

  attendanceTarget = required(await findFellowUploadTarget(), "fellow upload target");
  attendanceTargetToken = await generateSessionToken(attendanceTarget.email);

  recordingTarget = required(await findRecordingUploadTarget(), "recording upload target");
  recordingTargetToken = await generateSessionToken(recordingTarget.email);
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
    const { groupId: _g, ...withoutGroup } = attendanceBody;
    const { res, body } = await postPresign(request, withoutGroup, fellowToken);
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("missing sessionId is rejected by the schema", async ({ request }) => {
    const { sessionId: _s, ...withoutSession } = attendanceBody;
    const { res, body } = await postPresign(request, withoutSession, fellowToken);
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("missing size is rejected by the schema", async ({ request }) => {
    const { size: _size, ...withoutSize } = attendanceBody;
    const { res, body } = await postPresign(request, withoutSize, fellowToken);
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("zero-byte size is rejected by the schema", async ({ request }) => {
    const { res, body } = await postPresign(request, { ...attendanceBody, size: 0 }, fellowToken);
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("size sent as a string is rejected by the schema", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, size: "1024" },
      fellowToken,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });

  test("an unknown bucket is rejected by the schema", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, bucket: "uploads" },
      fellowToken,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign student-attendance (Fellow session)", () => {
  test("Fellow can mint a student-attendance URL for a group they lead", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      {
        ...attendanceBody,
        groupId: attendanceTarget.groupId,
        sessionId: attendanceTarget.sessionId,
      },
      attendanceTargetToken,
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
    const attackerKey = "student-attendance/attacker-controlled.pdf";
    const { res, body } = await postPresign(
      request,
      {
        ...attendanceBody,
        groupId: attendanceTarget.groupId,
        sessionId: attendanceTarget.sessionId,
        key: attackerKey,
      },
      attendanceTargetToken,
    );

    expect(res.status()).toBe(200);
    expect(body.key).not.toBe(attackerKey);
    expect(body.key).toEqual(expect.stringMatching(/^student-attendance\//));
  });

  test("Fellow cannot mint for a group they do not lead (IDOR)", async ({ request }) => {
    const foreignGroupId = attendanceTarget.foreignGroupId ?? "grp_not_mine";
    const { res, body } = await postPresign(
      request,
      {
        ...attendanceBody,
        groupId: foreignGroupId,
        sessionId: attendanceTarget.sessionId,
      },
      attendanceTargetToken,
    );

    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });

  test("attendance is pdf only: text/html is rejected", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, contentType: "text/html" },
      fellowToken,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("attendance is pdf only: audio/mpeg is rejected", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, contentType: "audio/mpeg" },
      fellowToken,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("attendance rejects a file over the bucket maximum", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, size: TOO_LARGE },
      fellowToken,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("File too large");
    expect(body.url).toBeUndefined();
  });

  test("content-type with a charset parameter is still accepted", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      {
        ...attendanceBody,
        contentType: "application/pdf; charset=utf-8",
        groupId: attendanceTarget.groupId,
        sessionId: attendanceTarget.sessionId,
      },
      attendanceTargetToken,
    );
    expect(res.status()).toBe(200);
    expect(body.url).toBeDefined();
  });

  test("Fellow cannot mint a recordings URL", async ({ request }) => {
    const { res, body } = await postPresign(request, recordingBody, fellowToken);
    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign recordings (Supervisor session)", () => {
  test("Supervisor can mint a recordings URL for their fellow's group", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      {
        ...recordingBody,
        groupId: recordingTarget.groupId,
        sessionId: recordingTarget.sessionId,
      },
      recordingTargetToken,
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
    const foreignGroupId = recordingTarget.foreignGroupId ?? "grp_not_mine";
    const { res, body } = await postPresign(
      request,
      {
        ...recordingBody,
        groupId: foreignGroupId,
        sessionId: recordingTarget.sessionId,
      },
      recordingTargetToken,
    );

    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });

  test("recordings is audio only: application/pdf is rejected", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      { ...recordingBody, contentType: "application/pdf" },
      supervisorToken,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Unsupported content type");
    expect(body.url).toBeUndefined();
  });

  test("recordings rejects a file over the 500MB maximum", async ({ request }) => {
    const { res, body } = await postPresign(
      request,
      { ...recordingBody, size: TOO_LARGE },
      supervisorToken,
    );
    expect(res.status()).toBe(400);
    expect(body.error).toBe("File too large");
    expect(body.url).toBeUndefined();
  });

  test("Supervisor cannot mint a student-attendance URL", async ({ request }) => {
    const { res, body } = await postPresign(request, attendanceBody, supervisorToken);
    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });
});

test.describe("S3 presign other roles", () => {
  test("Hub coordinator cannot mint recordings", async ({ request }) => {
    const { res, body } = await postPresign(request, recordingBody, hubToken);
    expect(res.status()).toBe(403);
    expect(body.url).toBeUndefined();
  });

  test("Hub coordinator cannot mint student-attendance", async ({ request }) => {
    const { res, body } = await postPresign(request, attendanceBody, hubToken);
    expect(res.status()).toBe(403);
    expect(body.url).toBeUndefined();
  });

  test("Admin cannot mint student-attendance as if they were a Fellow", async ({ request }) => {
    const { res, body } = await postPresign(request, attendanceBody, adminToken);
    expect(res.status()).toBe(403);
    expect(body.url).toBeUndefined();
  });

  test("Admin cannot mint recordings", async ({ request }) => {
    const { res, body } = await postPresign(request, recordingBody, adminToken);
    expect(res.status()).toBe(403);
    expect(body.url).toBeUndefined();
  });
});
