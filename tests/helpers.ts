import type { BrowserContext } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  adminUser,
  clinicalCaseNotes,
  clinicalCaseTermination,
  clinicalCaseTransferTrail,
  clinicalExpertCaseNotes,
  clinicalFollowUpTreatmentPlan,
  clinicalFollowUpTreatmentPlanAuditTrail,
  clinicalScreeningInfo,
  clinicalSessionAttendance,
  implementerMember,
  session,
  student,
  user,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { createSessionCookie } from "#/lib/auth/test-auth";
import { type Role, pickUser } from "#/tests/platform-routes";

/**
 * A new user with an admin profile in each implementer the seeded admin is an ADMIN of, so a test
 * can sign it out, archive it or switch its project without touching a user another spec signs in
 * as. Pass `remove` to `undo`.
 */
export async function createAdminCopy(seededUserId: string, activeProjectId?: string) {
  const email = `e2e-admin-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const [created] = await db
    .insert(user)
    .values({ email, name: "E2E Admin", activeProjectId })
    .returning({ id: user.id });
  if (!created) throw new Error("could not create the admin copy");
  const remove = async () => {
    await db.delete(session).where(eq(session.userId, created.id));
    await db.delete(implementerMember).where(eq(implementerMember.userId, created.id));
    await db.delete(adminUser).where(eq(adminUser.email, email));
    await db.delete(user).where(eq(user.id, created.id));
  };
  const memberships = await db.query.implementerMember.findMany({
    where: (m, { and, eq }) => and(eq(m.userId, seededUserId), eq(m.role, "ADMIN")),
    columns: { implementerId: true },
  });
  if (memberships.length === 0) {
    await remove();
    throw new Error("the seeded user has no ADMIN membership to copy");
  }
  for (const { implementerId } of memberships) {
    const [profile] = await db
      .insert(adminUser)
      .values({ email, adminName: "E2E Admin", implementerId })
      .returning({ id: adminUser.id });
    if (!profile) throw new Error("could not create an admin profile");
    await db
      .insert(implementerMember)
      .values({ implementerId, userId: created.id, role: "ADMIN", identifier: profile.id });
  }
  return { id: created.id, email, remove };
}

/**
 * Fails the test when a fixture query finds nothing. CI seeds the same data on every run, so missing
 * data is a seed regression, not a reason to skip.
 */
export function required<T>(value: T, what: string): asserts value is NonNullable<T> {
  if (!value) throw new Error(`seed the database first: ${what}`);
}

/** A signed session cookie for the user, backed by a new row in `sessions`. */
export async function sessionCookieFor(email: string) {
  const user = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, email),
    columns: { id: true },
  });
  if (!user) throw new Error(`No user with email ${email}`);
  return createSessionCookie(user.id);
}

/**
 * A seeded user for a role, chosen from the database rather than from a fixed email, because the
 * seed reassigns the fixture accounts. Same picker the bench harness uses, so the tests and the
 * benchmark exercise the same accounts.
 */
export async function signInAs(context: BrowserContext, role: Role) {
  const user = await pickUser(role);
  await signInWithEmail(context, user.email);
  return user;
}

/**
 * SQL that holds when the implementer member `alias` can sign in as its role: the user has one
 * membership, so the session's active role is that one, and its organisation runs a hub in the
 * default project, without which sign-in fails with "No active membership".
 */
export function signableMember(alias = "m") {
  const member = sql.raw(alias);
  return sql`(select count(*) from implementer_members o where o.user_id = ${member}.user_id) = 1
    and exists (select 1 from hubs h join projects p on p.id = h.project_id
      where h.implementer_id = ${member}.implementer_id and p.is_default)`;
}

export function uniqueFellowName(alias = "f") {
  const fellow = sql.raw(alias);
  return sql`(select count(*) from fellows o where o.fellow_name = ${fellow}.fellow_name) = 1`;
}

export function onlySessionAtSchoolThatWeek(alias = "i") {
  const session = sql.raw(alias);
  return sql`not exists (select 1 from intervention_sessions o
    where o.school_id = ${session}.school_id and o.id <> ${session}.id
      and abs(extract(epoch from o.session_date - ${session}.session_date)) < 7 * 24 * 3600)`;
}

/**
 * The email of the user behind a profile (a supervisor, hub coordinator, ...). Only users with one
 * membership qualify, so the session's active role is the one asked for.
 */
export async function emailForProfile(identifier: string, role: Role) {
  const {
    rows: [row],
  } = await db.execute<{ email: string }>(sql`
    select u.email from implementer_members m
    join users u on u.id = m.user_id
    where m.identifier = ${identifier} and m.role = ${role}
      and ${signableMember()}
    order by u.email
    limit 1`);
  return row?.email ?? null;
}

export async function signInWithEmail(context: BrowserContext, email: string) {
  await context.addCookies([await sessionCookieFor(email)]);
}

/**
 * A new Active clinical case for a new student at `schoolId`, so a spec can change the case
 * without touching seed data or another spec's case. `remove` deletes everything that references
 * it, then the case and the student.
 */
export async function createClinicalCase(owner: { schoolId: string; currentSupervisorId: string }) {
  const label = `e2e-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const studentId = objectId("stu");
  const studentName = `${label} student`;
  // The case's edit form needs the fields a seeded student has, its group among them.
  const group = await db.query.interventionGroup.findFirst({
    where: (g, { and, eq, isNull }) => and(eq(g.schoolId, owner.schoolId), isNull(g.archivedAt)),
    columns: { id: true },
    orderBy: (g, { asc }) => asc(g.id),
  });
  if (!group) throw new Error(`seed the database first: school ${owner.schoolId} has no group`);
  await db.insert(student).values({
    id: studentId,
    visibleId: label,
    studentName,
    schoolId: owner.schoolId,
    assignedGroupId: group.id,
    admissionNumber: "9001",
    gender: "Female",
    form: 2,
    stream: "B",
  });
  const [created] = await db
    .insert(clinicalScreeningInfo)
    .values({
      studentId,
      currentSupervisorId: owner.currentSupervisorId,
      caseStatus: "Active",
      riskStatus: "No",
      pseudonym: label,
    })
    .returning({ id: clinicalScreeningInfo.id });
  if (!created) throw new Error("could not insert the clinical case fixture");
  const caseId = created.id;

  async function remove() {
    await db.delete(clinicalCaseNotes).where(eq(clinicalCaseNotes.caseId, caseId));
    await db.delete(clinicalCaseTermination).where(eq(clinicalCaseTermination.caseId, caseId));
    await db.delete(clinicalExpertCaseNotes).where(eq(clinicalExpertCaseNotes.caseId, caseId));
    await db.delete(clinicalCaseTransferTrail).where(eq(clinicalCaseTransferTrail.caseId, caseId));
    await db
      .delete(clinicalFollowUpTreatmentPlanAuditTrail)
      .where(eq(clinicalFollowUpTreatmentPlanAuditTrail.caseId, caseId));
    await db
      .delete(clinicalFollowUpTreatmentPlan)
      .where(eq(clinicalFollowUpTreatmentPlan.caseId, caseId));
    await db.delete(clinicalSessionAttendance).where(eq(clinicalSessionAttendance.caseId, caseId));
    await db.delete(clinicalScreeningInfo).where(eq(clinicalScreeningInfo.id, caseId));
    await db.delete(student).where(eq(student.id, studentId));
  }

  return { caseId, pseudonym: label, studentName, remove };
}
