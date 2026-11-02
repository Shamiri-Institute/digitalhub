import { type APIRequestContext, expect, test } from "@playwright/test";

import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  notExists,
  or,
  type SQLWrapper,
} from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  implementerMember,
  interventionGroup,
  interventionSession,
  sessionRecording,
  user,
} from "#/db/schema";
import { emailForProfile, required, sessionCookieFor } from "#/tests/helpers";
import { pickUser } from "#/tests/platform-routes";

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
  /** Another leader's group, with an occurred session at its own school. */
  foreign: { groupId: string; sessionId: string } | null;
};

async function sessionCookieHeader(email: string) {
  const { name, value } = await sessionCookieFor(email);
  return `${name}=${value}`;
}

async function postPresign(request: APIRequestContext, data: unknown, token?: string) {
  const res = await request.post(PRESIGN, {
    data,
    headers: token ? { cookie: token } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

const activeFellowIds = db
  .select({ id: fellow.id })
  .from(fellow)
  .where(or(eq(fellow.droppedOut, false), isNull(fellow.droppedOut)));

const schoolsWithOccurredSessions = db
  .select({ schoolId: interventionSession.schoolId })
  .from(interventionSession)
  .where(eq(interventionSession.occurred, true));

/**
 * A group led by one of `leaderIds`, and an occurred session at that group's school. Asking for it
 * passes every check but the one on who leads or supervises the group, so only that check can
 * refuse it.
 */
async function foreignGroupWithSession(leaderIds: SQLWrapper) {
  const [foreign] = await db
    .select({ groupId: interventionGroup.id, sessionId: interventionSession.id })
    .from(interventionGroup)
    .innerJoin(
      interventionSession,
      and(
        eq(interventionSession.schoolId, interventionGroup.schoolId),
        eq(interventionSession.occurred, true),
      ),
    )
    .where(
      and(
        inArray(interventionGroup.leaderId, leaderIds),
        isNull(interventionGroup.archivedAt),
        notExists(
          db
            .select({ id: sessionRecording.id })
            .from(sessionRecording)
            .where(
              and(
                eq(sessionRecording.groupId, interventionGroup.id),
                eq(sessionRecording.sessionId, interventionSession.id),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(interventionGroup.id), asc(interventionSession.id))
    .limit(1);
  return foreign ?? null;
}

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

  const otherLeaders = db
    .select({ id: fellow.id })
    .from(fellow)
    .where(ne(fellow.id, group.leaderId));

  return {
    email,
    fellowId: group.leaderId,
    groupId: group.id,
    sessionId: session.id,
    foreign: await foreignGroupWithSession(otherLeaders),
  };
}

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
    .where(
      and(
        ne(fellow.supervisorId, supervisorId),
        or(eq(fellow.droppedOut, false), isNull(fellow.droppedOut)),
      ),
    );

  return {
    email: target.email,
    fellowId: target.fellowId,
    groupId: target.groupId,
    sessionId: target.sessionId,
    foreign: await foreignGroupWithSession(otherSupervisorsFellows),
  };
}

/** A real group and session, so a refusal comes from the role, not from a missing group. */
function ownedBy(target: UploadTarget) {
  return { groupId: target.groupId, sessionId: target.sessionId };
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
  const [fellowUser, supervisorUser, hubUser, adminUser] = await Promise.all([
    pickUser("FELLOW"),
    pickUser("SUPERVISOR"),
    pickUser("HUB_COORDINATOR"),
    pickUser("ADMIN"),
  ]);

  fellowToken = await sessionCookieHeader(fellowUser.email);
  supervisorToken = await sessionCookieHeader(supervisorUser.email);
  hubToken = await sessionCookieHeader(hubUser.email);
  adminToken = await sessionCookieHeader(adminUser.email);

  const fellowTarget = await findFellowUploadTarget();
  required(fellowTarget, "no fellow upload target");
  attendanceTarget = fellowTarget;
  attendanceTargetToken = await sessionCookieHeader(attendanceTarget.email);

  const recordingUploadTarget = await findRecordingUploadTarget();
  required(recordingUploadTarget, "no recording upload target");
  recordingTarget = recordingUploadTarget;
  recordingTargetToken = await sessionCookieHeader(recordingTarget.email);
});

test.describe("S3 presign auth gate (unauthenticated)", () => {
  // The session is checked before the body is parsed, so even a body that fails validation is 401.
  for (const [what, data] of [
    ["a student-attendance body", attendanceBody],
    ["a recordings body", recordingBody],
    ["an empty body", {}],
    ["an unknown bucket", { ...attendanceBody, bucket: "payments" }],
  ] as const) {
    test(`POST ${what} without a session returns 401 and no url`, async ({ request }) => {
      const { res, body } = await postPresign(request, data);
      expect(res.status()).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(body.url).toBeUndefined();
    });
  }
});

for (const [what, data] of [
  ["groupId is missing", { ...attendanceBody, groupId: undefined }],
  ["sessionId is missing", { ...attendanceBody, sessionId: undefined }],
  ["size is missing", { ...attendanceBody, size: undefined }],
  ["size is zero", { ...attendanceBody, size: 0 }],
  ["size is a string", { ...attendanceBody, size: "1024" }],
  ["the bucket is unknown", { ...attendanceBody, bucket: "uploads" }],
] as const) {
  test(`a body where ${what} is rejected with 400 and no url`, async ({ request }) => {
    const { res, body } = await postPresign(request, data, fellowToken);
    expect(res.status()).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.url).toBeUndefined();
  });
}

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
    const { foreign } = attendanceTarget;
    required(foreign, "a group another fellow leads, with an occurred session at its school");
    const { res, body } = await postPresign(
      request,
      { ...attendanceBody, ...foreign },
      attendanceTargetToken,
    );

    expect(res.status()).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.url).toBeUndefined();
  });

  for (const contentType of ["text/html", "audio/mpeg"]) {
    test(`attendance is pdf only: ${contentType} is rejected`, async ({ request }) => {
      const { res, body } = await postPresign(
        request,
        { ...attendanceBody, contentType },
        fellowToken,
      );
      expect(res.status()).toBe(400);
      expect(body.error).toBe("Unsupported content type");
      expect(body.url).toBeUndefined();
    });
  }

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
    const { foreign } = recordingTarget;
    required(
      foreign,
      "a group of another supervisor's fellow, with an occurred session at its school",
    );
    const { res, body } = await postPresign(
      request,
      { ...recordingBody, ...foreign },
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
});

test.describe("S3 presign refuses the roles a bucket is not for", () => {
  // Each body names a group and session its uploader may use, so only the role can refuse it.
  const cases = [
    {
      who: "Fellow",
      bucket: "recordings",
      body: () => ({ ...recordingBody, ...ownedBy(attendanceTarget) }),
      token: () => attendanceTargetToken,
    },
    {
      who: "Supervisor",
      bucket: "student-attendance",
      body: () => ({ ...attendanceBody, ...ownedBy(recordingTarget) }),
      token: () => recordingTargetToken,
    },
    {
      who: "Hub coordinator",
      bucket: "recordings",
      body: () => ({ ...recordingBody, ...ownedBy(recordingTarget) }),
      token: () => hubToken,
    },
    {
      who: "Hub coordinator",
      bucket: "student-attendance",
      body: () => ({ ...attendanceBody, ...ownedBy(attendanceTarget) }),
      token: () => hubToken,
    },
    {
      who: "Admin",
      bucket: "recordings",
      body: () => ({ ...recordingBody, ...ownedBy(recordingTarget) }),
      token: () => adminToken,
    },
    {
      who: "Admin",
      bucket: "student-attendance",
      body: () => ({ ...attendanceBody, ...ownedBy(attendanceTarget) }),
      token: () => adminToken,
    },
  ];
  for (const { who, bucket, body: requestBody, token } of cases) {
    test(`${who} cannot mint a ${bucket} URL`, async ({ request }) => {
      const { res, body } = await postPresign(request, requestBody(), token());
      expect(res.status()).toBe(403);
      expect(body.error).toBe("Forbidden");
      expect(body.url).toBeUndefined();
    });
  }
});
