"use server";

import { revalidatePath } from "next/cache";
import { currentSupervisor, getCurrentPersonnel } from "#/app/auth";
import { db } from "#/lib/db";

export type TriageEventForSupervisor = Awaited<
  ReturnType<typeof getTriageEventsForSupervisor>
>[number];

export type FellowForSupervisor = { id: string; fellowName: string | null };

export async function getFellowsForSupervisor(): Promise<FellowForSupervisor[]> {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile) throw new Error("Unauthorised");

  return db.fellow.findMany({
    where: { supervisorId: supervisor.profile.id },
    select: { id: true, fellowName: true },
    orderBy: { fellowName: "asc" },
  });
}

export async function getTriageEventsForSupervisor() {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile) throw new Error("Unauthorised");
  const supervisorId = supervisor.profile.id;

  const events = await db.triageEvent.findMany({
    where: {
      OR: [{ fellow: { supervisorId } }, { referredSupervisorId: supervisorId }],
    },
    include: {
      student: {
        select: {
          id: true,
          visibleId: true,
          studentName: true,
          schoolId: true,
          school: { select: { schoolName: true } },
        },
      },
      fellow: { select: { fellowName: true, supervisorId: true } },
      session: {
        select: {
          sessionDate: true,
          sessionName: true,
          sessionType: true,
          session: { select: { sessionLabel: true } },
        },
      },
      referredSupervisor: { select: { supervisorName: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const studentIds = Array.from(new Set(events.map((e) => e.studentId)));

  const cases = await db.clinicalScreeningInfo.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true, id: true },
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
    db.triageEvent.findMany({
      where: {
        OR: [{ fellow: { supervisorId } }, { referredSupervisorId: supervisorId }],
      },
      select: {
        studentId: true,
        referredSupervisorId: true,
        riskScreenOutcome: true,
        reviewedAt: true,
        createdAt: true,
      },
    }),
    db.clinicalScreeningInfo.findMany({
      where: { currentSupervisorId: supervisorId },
      select: { studentId: true },
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

  const event = await db.triageEvent.findUniqueOrThrow({
    where: { id: triageEventId },
    include: { student: { select: { schoolId: true } } },
  });

  if (event.referredSupervisorId !== supervisorId) throw new Error("Forbidden");

  const schoolId = event.student.schoolId;
  if (!schoolId) throw new Error("Student has no school assigned.");

  const existing = await db.clinicalScreeningInfo.findFirst({
    where: { studentId: event.studentId },
  });
  if (existing) throw new Error("A clinical case already exists for this student.");

  await db.clinicalScreeningInfo.create({
    data: {
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
    },
  });

  revalidatePath("/sc/triage");
}

export async function markTriageReviewed(triageEventId: string, note: string) {
  const user = await getCurrentPersonnel();
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile?.id || !user?.session.user.id) throw new Error("Unauthorised");

  const event = await db.triageEvent.findUniqueOrThrow({ where: { id: triageEventId } });
  if (event.referredSupervisorId !== supervisor.profile.id) throw new Error("Forbidden");

  await db.triageEvent.update({
    where: { id: triageEventId },
    data: {
      reviewedById: user.session.user.id,
      reviewedAt: new Date(),
      reviewNote: note,
    },
  });

  revalidatePath("/sc/triage");
}
