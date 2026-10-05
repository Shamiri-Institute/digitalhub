import { readFileSync } from "node:fs";
import path from "node:path";

import { type APIRequestContext, expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalScreeningInfo, student, supervisor, user } from "#/db/schema";
import { generateSessionToken } from "#/tests/helpers";

/**
 * Server actions are public endpoints. Anyone with a session can POST to one by its action id,
 * whatever the UI shows them. These tests call actions directly as the wrong user and check that
 * the database does not change.
 *
 * Each refusal has a control: the rightful user makes the same call and it lands. Without the
 * control, a wrong action id would make every refusal pass.
 */

const MANIFEST = path.join(__dirname, "../../.next/dev/server/server-reference-manifest.json");
const CLINICAL_ACTIONS = "app/(platform)/sc/clinical/action.ts";
const SUPERVISOR_ACTIONS = "app/(platform)/hc/supervisors/actions.ts";

/** The id Next.js gave a server action. The dev server records it when it compiles a page. */
function actionId(filename: string, exportedName: string) {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    node: Record<string, { filename?: string; exportedName?: string }>;
  };
  const entry = Object.entries(manifest.node).find(
    ([, action]) => action.filename === filename && action.exportedName === exportedName,
  );
  if (!entry) throw new Error(`no server action ${exportedName} in ${filename}`);
  return entry[0];
}

function cookie(token: string) {
  return { cookie: `next-auth.session-token=${token}` };
}

async function callAction(
  request: APIRequestContext,
  route: string,
  id: string,
  token: string,
  args: unknown[],
) {
  const res = await request.post(route, {
    headers: { "Next-Action": id, "Content-Type": "text/plain;charset=UTF-8", ...cookie(token) },
    data: JSON.stringify(args),
  });
  return res.text();
}

/** A user who holds exactly one membership, so the active role is the one asked for. */
async function signIn(identifier: string, role: string) {
  const {
    rows: [row],
  } = await db.execute<{ email: string }>(sql`
    select u.email from implementer_members m
    join users u on u.id = m.user_id
    where m.identifier = ${identifier} and m.role = ${role} and u.email is not null
      and (select count(*) from implementer_members o where o.user_id = m.user_id) = 1
    limit 1`);
  if (!row) throw new Error(`seed the database first: no single-membership ${role} ${identifier}`);
  return generateSessionToken(row.email);
}

/** Profiles of a role that can sign in, in a stable order. */
async function signableProfiles(table: string, role: string, hubColumn: string) {
  const { rows } = await db.execute<{ id: string; hubId: string }>(sql`
    select p.id, p.${sql.raw(hubColumn)} as "hubId" from ${sql.raw(table)} p
    join implementer_members m on m.identifier = p.id and m.role = ${role}
    join users u on u.id = m.user_id and u.email is not null
    where p.${sql.raw(hubColumn)} is not null
      and (select count(*) from implementer_members o where o.user_id = m.user_id) = 1
    order by p.id`);
  return rows;
}

test.describe("clinical case actions", () => {
  test.describe.configure({ mode: "serial" });

  let caseId: string;
  let ownerId: string;
  let ownerHubId: string;
  let ownerToken: string;
  let outsiderToken: string;
  let fellowToken: string;

  test.beforeAll(async ({ request }) => {
    const supervisors = await signableProfiles("supervisors", "SUPERVISOR", "hub_id");
    const owned = await db.query.clinicalScreeningInfo.findFirst({
      where: (c, { and, eq, inArray }) =>
        and(
          eq(c.caseStatus, "Active"),
          inArray(
            c.currentSupervisorId,
            supervisors.map((s) => s.id),
          ),
        ),
      orderBy: (c, { asc }) => asc(c.id),
      columns: { id: true, currentSupervisorId: true },
    });
    const owner = supervisors.find((s) => s.id === owned?.currentSupervisorId);
    const outsider = supervisors.find((s) => owner && s.hubId !== owner.hubId);
    if (!owned || !owner || !outsider) {
      throw new Error("seed the database first: no active case with an owner and an outsider");
    }
    caseId = owned.id;
    ownerId = owner.id;
    ownerHubId = owner.hubId;
    ownerToken = await signIn(owner.id, "SUPERVISOR");
    outsiderToken = await signIn(outsider.id, "SUPERVISOR");

    const [fellow] = await signableProfiles("fellows", "FELLOW", "hub_id");
    if (!fellow) throw new Error("seed the database first: no fellow");
    fellowToken = await signIn(fellow.id, "FELLOW");

    // Compile the page so the dev server records the action ids.
    await request.get("/sc/clinical", { headers: cookie(ownerToken) });
  });

  async function caseStatus() {
    const row = await db.query.clinicalScreeningInfo.findFirst({
      where: (c, { eq }) => eq(c.id, caseId),
      columns: { caseStatus: true },
    });
    return row?.caseStatus;
  }

  async function moveToFollowUp(request: APIRequestContext, token: string) {
    const id = actionId(CLINICAL_ACTIONS, "triggerCaseStatusToFollowup");
    await callAction(request, "/sc/clinical", id, token, [{ caseId }]);
  }

  // Every test starts from an active case, including after a refusal that failed to refuse.
  test.afterEach(async () => {
    await db
      .update(clinicalScreeningInfo)
      .set({ caseStatus: "Active" })
      .where(eq(clinicalScreeningInfo.id, caseId));
  });

  test("the case's supervisor can move it to follow-up (control)", async ({ request }) => {
    await moveToFollowUp(request, ownerToken);
    expect(await caseStatus()).toBe("FollowUp");
  });

  test("a supervisor from another hub cannot change the case", async ({ request }) => {
    await moveToFollowUp(request, outsiderToken);
    expect(await caseStatus()).toBe("Active");
  });

  test("a fellow cannot change the case", async ({ request }) => {
    await moveToFollowUp(request, fellowToken);
    expect(await caseStatus()).toBe("Active");
  });

  test("editing student info changes the case's student, not one named in the request", async ({
    request,
  }) => {
    const ownCase = await db.query.clinicalScreeningInfo.findFirst({
      where: (c, { eq }) => eq(c.id, caseId),
      columns: { pseudonym: true },
      with: { student: true },
    });
    const victim = await db.query.student.findFirst({
      where: (s, { ne }) => ne(s.id, ownCase?.student.id ?? ""),
      orderBy: (s, { asc }) => asc(s.id),
    });
    if (!ownCase || !victim) throw new Error("seed the database first: no students");
    const marker = `E2E student ${Date.now()}`;

    try {
      const id = actionId(CLINICAL_ACTIONS, "updateStudentInfo");
      await callAction(request, "/sc/clinical", id, ownerToken, [
        {
          caseId,
          studentId: victim.id,
          studentName: marker,
          pseudonym: ownCase.pseudonym ?? "E2E",
          gender: ownCase.student.gender ?? "Female",
          admissionNumber: ownCase.student.admissionNumber ?? "1",
          classForm: String(ownCase.student.form ?? 1),
          stream: ownCase.student.stream ?? "A",
          school: "unused",
          shamiriId: "unused",
          group: "unused",
        },
      ]);

      const [own, other] = await Promise.all(
        [ownCase.student.id, victim.id].map((studentId) =>
          db.query.student.findFirst({
            where: (s, { eq }) => eq(s.id, studentId),
            columns: { studentName: true },
          }),
        ),
      );
      expect(own?.studentName).toBe(marker);
      expect(other?.studentName).toBe(victim.studentName);
    } finally {
      // Restore both rows: when the action is broken, it overwrites the victim.
      for (const original of [ownCase.student, victim]) {
        await db
          .update(student)
          .set({
            studentName: original.studentName,
            admissionNumber: original.admissionNumber,
            form: original.form,
            stream: original.stream,
            gender: original.gender,
          })
          .where(eq(student.id, original.id));
      }
    }
  });

  test("a new case takes its creator from the session and stays in the creator's hub", async ({
    request,
  }) => {
    const [ownSchool, otherSchool] = await Promise.all([
      db.query.school.findFirst({
        where: (s, { eq }) => eq(s.hubId, ownerHubId),
        orderBy: (s, { asc }) => asc(s.id),
        columns: { id: true },
        with: {
          students: { columns: { id: true }, limit: 1 },
          interventionSessions: { columns: { id: true }, limit: 1 },
        },
      }),
      db.query.school.findFirst({
        where: (s, { ne }) => ne(s.hubId, ownerHubId),
        orderBy: (s, { asc }) => asc(s.id),
        columns: { id: true },
        with: {
          students: { columns: { id: true }, limit: 1 },
          interventionSessions: { columns: { id: true }, limit: 1 },
        },
      }),
    ]);
    const own = ownSchool && {
      student: ownSchool.students[0],
      session: ownSchool.interventionSessions[0],
    };
    const other = otherSchool && {
      student: otherSchool.students[0],
      session: otherSchool.interventionSessions[0],
    };
    if (
      !ownSchool ||
      !otherSchool ||
      !own?.student ||
      !own.session ||
      !other?.student ||
      !other.session
    ) {
      throw new Error("seed the database first: no schools with students and sessions");
    }
    const marker = `E2E case ${Date.now()}`;
    const id = actionId(CLINICAL_ACTIONS, "createStudentClinicalCase");
    const createCase = (schoolId: string, studentId: string, sessionId: string) =>
      callAction(request, "/sc/clinical", id, ownerToken, [
        {
          schoolId,
          studentId,
          pseudonym: marker,
          initialContact: "E2E",
          sessionId,
          // Ignored by the action; an old client sent these and the server trusted them.
          creatorId: "sup_not_the_caller",
          role: "CLINICAL_LEAD",
        },
      ]);

    try {
      await createCase(otherSchool.id, other.student.id, other.session.id);
      await createCase(ownSchool.id, own.student.id, own.session.id);

      const created = await db.query.clinicalScreeningInfo.findMany({
        where: (c, { eq }) => eq(c.pseudonym, marker),
        columns: { schoolId: true, currentSupervisorId: true, clinicalLeadId: true },
      });
      expect(created).toEqual([
        { schoolId: ownSchool.id, currentSupervisorId: ownerId, clinicalLeadId: null },
      ]);
    } finally {
      await db.delete(clinicalScreeningInfo).where(eq(clinicalScreeningInfo.pseudonym, marker));
    }
  });
});

test.describe("supervisor details", () => {
  test.describe.configure({ mode: "serial" });

  let target: typeof supervisor.$inferSelect;
  let targetUserId: string;
  let targetEmail: string | null;
  let ownHubToken: string;
  let otherHubToken: string;

  test.beforeAll(async ({ request }) => {
    const [supervisors, coordinators] = await Promise.all([
      signableProfiles("supervisors", "SUPERVISOR", "hub_id"),
      signableProfiles("hub_coordinators", "HUB_COORDINATOR", "assigned_hub_id"),
    ]);
    const picked = supervisors.find((s) => coordinators.some((c) => c.hubId === s.hubId));
    const own = coordinators.find((c) => c.hubId === picked?.hubId);
    const other = coordinators.find((c) => c.hubId !== picked?.hubId);
    if (!picked || !own || !other) {
      throw new Error("seed the database first: no supervisor with coordinators in two hubs");
    }
    const [row] = await db.select().from(supervisor).where(eq(supervisor.id, picked.id));
    const member = await db.query.implementerMember.findFirst({
      where: (m, { and, eq }) => and(eq(m.identifier, picked.id), eq(m.role, "SUPERVISOR")),
      columns: { userId: true },
    });
    const targetUser = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, member?.userId ?? ""),
      columns: { email: true },
    });
    if (!row || !member || !targetUser) throw new Error(`supervisor ${picked.id} has no user`);
    target = row;
    targetUserId = member.userId;
    targetEmail = targetUser.email;
    ownHubToken = await signIn(own.id, "HUB_COORDINATOR");
    otherHubToken = await signIn(other.id, "HUB_COORDINATOR");

    // Compile the page so the dev server records the action ids.
    await request.get("/hc/supervisors", { headers: cookie(ownHubToken) });
  });

  async function updateDetails(
    request: APIRequestContext,
    token: string,
    changes: { supervisorName: string; personalEmail: string },
  ) {
    const id = actionId(SUPERVISOR_ACTIONS, "updateSupervisorDetails");
    await callAction(request, "/hc/supervisors", id, token, [
      {
        supervisorId: target.id,
        idNumber: target.idNumber ?? "12345678",
        cellNumber: "+254712345678",
        mpesaNumber: "+254712345678",
        mpesaName: target.mpesaName ?? "E2E",
        county: "Nairobi",
        subCounty: "Dagoretti North",
        gender: target.gender ?? "Female",
        dateOfBirth: (target.dateOfBirth ?? new Date(1990, 0, 1)).toISOString(),
        ...changes,
      },
    ]);
  }

  async function currentState() {
    const [row] = await db
      .select({ name: supervisor.supervisorName, email: user.email })
      .from(supervisor)
      .innerJoin(user, eq(user.id, targetUserId))
      .where(eq(supervisor.id, target.id));
    return row;
  }

  test.afterAll(async () => {
    await db.update(supervisor).set(target).where(eq(supervisor.id, target.id));
    await db.update(user).set({ email: targetEmail }).where(eq(user.id, targetUserId));
  });

  test("a coordinator in the supervisor's hub can edit them (control)", async ({ request }) => {
    const before = await currentState();
    const marker = `E2E supervisor ${Date.now()}`;
    await updateDetails(request, ownHubToken, {
      supervisorName: marker,
      personalEmail: before?.email ?? "",
    });
    expect(await currentState()).toEqual({ name: marker, email: before?.email });
  });

  test("a coordinator in another hub cannot change the supervisor's login email", async ({
    request,
  }) => {
    const before = await currentState();
    await updateDetails(request, otherHubToken, {
      supervisorName: "E2E takeover",
      personalEmail: `e2e-takeover-${Date.now()}@example.com`,
    });
    expect(await currentState()).toEqual(before);
  });
});
