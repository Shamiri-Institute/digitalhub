"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentSupervisor, getCurrentPersonnel } from "#/app/auth";
import { db } from "#/db/client";
import { clinicalScreeningInfo, fellow, triageEvent } from "#/db/schema";

export type TriageEventForSupervisor = Awaited<
  ReturnType<typeof getTriageEventsForSupervisor>
>[number];

export type FellowForSupervisor = { id: string; fellowName: string | null };

/** Events raised by one of the supervisor's fellows, or escalated to the supervisor. */
function supervisedFellowIds(supervisorId: string) {
  return db.select({ id: fellow.id }).from(fellow).where(eq(fellow.supervisorId, supervisorId));
}

export async function getFellowsForSupervisor(): Promise<FellowForSupervisor[]> {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile) throw new Error("Unauthorised");
  const supervisorId = supervisor.profile.id;

  return db.query.fellow.findMany({
    where: (f, { eq }) => eq(f.supervisorId, supervisorId),
    columns: { id: true, fellowName: true },
    orderBy: (f, { asc }) => asc(f.fellowName),
  });
}

export async function getTriageEventsForSupervisor() {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile) throw new Error("Unauthorised");
  const supervisorId = supervisor.profile.id;

  const events = await db.query.triageEvent.findMany({
    where: (t, { or, inArray, eq }) =>
      or(
        inArray(t.fellowId, supervisedFellowIds(supervisorId)),
        eq(t.referredSupervisorId, supervisorId),
      ),
    with: {
      student: {
        columns: { id: true, visibleId: true, studentName: true, schoolId: true },
        with: { school: { columns: { schoolName: true } } },
      },
      fellow: { columns: { fellowName: true, supervisorId: true } },
      session: {
        columns: { sessionDate: true, sessionName: true, sessionType: true },
        with: { session: { columns: { sessionLabel: true } } },
      },
      referredSupervisor: { columns: { supervisorName: true } },
      reviewedBy: { columns: { name: true } },
    },
    orderBy: (t, { desc }) => desc(t.createdAt),
  });

  const studentIds = Array.from(new Set(events.map((e) => e.studentId)));

  const cases =
    studentIds.length === 0
      ? []
      : await db.query.clinicalScreeningInfo.findMany({
          where: (c, { inArray }) => inArray(c.studentId, studentIds),
          columns: { studentId: true, id: true },
        });
  const casesByStudent = new Map(cases.map((c) => [c.studentId, c.id]));

  return events.map((e) => ({
    ...e,
    clinicalCaseExists: casesByStudent.has(e.studentId),
    viewSection:
      e.referredSupervisorId === supervisorId && !casesByStudent.has(e.studentId) && !e.reviewedAt
        ? ("requires_action" as const)
        : ("fellow_activity" as const),
    daysSince: Math.floor((Date.now() - e.createdAt.getTime()) / 86_400_000),
  }));
}

export async function getTriageDashboardStats() {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile) throw new Error("Unauthorised");
  const supervisorId = supervisor.profile.id;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [events, cases] = await Promise.all([
    db.query.triageEvent.findMany({
      where: (t, { or, inArray, eq }) =>
        or(
          inArray(t.fellowId, supervisedFellowIds(supervisorId)),
          eq(t.referredSupervisorId, supervisorId),
        ),
      columns: {
        studentId: true,
        referredSupervisorId: true,
        riskScreenOutcome: true,
        reviewedAt: true,
        createdAt: true,
      },
    }),
    db.query.clinicalScreeningInfo.findMany({
      where: (c, { eq }) => eq(c.currentSupervisorId, supervisorId),
      columns: { studentId: true },
    }),
  ]);

  const caseStudentIds = new Set(cases.map((c) => c.studentId));

  const unactionedEscalations = events.filter(
    (e) =>
      e.referredSupervisorId === supervisorId && !caseStudentIds.has(e.studentId) && !e.reviewedAt,
  );

  return {
    unactionedCount: unactionedEscalations.length,
    overdueCount: unactionedEscalations.filter((e) => {
      const days = Math.floor((Date.now() - e.createdAt.getTime()) / 86_400_000);
      return days > 3;
    }).length,
    triageThisWeek: events.filter((e) => e.createdAt >= weekStart).length,
    riskPositiveThisWeek: events.filter(
      (e) => e.riskScreenOutcome === "ANY_YES" && e.createdAt >= weekStart,
    ).length,
  };
}

export async function createClinicalCaseFromTriage(triageEventId: string, pseudonym: string) {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile) throw new Error("Unauthorised");
  const supervisorId = supervisor.profile.id;

  const event = await db.query.triageEvent.findFirst({
    where: (t, { eq }) => eq(t.id, triageEventId),
    with: { student: { columns: { schoolId: true } } },
  });
  if (!event) throw new Error("Triage event not found.");

  if (event.referredSupervisorId !== supervisorId) throw new Error("Forbidden");

  const schoolId = event.student.schoolId;
  if (!schoolId) throw new Error("Student has no school assigned.");

  const existing = await db.query.clinicalScreeningInfo.findFirst({
    where: (c, { eq }) => eq(c.studentId, event.studentId),
  });
  if (existing) throw new Error("A clinical case already exists for this student.");

  await db.insert(clinicalScreeningInfo).values({
    studentId: event.studentId,
    schoolId,
    currentSupervisorId: supervisorId,
    initialReferredFrom: event.fellowId,
    initialReferredFromSpecified: "fellow",
    sessionWhenCaseIsFlaggedId: event.sessionId,
    pseudonym: pseudonym.trim(),
    flagged: false,
    riskStatus: event.riskScreenOutcome === "ANY_YES" ? "High" : "No",
    caseStatus: "Active",
  });

  revalidatePath("/sc/triage");
}

export async function markTriageReviewed(triageEventId: string, note: string) {
  const user = await getCurrentPersonnel();
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile?.id || !user?.session.user.id) throw new Error("Unauthorised");

  const event = await db.query.triageEvent.findFirst({
    where: (t, { eq }) => eq(t.id, triageEventId),
  });
  if (!event) throw new Error("Triage event not found.");
  if (event.referredSupervisorId !== supervisor.profile.id) throw new Error("Forbidden");

  await db
    .update(triageEvent)
    .set({
      reviewedById: user.session.user.id,
      reviewedAt: new Date(),
      reviewNote: note,
    })
    .where(eq(triageEvent.id, triageEventId));

  revalidatePath("/sc/triage");
}
