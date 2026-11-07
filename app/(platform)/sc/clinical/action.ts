"use server";

import { and, count, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { refresh } from "next/cache";
import type { EditStudentInfoFormValues } from "#/app/(platform)/sc/clinical/components/view-edit-student-info";
import { currentSupervisor, getCurrentUserSession } from "#/app/auth";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { db, isUniqueViolation, type Transaction } from "#/db/client";
import {
  caseStatusOptions,
  type ClinicalSessionLabel,
  clinicalSessionLabels,
  ImplementerRole,
} from "#/db/enums";
import { nextStudentVisibleId } from "#/db/sql";
import {
  clinicalCaseNotes,
  clinicalCaseReopening,
  clinicalCaseReview,
  clinicalCaseTermination,
  clinicalCaseTransferTrail,
  clinicalFollowUpTreatmentPlan,
  clinicalFollowUpTreatmentPlanAuditTrail,
  clinicalScreeningInfo,
  clinicalSessionAttendance,
  hub,
  type JsonValue,
  student,
  supervisor,
} from "#/db/schema";
import { latestRisk } from "#/lib/actions/clinical/cases";
import { objectId } from "#/lib/crypto";

export type ClinicalCases = Awaited<ReturnType<typeof getClinicalCases>>[number];
export type SchoolsInHubData = Awaited<ReturnType<typeof getSchoolsInHub>>;

function requireUpdated<T>(rows: T[], what: string): T {
  const row = rows[0];
  if (!row) {
    throw new Error(`${what} not found`);
  }
  return row;
}

async function requireClinicalActor() {
  const session = await getCurrentUserSession();
  const userId = session?.user.id;
  const role = session?.user.activeMembership?.role;
  const identifier = session?.user.activeMembership?.identifier;
  if (!userId || !identifier) {
    throw new Error("Unauthorized");
  }

  if (role === ImplementerRole.SUPERVISOR) {
    const supervisor = await db.query.supervisor.findFirst({
      where: (s, { eq }) => eq(s.id, identifier),
      columns: { id: true, hubId: true },
    });
    if (supervisor) {
      return { role, userId, profileId: supervisor.id, hubId: supervisor.hubId };
    }
  }

  if (role === ImplementerRole.CLINICAL_LEAD) {
    const clinicalLead = await db.query.clinicalLead.findFirst({
      where: (cl, { eq }) => eq(cl.id, identifier),
      columns: { id: true, assignedHubId: true },
    });
    if (clinicalLead) {
      return { role, userId, profileId: clinicalLead.id, hubId: clinicalLead.assignedHubId };
    }
  }

  throw new Error("Unauthorized");
}

/**
 * The actor and the case, after checking the actor may act on it. A supervisor may act on the
 * cases they hold. A clinical lead may act on the cases assigned to them and on every case held
 * by a supervisor in their hub, which is what their hub table lists.
 */
async function requireCaseAccess(caseId: string) {
  const actor = await requireClinicalActor();
  const clinicalCase = await db.query.clinicalScreeningInfo.findFirst({
    where: (c, { eq }) => eq(c.id, caseId),
    columns: {
      id: true,
      studentId: true,
      currentSupervisorId: true,
      clinicalLeadId: true,
      caseStatus: true,
    },
    with: { currentSupervisor: { columns: { hubId: true } } },
  });

  const allowed =
    actor.role === ImplementerRole.SUPERVISOR
      ? clinicalCase?.currentSupervisorId === actor.profileId
      : clinicalCase?.clinicalLeadId === actor.profileId ||
        (actor.hubId !== null && clinicalCase?.currentSupervisor?.hubId === actor.hubId);
  if (!clinicalCase || !allowed) {
    throw new NotFoundError("Clinical case");
  }
  return { actor, clinicalCase };
}

type ClinicalLeadScope = { profileId: string; hubId: string | null };

/** The cases a clinical lead may act on: the rule requireCaseAccess applies, in SQL. */
function clinicalLeadCaseIds(clinicalLead: ClinicalLeadScope) {
  return db
    .select({ id: clinicalScreeningInfo.id })
    .from(clinicalScreeningInfo)
    .where(
      or(
        eq(clinicalScreeningInfo.clinicalLeadId, clinicalLead.profileId),
        clinicalLead.hubId === null
          ? undefined
          : inArray(
              clinicalScreeningInfo.currentSupervisorId,
              db
                .select({ id: supervisor.id })
                .from(supervisor)
                .where(eq(supervisor.hubId, clinicalLead.hubId)),
            ),
      ),
    );
}

/** Reviews of the terminations and reopenings of the cases a clinical lead may act on. */
function clinicalLeadCaseReviews(
  clinicalLead: ClinicalLeadScope,
  review: Pick<typeof clinicalCaseReview, "terminationId" | "reopeningId">,
) {
  const scopedCaseIds = clinicalLeadCaseIds(clinicalLead);
  return or(
    inArray(
      review.terminationId,
      db
        .select({ id: clinicalCaseTermination.id })
        .from(clinicalCaseTermination)
        .where(inArray(clinicalCaseTermination.caseId, scopedCaseIds)),
    ),
    inArray(
      review.reopeningId,
      db
        .select({ id: clinicalCaseReopening.id })
        .from(clinicalCaseReopening)
        .where(inArray(clinicalCaseReopening.caseId, scopedCaseIds)),
    ),
  );
}

/** The case access and the session, after checking the session is one of that case's sessions. */
async function requireCaseSessionAccess(caseId: string, sessionId: string) {
  const access = await requireCaseAccess(caseId);
  const caseSession = await db.query.clinicalSessionAttendance.findFirst({
    where: (s, { and, eq }) => and(eq(s.id, sessionId), eq(s.caseId, caseId)),
    columns: { id: true, attendanceStatus: true },
  });
  if (!caseSession) {
    throw new Error("Clinical session not found");
  }
  return { ...access, caseSession };
}

/** Case access for the actions only a supervisor can take on a case. */
async function requireSupervisorCaseAccess(caseId: string) {
  const access = await requireCaseAccess(caseId);
  if (access.actor.role !== ImplementerRole.SUPERVISOR) {
    throw new Error("Only a supervisor can do this");
  }
  return access;
}

/** A session label is attended at most once per case; a missed session can be held again. */
async function attendedSessionExists(caseId: string, session: string, exceptSessionId?: string) {
  const attended = await db.query.clinicalSessionAttendance.findFirst({
    where: (s, { and, eq }) =>
      and(
        eq(s.caseId, caseId),
        eq(s.session, session),
        eq(s.attendanceStatus, true),
        exceptSessionId ? ne(s.id, exceptSessionId) : undefined,
      ),
    columns: { id: true },
  });
  return attended !== undefined;
}

const caseSessionIds = (caseId: string) =>
  db
    .select({ id: clinicalSessionAttendance.id })
    .from(clinicalSessionAttendance)
    .where(eq(clinicalSessionAttendance.caseId, caseId));

export async function getClinicalCases() {
  const supervisor = await currentSupervisor();
  if (!supervisor) throw new Error("Unauthorized");
  const supervisorId = supervisor.profile.id;

  const cases = await db.query.clinicalScreeningInfo.findMany({
    where: (c, { eq }) => eq(c.currentSupervisorId, supervisorId),
    orderBy: (c, { desc }) => [desc(c.createdAt), desc(c.id)],
    with: {
      student: {
        with: {
          school: { columns: { schoolName: true } },
          assignedGroup: { columns: { groupName: true } },
        },
      },
      sessions: {
        with: { clinicalCaseNotes: { columns: { riskLevel: true, createdAt: true } } },
      },
      followUptreatmentPlan: true,
      referredFromSupervisor: { columns: { supervisorName: true } },
    },
  });

  return cases.map((caseInfo) => {
    const age = caseInfo.student?.age ? `${caseInfo.student.age} yrs` : "N/A";

    const formattedSessions = caseInfo.sessions.map((session) => ({
      sessionId: session.id,
      session: session.session,
      sessionDate: session.date.toLocaleDateString(),
      attendanceStatus: session.attendanceStatus,
    }));

    return {
      id: caseInfo.id,
      school: caseInfo.student?.school?.schoolName,
      pseudonym: caseInfo.pseudonym || "Anonymous",
      dateAdded: caseInfo.createdAt.toLocaleDateString(),
      caseStatus: caseInfo.caseStatus,
      ...latestRisk(caseInfo.sessions, caseInfo),
      age,
      referralFrom:
        caseInfo.referredFromSupervisor?.supervisorName ||
        caseInfo.referredFromSpecified ||
        caseInfo.initialReferredFromSpecified ||
        "Unknown",
      hubId: supervisor.profile.hubId,
      flagged: caseInfo.flagged,
      flaggedReason: caseInfo.flaggedReason,
      sessionAttendanceHistory: formattedSessions,
      student: caseInfo.student,
      emergencyPresentingIssuesBaseline: caseInfo.emergencyPresentingIssuesBaseline,
      generalPresentingIssuesBaseline: caseInfo.generalPresentingIssuesBaseline,
      emergencyPresentingIssuesEndpoint: caseInfo.emergencyPresentingIssuesEndpoint,
      generalPresentingIssuesEndpoint: caseInfo.generalPresentingIssuesEndpoint,
      generalPresentingIssuesOtherSpecifiedBaseline:
        caseInfo.generalPresentingIssuesOtherSpecifiedBaseline,
      generalPresentingIssuesOtherSpecifiedEndpoint:
        caseInfo.generalPresentingIssuesOtherSpecifiedEndpoint,
      clinicalSessionAttendance: caseInfo.sessions,
      currentSupervisorId: caseInfo.currentSupervisorId,
      clinicalLeadId: caseInfo.clinicalLeadId,
      role: "SUPERVISOR",
      treatmentPlanUploaded: !!caseInfo.followUptreatmentPlan,
    };
  });
}

export async function getClinicalCasesStats() {
  const supervisor = await currentSupervisor();
  if (!supervisor) throw new Error("Unauthorized");

  const caseStats = await db
    .select({ caseStatus: clinicalScreeningInfo.caseStatus, count: count() })
    .from(clinicalScreeningInfo)
    .where(eq(clinicalScreeningInfo.currentSupervisorId, supervisor.profile.id))
    .groupBy(clinicalScreeningInfo.caseStatus);

  const stats = caseStats.reduce<{
    totalCases: number;
    completedCases: number;
    followUpCases: number;
    activeCases: number;
  }>(
    (acc, stat) => {
      const key =
        stat.caseStatus === "Terminated"
          ? "completedCases"
          : stat.caseStatus === "FollowUp"
            ? "followUpCases"
            : stat.caseStatus === "Active"
              ? "activeCases"
              : null;
      if (key) {
        acc[key] = stat.count;
      }
      return acc;
    },
    {
      totalCases: 0,
      completedCases: 0,
      followUpCases: 0,
      activeCases: 0,
    },
  );

  stats.totalCases = stats.completedCases + stats.followUpCases + stats.activeCases;

  const activeCasesPercentage = (stats.activeCases / stats.totalCases) * 100;
  const followUpCasesPercentage = (stats.followUpCases / stats.totalCases) * 100;
  const completedCasesPercentage = (stats.completedCases / stats.totalCases) * 100;

  return {
    ...stats,
    activeCasesPercentage,
    followUpCasesPercentage,
    completedCasesPercentage,
  };
}

export async function updateClinicalSessionAttendance(
  sessionId: string,
  attendanceStatus: boolean | null,
) {
  const attendance = await db.query.clinicalSessionAttendance.findFirst({
    where: (a, { eq }) => eq(a.id, sessionId),
    columns: { caseId: true, session: true },
    with: { clinicalCaseNotes: { columns: { id: true }, limit: 1 } },
  });
  if (!attendance) {
    throw new Error("Clinical session attendance not found");
  }
  await requireCaseAccess(attendance.caseId);

  if (attendanceStatus !== true && attendance.clinicalCaseNotes.length > 0) {
    return { success: false, message: "This session has case notes, so it stays attended" };
  }
  if (
    attendanceStatus === true &&
    (await attendedSessionExists(attendance.caseId, attendance.session, sessionId))
  ) {
    return { success: false, message: `${attendance.session} is already attended on this case` };
  }

  try {
    requireUpdated(
      await db
        .update(clinicalSessionAttendance)
        .set({ attendanceStatus })
        .where(eq(clinicalSessionAttendance.id, sessionId))
        .returning({ id: clinicalSessionAttendance.id }),
      "Clinical session attendance",
    );

    refresh();

    return {
      success: true,
      message: "Attendance updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update attendance",
    };
  }
}

export async function referClinicalCaseToSupervisor(data: {
  caseId: string;
  recipientSupervisorId: string;
  referralReason: string;
  referralNotes: string;
}) {
  try {
    const { actor } = await requireSupervisorCaseAccess(data.caseId);
    const referrerHubId = actor.hubId;
    if (!referrerHubId) throw new NotFoundError("Supervisor");
    const recipient = await db.query.supervisor.findFirst({
      where: (s, { and, eq }) =>
        and(eq(s.id, data.recipientSupervisorId), eq(s.hubId, referrerHubId)),
      columns: { id: true },
    });
    if (!recipient) throw new NotFoundError("Supervisor");

    await writeReferral(data, actor, {
      role: ImplementerRole.SUPERVISOR,
      id: recipient.id,
    });
    refresh();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

type ClinicalActor = Awaited<ReturnType<typeof requireClinicalActor>>;

/**
 * Opens a referral to one recipient. A new referral replaces any open one, so the case waits on
 * one person at a time.
 */
async function writeReferral(
  data: { caseId: string; referralReason: string; referralNotes: string },
  referrer: ClinicalActor,
  recipient: {
    role: typeof ImplementerRole.SUPERVISOR | typeof ImplementerRole.CLINICAL_LEAD;
    id: string;
  },
) {
  const recipientIsLead = recipient.role === ImplementerRole.CLINICAL_LEAD;
  await db.transaction(async (tx) => {
    requireUpdated(
      await tx
        .update(clinicalScreeningInfo)
        .set({
          referredFrom: referrer.profileId,
          referredTo: recipientIsLead ? "Clinical Lead" : "Supervisor",
          referredToSpecified: recipient.id,
          referredToSupervisorId: recipientIsLead ? null : recipient.id,
          referredToClinicalLeadId: recipientIsLead ? recipient.id : null,
          referralNotes: data.referralNotes,
          referralReason: data.referralReason,
          referralStatus: "Pending",
          acceptCase: false,
        })
        .where(eq(clinicalScreeningInfo.id, data.caseId))
        .returning({ id: clinicalScreeningInfo.id }),
      "Clinical case",
    );
    await tx.insert(clinicalCaseTransferTrail).values({
      caseId: data.caseId,
      from: referrer.profileId,
      fromRole: referrer.role,
      to: recipient.id,
      toRole: recipient.role,
      date: new Date(),
      referralStatus: "Pending",
    });
  });
}

export async function getSchoolsInHub() {
  const supervisor = await currentSupervisor();
  const projectId = supervisor?.profile?.hub?.projectId;
  const hubId = supervisor?.profile.hubId;
  if (!supervisor || !projectId || !hubId) {
    throw new Error("Assigned hub has no project");
  }
  const projectHubIds = db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId));

  const [schools, supervisorsInHub, fellowsInProject, hubs, clinicalLeads] = await Promise.all([
    db.query.school.findMany({
      where: (s, { eq }) => eq(s.hubId, hubId),
      with: {
        students: { columns: { id: true, studentName: true } },
        interventionSessions: {
          columns: { id: true },
          with: { session: { columns: { sessionName: true, sessionLabel: true } } },
        },
      },
    }),
    db.query.supervisor.findMany({
      where: (s, { eq }) => eq(s.hubId, hubId),
      columns: { id: true, supervisorName: true },
    }),
    db.query.fellow.findMany({
      where: (f, { inArray }) => inArray(f.hubId, projectHubIds),
      columns: { id: true, fellowName: true, hubId: true },
    }),
    db.query.hub.findMany({
      where: (h, { eq }) => eq(h.projectId, projectId),
      columns: { id: true, hubName: true },
    }),
    db.query.clinicalLead.findMany({
      where: (cl, { inArray }) => inArray(cl.assignedHubId, projectHubIds),
      columns: { id: true, clinicalLeadName: true },
    }),
  ]);

  return {
    schools,
    supervisorsInHub,
    fellowsInProject,
    currentSupervisorId: supervisor.profile.id,
    hubs,
    clinicalLeads,
  };
}

export async function createStudentClinicalCase(data: {
  studentId?: string;
  schoolId: string;
  pseudonym: string;
  initialContact: string;
  supervisorId?: string;
  fellowId?: string;
  sessionId: string;
  newStudent?: {
    studentName: string;
    admissionNumber: string;
    yearOfBirth: number;
    age: number;
    gender: string;
    classForm: string;
    stream: string;
  };
}) {
  if (!data.studentId && !data.newStudent) {
    return {
      success: false,
      message: "Please select an existing student or provide new student details",
    };
  }

  try {
    const actor = await requireClinicalActor();
    const { hubId } = actor;
    if (!hubId) {
      throw new Error("You have no assigned hub");
    }
    const school = await db.query.school.findFirst({
      where: (s, { and, eq }) => and(eq(s.id, data.schoolId), eq(s.hubId, hubId)),
      columns: { id: true },
    });
    if (!school) {
      throw new Error("School not found in your hub");
    }
    const flaggedSession = await db.query.interventionSession.findFirst({
      where: (s, { and, eq }) => and(eq(s.id, data.sessionId), eq(s.schoolId, school.id)),
      columns: { id: true },
    });
    if (!flaggedSession) {
      throw new Error("Session not found in the selected school");
    }
    if (data.studentId) {
      const { studentId } = data;
      const existing = await db.query.student.findFirst({
        where: (s, { and, eq }) => and(eq(s.id, studentId), eq(s.schoolId, school.id)),
        columns: { id: true },
      });
      if (!existing) {
        throw new Error("Student not found in the selected school");
      }
      const openCase = await db.query.clinicalScreeningInfo.findFirst({
        where: (c, { and, eq, ne }) =>
          and(eq(c.studentId, studentId), ne(c.caseStatus, caseStatusOptions.Terminated)),
        columns: { id: true },
      });
      if (openCase) {
        return { success: false, message: "This student already has an open clinical case" };
      }
    }

    await db.transaction(async (tx) => {
      let studentId = data.studentId;

      if (data.newStudent) {
        const [created] = await tx
          .insert(student)
          .values({
            id: objectId("stu"),
            visibleId: nextStudentVisibleId("CLN"),
            studentName: data.newStudent.studentName,
            schoolId: data.schoolId,
            admissionNumber: data.newStudent.admissionNumber,
            yearOfBirth: data.newStudent.yearOfBirth,
            age: data.newStudent.age,
            gender: data.newStudent.gender,
            form: Number.parseInt(data.newStudent.classForm, 10),
            stream: data.newStudent.stream,
            isClinicalCase: true,
          })
          .returning({ id: student.id });
        studentId = created?.id;
      }

      if (!studentId) {
        throw new Error("No student available to attach the clinical case to");
      }

      await tx.insert(clinicalScreeningInfo).values({
        studentId,
        currentSupervisorId: actor.role === ImplementerRole.SUPERVISOR ? actor.profileId : null,
        pseudonym: data.pseudonym,
        initialReferredFromSpecified: data.initialContact,
        initialReferredFrom: data.fellowId ?? data.supervisorId,
        flagged: false,
        riskStatus: "No",
        caseStatus: "Active",
        sessionWhenCaseIsFlaggedId: data.sessionId,
        clinicalLeadId: actor.role === ImplementerRole.CLINICAL_LEAD ? actor.profileId : null,
      });
    });

    refresh();
    return { success: true, message: "Clinical case created successfully" };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong, please try again",
    };
  }
}

type TreatmentPlanData = {
  caseId: string;
  currentOrsScore: number;
  plannedSessions: number;
  sessionFrequency: string;
  treatmentInterventions: string[];
  otherIntervention?: string;
  interventionExplanation: string;
};

/** A row stored in a jsonb audit column; the driver JSON-serialises it (dates become strings). */
const asJson = (value: unknown) => value as JsonValue;

export async function createTreatmentPlan(
  data: TreatmentPlanData & { role: "CLINICAL_LEAD" | "SUPERVISOR" },
) {
  try {
    const { actor } = await requireCaseAccess(data.caseId);

    await db.transaction(async (tx) => {
      const [treatmentPlan] = await tx
        .insert(clinicalFollowUpTreatmentPlan)
        .values({
          caseId: data.caseId,
          currentORSScore: data.currentOrsScore,
          plannedSessions: data.plannedSessions,
          sessionFrequency: data.sessionFrequency,
          plannedTreatmentIntervention: data.treatmentInterventions,
          plannedTreatmentInterventionExplanation: data.interventionExplanation,
          otherTreatmentIntervention: data.otherIntervention,
        })
        .returning();

      await tx.insert(clinicalFollowUpTreatmentPlanAuditTrail).values({
        caseId: data.caseId,
        action: "Create",
        userId: actor.userId,
        afterData: asJson(treatmentPlan),
      });
    });

    refresh();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateStudentInfo(data: EditStudentInfoFormValues) {
  try {
    // Edit the case's own student; a client-supplied student id could name any student.
    const {
      clinicalCase: { studentId },
    } = await requireCaseAccess(data.caseId);

    await db.transaction(async (tx) => {
      requireUpdated(
        await tx
          .update(student)
          .set({
            studentName: data.studentName,
            gender: data.gender,
            admissionNumber: data.admissionNumber,
            form: Number.parseInt(data.classForm, 10),
            stream: data.stream,
          })
          .where(eq(student.id, studentId))
          .returning({ id: student.id }),
        "Student",
      );

      requireUpdated(
        await tx
          .update(clinicalScreeningInfo)
          .set({ pseudonym: data.pseudonym })
          .where(eq(clinicalScreeningInfo.id, data.caseId))
          .returning({ id: clinicalScreeningInfo.id }),
        "Clinical case",
      );
    });

    refresh();
    return {
      success: true,
      message: "Student information updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update student information",
    };
  }
}

export async function updateClinicalCasePresentingIssues(data: {
  caseId: string;
  emergencyPresentingIssues: { [k: string]: string };
  generalPresentingIssues: { [k: string]: string };
  otherIssues: string;
  /** The columns the page showed. A case whose status changed since the page loaded is refused. */
  phase: "baseline" | "endpoint";
}) {
  try {
    const { clinicalCase } = await requireCaseAccess(data.caseId);
    const currentPhase = clinicalCase.caseStatus === "Active" ? "baseline" : "endpoint";
    if (data.phase !== currentPhase) {
      return { success: false, message: "The case status changed. Reload the page." };
    }
    const updateData =
      currentPhase === "baseline"
        ? {
            emergencyPresentingIssuesBaseline: data.emergencyPresentingIssues,
            generalPresentingIssuesBaseline: data.generalPresentingIssues,
            generalPresentingIssuesOtherSpecifiedBaseline: data.otherIssues,
          }
        : {
            emergencyPresentingIssuesEndpoint: data.emergencyPresentingIssues,
            generalPresentingIssuesEndpoint: data.generalPresentingIssues,
            generalPresentingIssuesOtherSpecifiedEndpoint: data.otherIssues,
          };

    requireUpdated(
      await db
        .update(clinicalScreeningInfo)
        .set(updateData)
        .where(eq(clinicalScreeningInfo.id, data.caseId))
        .returning({ id: clinicalScreeningInfo.id }),
      "Clinical case",
    );

    refresh();
    return { success: true, message: null };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update presenting issues" };
  }
}

export async function terminateClinicalCase(data: {
  caseId: string;
  terminationReason: string;
  terminationReasonExplanation: string;
  sessionId: string;
}) {
  try {
    const { actor } = await requireCaseSessionAccess(data.caseId, data.sessionId);

    await db.transaction(async (tx) => {
      const [terminated] = await tx
        .update(clinicalScreeningInfo)
        .set({ caseStatus: "Terminated" })
        .where(
          and(
            eq(clinicalScreeningInfo.id, data.caseId),
            ne(clinicalScreeningInfo.caseStatus, caseStatusOptions.Terminated),
          ),
        )
        .returning({ id: clinicalScreeningInfo.id });
      if (!terminated) {
        throw new Error("The case is already terminated");
      }

      const termination = requireUpdated(
        await tx
          .insert(clinicalCaseTermination)
          .values({
            caseId: data.caseId,
            terminationDate: new Date(),
            terminationReason: data.terminationReason,
            terminationReasonExplanation: data.terminationReasonExplanation,
            sessionId: data.sessionId,
            createdBy: actor.userId,
          })
          .returning({ id: clinicalCaseTermination.id }),
        "Termination",
      );
      await tx.insert(clinicalCaseReview).values({ terminationId: termination.id });
    });

    refresh();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function unterminateClinicalCase(data: { caseId: string; reason: string }) {
  try {
    const { actor } = await requireCaseAccess(data.caseId);
    if (actor.role !== ImplementerRole.CLINICAL_LEAD) {
      throw new Error("You are not authorized to un-terminate this case");
    }
    const reason = data.reason.trim();
    if (!reason) {
      throw new Error("Reopening a case needs a reason");
    }

    await db.transaction(async (tx) => {
      const [reopened] = await tx
        .update(clinicalScreeningInfo)
        .set({ caseStatus: "Active" })
        .where(
          and(
            eq(clinicalScreeningInfo.id, data.caseId),
            eq(clinicalScreeningInfo.caseStatus, caseStatusOptions.Terminated),
          ),
        )
        .returning({ id: clinicalScreeningInfo.id });
      if (!reopened) {
        throw new Error("The case is not terminated");
      }

      const [termination] = await tx
        .select({ id: clinicalCaseTermination.id })
        .from(clinicalCaseTermination)
        .where(eq(clinicalCaseTermination.caseId, data.caseId))
        .orderBy(desc(clinicalCaseTermination.createdAt), desc(clinicalCaseTermination.id))
        .limit(1);
      const reopening = requireUpdated(
        await tx
          .insert(clinicalCaseReopening)
          .values({
            caseId: data.caseId,
            terminationId: termination?.id ?? null,
            reason,
            createdBy: actor.userId,
          })
          .returning({ id: clinicalCaseReopening.id }),
        "Reopening",
      );
      await tx.insert(clinicalCaseReview).values({ reopeningId: reopening.id });
    });

    refresh();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function getClinicalCaseNotes(caseId: string) {
  await requireCaseAccess(caseId);

  return db.query.clinicalCaseNotes.findMany({
    where: (n, { inArray }) => inArray(n.sessionId, caseSessionIds(caseId)),
    orderBy: (n, { desc }) => desc(n.createdAt),
  });
}

export async function createClinicalCaseNotes(data: {
  caseId: string;
  sessionId: string;
  presentingIssues: string;
  orsAssessment: number;
  riskLevel: string;
  necessaryConditions: string;
  treatmentInterventions: string[];
  otherIntervention: string;
  interventionExplanation: string;
  studentResponseExplanation: string;
  followUpPlan: "GROUP" | "INDIVIDUAL";
  followUpPlanExplanation: string;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
}) {
  try {
    const { actor, clinicalCase, caseSession } = await requireCaseSessionAccess(
      data.caseId,
      data.sessionId,
    );
    if (clinicalCase.caseStatus === caseStatusOptions.Terminated) {
      throw new Error("The case is terminated");
    }
    if (caseSession.attendanceStatus !== true) {
      throw new Error("Case notes need a session the student attended");
    }

    await db.insert(clinicalCaseNotes).values({
      caseId: data.caseId,
      sessionId: data.sessionId,
      createdBy: actor.userId,
      presentingIssues: data.presentingIssues,
      orsAssessment: data.orsAssessment,
      riskLevel: data.riskLevel,
      necessaryConditions: data.necessaryConditions,
      treatmentInterventions: data.treatmentInterventions,
      otherIntervention: data.otherIntervention,
      interventionExplanation: data.interventionExplanation,
      studentResponseExplanations: data.studentResponseExplanation,
      followUpPlan: data.followUpPlan,
      followUpPlanExplanation: data.followUpPlanExplanation,
    });

    refresh();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateClinicalCaseAttendance(data: {
  caseId: string;
  session: ClinicalSessionLabel;
  dateOfSession: Date;
  attendanceStatus: boolean;
}) {
  try {
    const { actor, clinicalCase } = await requireCaseAccess(data.caseId);
    if (!clinicalSessionLabels.includes(data.session)) {
      throw new Error("Unknown clinical session");
    }
    if (data.session.startsWith("F") && clinicalCase.caseStatus !== caseStatusOptions.FollowUp) {
      throw new Error("Follow-up sessions need a case in follow-up");
    }
    if (data.attendanceStatus && (await attendedSessionExists(data.caseId, data.session))) {
      return { error: `${data.session} is already attended on this case` };
    }

    await db.insert(clinicalSessionAttendance).values({
      caseId: data.caseId,
      date: data.dateOfSession,
      session: data.session,
      attendanceStatus: data.attendanceStatus,
      supervisorId: actor.role === ImplementerRole.SUPERVISOR ? actor.profileId : null,
      clinicalLeadId: actor.role === ImplementerRole.CLINICAL_LEAD ? actor.profileId : null,
    });

    refresh();
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "This session is already marked for that date" };
    }
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function referClinicalCaseToClinicalLead(data: {
  caseId: string;
  recipientClinicalLeadId: string;
  referralReason: string;
  referralNotes: string;
}) {
  try {
    const { actor } = await requireSupervisorCaseAccess(data.caseId);
    if (!actor.hubId) throw new NotFoundError("Clinical lead");
    const referrerHub = alias(hub, "referrer_hub");
    const referrerProjectHubIds = db
      .select({ id: hub.id })
      .from(hub)
      .innerJoin(referrerHub, eq(referrerHub.projectId, hub.projectId))
      .where(eq(referrerHub.id, actor.hubId));
    const recipient = await db.query.clinicalLead.findFirst({
      where: (cl, { and, eq, inArray }) =>
        and(
          eq(cl.id, data.recipientClinicalLeadId),
          inArray(cl.assignedHubId, referrerProjectHubIds),
        ),
      columns: { id: true },
    });
    if (!recipient) throw new NotFoundError("Clinical lead");

    await writeReferral(data, actor, {
      role: ImplementerRole.CLINICAL_LEAD,
      id: recipient.id,
    });
    refresh();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export type CaseReferredToMe = Awaited<ReturnType<typeof getCasesReferredToMe>>[number];

async function requireClinicalLeadActor() {
  const actor = await requireClinicalActor();
  if (actor.role !== ImplementerRole.CLINICAL_LEAD) {
    throw new Error("Only a clinical lead can review cases");
  }
  return actor;
}

export async function getCasesToReview() {
  const clinicalLead = await requireClinicalLeadActor();
  const caseColumns = { columns: { id: true, pseudonym: true } } as const;
  const creatorColumns = { columns: { name: true } } as const;
  return db.query.clinicalCaseReview.findMany({
    where: (review, { and, isNull }) =>
      and(isNull(review.reviewedAt), clinicalLeadCaseReviews(clinicalLead, review)),
    orderBy: (review, { asc }) => [asc(review.createdAt), asc(review.id)],
    columns: { id: true, createdAt: true },
    with: {
      termination: {
        columns: { terminationReason: true, terminationReasonExplanation: true },
        with: { case: caseColumns, user: creatorColumns },
      },
      reopening: {
        columns: { reason: true },
        with: { case: caseColumns, user: creatorColumns },
      },
    },
  });
}

export type CaseToReview = Awaited<ReturnType<typeof getCasesToReview>>[number];

export async function markClinicalCaseReviewed(reviewId: string) {
  try {
    const clinicalLead = await requireClinicalLeadActor();
    const reviewed = await db
      .update(clinicalCaseReview)
      .set({ reviewedBy: clinicalLead.userId, reviewedAt: new Date() })
      .where(
        and(
          eq(clinicalCaseReview.id, reviewId),
          isNull(clinicalCaseReview.reviewedAt),
          clinicalLeadCaseReviews(clinicalLead, clinicalCaseReview),
        ),
      )
      .returning({ id: clinicalCaseReview.id });
    if (reviewed.length === 0) {
      return { success: false, message: "The review is not found or is already reviewed." };
    }

    refresh();
    return { success: true, message: null };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to mark the case reviewed" };
  }
}

export async function getCasesReferredToMe() {
  const actor = await requireClinicalActor();
  return db.query.clinicalScreeningInfo.findMany({
    where: (c, { and, eq }) =>
      and(
        eq(
          actor.role === ImplementerRole.CLINICAL_LEAD
            ? c.referredToClinicalLeadId
            : c.referredToSupervisorId,
          actor.profileId,
        ),
        eq(c.acceptCase, false),
      ),
    orderBy: (c, { desc }) => [desc(c.createdAt), desc(c.id)],
    columns: {
      id: true,
      pseudonym: true,
      riskStatus: true,
      referralReason: true,
      referralNotes: true,
      referredFromSpecified: true,
    },
    with: {
      student: {
        columns: { studentName: true },
        with: { school: { columns: { schoolName: true } } },
      },
      referredFromSupervisor: { columns: { supervisorName: true } },
      caseTransferTrail: {
        orderBy: (t, { desc }) => desc(t.date),
        limit: 1,
        columns: { date: true },
      },
    },
  });
}

async function latestTransferTrail(tx: Transaction, caseId: string) {
  const [trail] = await tx
    .select({ id: clinicalCaseTransferTrail.id })
    .from(clinicalCaseTransferTrail)
    .where(eq(clinicalCaseTransferTrail.caseId, caseId))
    .orderBy(desc(clinicalCaseTransferTrail.createdAt))
    .limit(1);
  if (!trail) {
    throw new Error(`No transfer trail for case ${caseId}`);
  }
  return trail;
}

/**
 * Records the signed-in recipient's answer to a case referred to them. Only the supervisor or
 * clinical lead the case was referred to may answer, and only while the referral is open. A case
 * referred to someone else reads as missing. Accepting makes the case the recipient's.
 */
async function answerReferral(caseId: string, decision: "Approved" | "Declined") {
  const recipient = await requireClinicalActor();
  const recipientIsLead = recipient.role === ImplementerRole.CLINICAL_LEAD;
  const pendingRecipientColumn = recipientIsLead
    ? clinicalScreeningInfo.referredToClinicalLeadId
    : clinicalScreeningInfo.referredToSupervisorId;
  const closeReferral = recipientIsLead
    ? { referredToClinicalLeadId: null }
    : { referredToSupervisorId: null };
  const takeCase = recipientIsLead
    ? { clinicalLeadId: recipient.profileId }
    : { currentSupervisorId: recipient.profileId };
  const caseChanges =
    decision === "Approved"
      ? { ...closeReferral, ...takeCase, acceptCase: true, referralStatus: null }
      : { ...closeReferral, acceptCase: false, referralStatus: decision };
  await db.transaction(async (tx) => {
    requireUpdated(
      await tx
        .update(clinicalScreeningInfo)
        .set(caseChanges)
        .where(
          and(
            eq(clinicalScreeningInfo.id, caseId),
            eq(pendingRecipientColumn, recipient.profileId),
            eq(clinicalScreeningInfo.acceptCase, false),
          ),
        )
        .returning({ id: clinicalScreeningInfo.id }),
      "Clinical case",
    );
    const trail = await latestTransferTrail(tx, caseId);
    await tx
      .update(clinicalCaseTransferTrail)
      .set({ referralStatus: decision })
      .where(eq(clinicalCaseTransferTrail.id, trail.id));
  });
  refresh();
}

export async function acceptReferredClinicalCase(caseId: string) {
  try {
    await answerReferral(caseId, "Approved");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Something went wrong" };
  }
}

export async function rejectReferredClinicalCase(caseId: string) {
  try {
    await answerReferral(caseId, "Declined");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Something went wrong" };
  }
}

export async function flagClinicalCaseForFollowUp(data: { caseId: string; reason: string }) {
  try {
    await requireCaseAccess(data.caseId);
    requireUpdated(
      await db
        .update(clinicalScreeningInfo)
        .set({ flagged: true, flaggedReason: data.reason })
        .where(eq(clinicalScreeningInfo.id, data.caseId))
        .returning({ id: clinicalScreeningInfo.id }),
      "Clinical case",
    );

    refresh();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Something went wrong" };
  }
}

export async function triggerCaseStatusToFollowup(data: { caseId: string }) {
  try {
    await requireCaseAccess(data.caseId);
    const [movedToFollowUp] = await db
      .update(clinicalScreeningInfo)
      .set({ caseStatus: "FollowUp" })
      .where(
        and(
          eq(clinicalScreeningInfo.id, data.caseId),
          eq(clinicalScreeningInfo.caseStatus, caseStatusOptions.Active),
        ),
      )
      .returning({ id: clinicalScreeningInfo.id });
    if (!movedToFollowUp) {
      throw new Error("Only an active case can move to follow-up");
    }

    refresh();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
