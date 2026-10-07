"use server";

import { and, count, desc, eq } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import type { EditStudentInfoFormValues } from "#/app/(platform)/sc/clinical/components/view-edit-student-info";
import { currentSupervisorLite, getCurrentUserSession } from "#/app/auth";
import { db, type Transaction } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  clinicalCaseNotes,
  clinicalCaseTermination,
  clinicalCaseTransferTrail,
  clinicalExpertCaseNotes,
  clinicalFollowUpTreatmentPlan,
  clinicalFollowUpTreatmentPlanAuditTrail,
  clinicalScreeningInfo,
  clinicalSessionAttendance,
  hub,
  type JsonValue,
  student,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { generateStudentVisibleID } from "#/lib/utils";

export type ClinicalCases = Awaited<ReturnType<typeof getClinicalCases>>[number];
export type SchoolsInHubData = Awaited<ReturnType<typeof getSchoolsInHub>>;

function requireUpdated<T>(rows: T[], what: string): T {
  const row = rows[0];
  if (!row) {
    throw new Error(`${what} not found`);
  }
  return row;
}

/** The signed-in supervisor or clinical lead. Every other role is refused. */
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
  // The same message for a missing case and a forbidden one, so the error does not reveal
  // which case ids exist.
  if (!clinicalCase || !allowed) {
    throw new Error("Clinical case not found");
  }
  return { actor, clinicalCase };
}

const clinicalHome = (role: ImplementerRole) =>
  role === ImplementerRole.CLINICAL_LEAD ? "/cl/clinical" : "/sc/clinical";

export async function getClinicalCases() {
  const supervisor = await currentSupervisorLite();
  if (!supervisor) throw new Error("Unauthorized");
  const supervisorId = supervisor.profile.id;

  const cases = await db.query.clinicalScreeningInfo.findMany({
    where: (c, { eq }) => eq(c.currentSupervisorId, supervisorId),
    with: {
      student: {
        with: {
          school: { columns: { schoolName: true } },
          assignedGroup: { columns: { groupName: true } },
        },
      },
      sessions: true,
      clinicalCaseNotes: {
        orderBy: (n, { desc }) => desc(n.createdAt),
        limit: 1,
        columns: { riskLevel: true },
      },
      followUptreatmentPlan: true,
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

    const riskLevel = caseInfo.clinicalCaseNotes[0]?.riskLevel || "N/A";

    return {
      id: caseInfo.id,
      school: caseInfo.student?.school?.schoolName,
      pseudonym: caseInfo.pseudonym || "Anonymous",
      dateAdded: caseInfo.createdAt.toLocaleDateString(),
      caseStatus: caseInfo.caseStatus,
      risk: riskLevel,
      age,
      referralFrom: caseInfo.referredFrom || caseInfo.initialReferredFromSpecified || "Unknown",
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
  const supervisor = await currentSupervisorLite();
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

export async function supSubmitConsultClinicalexpert(data: {
  caseId: string;
  name: string;
  comment: string;
}) {
  try {
    await requireCaseAccess(data.caseId);
    await db.insert(clinicalExpertCaseNotes).values({
      caseId: data.caseId,
      comment: data.comment,
      name: data.name,
    });
    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function updateClinicalSessionAttendance(
  sessionId: string,
  attendanceStatus: boolean | null,
) {
  const attendance = await db.query.clinicalSessionAttendance.findFirst({
    where: (a, { eq }) => eq(a.id, sessionId),
    columns: { caseId: true },
  });
  if (!attendance) {
    throw new Error("Clinical session attendance not found");
  }
  const { actor } = await requireCaseAccess(attendance.caseId);

  try {
    requireUpdated(
      await db
        .update(clinicalSessionAttendance)
        .set({ attendanceStatus })
        .where(eq(clinicalSessionAttendance.id, sessionId))
        .returning({ id: clinicalSessionAttendance.id }),
      "Clinical session attendance",
    );

    revalidatePath(clinicalHome(actor.role));

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
  referTo: string;
  referralReason: string;
  caseId: string;
  referredFrom: string;
  referredFromSpecified: string;
  referredTo: string;
  referredToPerson: string | null;
  externalCare: string | null;
  referralNotes: string;
  supervisorName: string;
}) {
  try {
    await requireCaseAccess(data.caseId);
    await db.transaction(async (tx) => {
      requireUpdated(
        await tx
          .update(clinicalScreeningInfo)
          .set({
            referredFrom: data.referredFrom,
            referredFromSpecified: data.supervisorName,
            referredTo: data.referredTo,
            referredToSpecified: data.referredToPerson ?? data.externalCare,
            referralNotes: data.referralNotes,
            referredToSupervisorId: data.referredToPerson ?? null,
            referralStatus: "Pending",
            referralReason: data.referralReason,
            acceptCase: false,
          })
          .where(eq(clinicalScreeningInfo.id, data.caseId))
          .returning({ id: clinicalScreeningInfo.id }),
        "Clinical case",
      );
      await tx.insert(clinicalCaseTransferTrail).values({
        caseId: data.caseId,
        from: data.referredFrom,
        fromRole: data.referredFromSpecified,
        to: data.supervisorName,
        toRole: data.referredToPerson ?? data.referredTo,
        date: new Date(),
        referralStatus: "Pending",
      });
    });

    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function getSupervisorsInHub() {
  const supervisor = await currentSupervisorLite();
  if (!supervisor?.profile.hubId) throw new Error("Unauthorized");
  const { hubId, id: supervisorId } = supervisor.profile;
  const supervisors = await db.query.supervisor.findMany({
    where: (s, { and, eq, ne }) => and(eq(s.hubId, hubId), ne(s.id, supervisorId)),
  });
  const allSupervisors =
    supervisors.map((supervisor) => ({
      id: supervisor.id,
      name: supervisor.supervisorName,
    })) || [];
  return {
    currentSupervisor: {
      id: supervisor.profile.id,
      name: supervisor.profile.supervisorName,
    },
    allSupervisors: allSupervisors,
  };
}

export async function getSchoolsInHub() {
  const supervisor = await currentSupervisorLite();
  const projectId = supervisor?.profile?.hub?.projectId;
  const hubId = supervisor?.profile.hubId;
  if (!supervisor || !projectId || !hubId) {
    throw new Error("Assigned hub has no project");
  }
  const projectHubIds = db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId));

  const [schools, supervisorsInHub, fellowsInProject, hubs] = await Promise.all([
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
    }),
    db.query.fellow.findMany({
      where: (f, { inArray }) => inArray(f.hubId, projectHubIds),
      with: { hub: { columns: { id: true } } },
    }),
    db.query.hub.findMany({
      where: (h, { eq }) => eq(h.projectId, projectId),
      columns: { id: true, hubName: true },
    }),
  ]);

  return {
    schools,
    supervisorsInHub,
    fellowsInProject,
    currentSupervisorId: supervisor.profile.id,
    hubs,
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
    // The creator and their role come from the session, never from the request.
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
    if (data.studentId) {
      const { studentId } = data;
      const existing = await db.query.student.findFirst({
        where: (s, { and, eq }) => and(eq(s.id, studentId), eq(s.schoolId, school.id)),
        columns: { id: true },
      });
      if (!existing) {
        throw new Error("Student not found in the selected school");
      }
    }

    await db.transaction(async (tx) => {
      let studentId = data.studentId;

      if (data.newStudent) {
        const studentCount = await tx.$count(student);
        const [created] = await tx
          .insert(student)
          .values({
            id: objectId("stu"),
            visibleId: generateStudentVisibleID("CLN", studentCount),
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
        schoolId: data.schoolId,
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

    revalidatePath(clinicalHome(actor.role));
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

    revalidatePath(clinicalHome(actor.role));
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

    revalidatePath("/sc/clinical");
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
    const { actor } = await requireCaseAccess(data.caseId);

    await db.transaction(async (tx) => {
      requireUpdated(
        await tx
          .update(clinicalScreeningInfo)
          .set({ caseStatus: "Terminated" })
          .where(eq(clinicalScreeningInfo.id, data.caseId))
          .returning({ id: clinicalScreeningInfo.id }),
        "Clinical case",
      );

      await tx.insert(clinicalCaseTermination).values({
        caseId: data.caseId,
        terminationDate: new Date(),
        terminationReason: data.terminationReason,
        terminationReasonExplanation: data.terminationReasonExplanation,
        sessionId: data.sessionId,
        createdBy: actor.userId,
      });
    });

    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function unterminateClinicalCase(data: { caseId: string }) {
  try {
    const { actor } = await requireCaseAccess(data.caseId);
    if (actor.role !== ImplementerRole.CLINICAL_LEAD) {
      throw new Error("You are not authorized to un-terminate this case");
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(clinicalCaseTermination)
        .where(eq(clinicalCaseTermination.caseId, data.caseId));

      requireUpdated(
        await tx
          .update(clinicalScreeningInfo)
          .set({ caseStatus: "Active" })
          .where(eq(clinicalScreeningInfo.id, data.caseId))
          .returning({ id: clinicalScreeningInfo.id }),
        "Clinical case",
      );
    });

    revalidatePath("/cl/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function getClinicalCaseNotes(caseId: string) {
  await requireCaseAccess(caseId);

  return db.query.clinicalCaseNotes.findMany({
    where: (n, { eq }) => eq(n.caseId, caseId),
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
    const { actor } = await requireCaseAccess(data.caseId);

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

    revalidatePath(clinicalHome(actor.role));
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateClinicalCaseAttendance(data: {
  caseId: string;
  session: string;
  supervisorId: string | null;
  dateOfSession: Date;
  attendanceStatus: boolean;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
  clinicalLeadId: string | null;
}) {
  try {
    const { actor } = await requireCaseAccess(data.caseId);

    await db.insert(clinicalSessionAttendance).values({
      caseId: data.caseId,
      date: data.dateOfSession,
      session: data.session,
      supervisorId: data.supervisorId,
      clinicalLeadId: data.clinicalLeadId,
      attendanceStatus: data.attendanceStatus,
    });

    revalidatePath(clinicalHome(actor.role));
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function getClinicalLeads() {
  const supervisor = await currentSupervisorLite();
  if (!supervisor) {
    throw new Error("Supervisor not found");
  }
  const projectId = supervisor.profile?.hub?.projectId;
  if (!projectId) {
    throw new Error("Assigned hub has no project");
  }

  const clinicalLeads = await db.query.clinicalLead.findMany({
    where: (cl, { inArray }) =>
      inArray(
        cl.assignedHubId,
        db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId)),
      ),
  });
  const clinicalLeadsWithSupervisor = clinicalLeads.map((lead) => ({
    name: lead.clinicalLeadName,
    id: lead.id,
    hubId: lead.assignedHubId,
  }));
  return clinicalLeadsWithSupervisor || [];
}

export async function referClinicalCaseToClinicalLead(data: {
  referralReason: string;
  caseId: string;
  referredFrom: string;
  referredFromSpecified: string;
  referredTo: string;
  referredToPerson: string;
  referralNotes: string;
  referredToPersonId: string;
}) {
  try {
    await requireCaseAccess(data.caseId);
    await db.transaction(async (tx) => {
      requireUpdated(
        await tx
          .update(clinicalScreeningInfo)
          .set({
            clinicalLeadId: data.referredToPersonId,
            referralNotes: data.referralNotes,
            referralStatus: "Pending",
            referralReason: data.referralReason,
            referredTo: data.referredTo,
            acceptCase: false,
          })
          .where(eq(clinicalScreeningInfo.id, data.caseId))
          .returning({ id: clinicalScreeningInfo.id }),
        "Clinical case",
      );
      await tx.insert(clinicalCaseTransferTrail).values({
        caseId: data.caseId,
        from: data.referredFrom,
        fromRole: data.referredFromSpecified,
        to: data.referredToPerson,
        toRole: data.referredToPersonId,
        date: new Date(),
        referralStatus: "Pending",
      });
    });

    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function getReferredCasesToSupervisor() {
  const supervisor = await currentSupervisorLite();
  if (!supervisor) {
    throw new Error("Supervisor not found");
  }
  const supervisorId = supervisor.profile.id;

  const referredCases = await db.query.clinicalScreeningInfo.findMany({
    where: (c, { and, eq }) =>
      and(eq(c.referredToSupervisorId, supervisorId), eq(c.acceptCase, false)),
    with: { student: true },
  });

  return referredCases;
}

/** The latest transfer trail row of a case; the referral decision is recorded on it. */
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
 * Records the signed-in supervisor's answer to a case referred to them. Only the supervisor the
 * case was referred to may answer, and only while the referral is open. A case referred to someone
 * else reads as missing.
 */
async function answerReferral(caseId: string, decision: "Approved" | "Declined") {
  const supervisor = await currentSupervisorLite();
  if (!supervisor) {
    throw new Error("Unauthorized");
  }
  const referralRecipientId = supervisor.profile.id;
  // An accepted case moves to the recipient; a declined one stays with the referring supervisor.
  const caseChanges =
    decision === "Approved"
      ? {
          currentSupervisorId: referralRecipientId,
          referredToSupervisorId: null,
          acceptCase: true,
          referralStatus: null,
        }
      : { referredToSupervisorId: null, acceptCase: false, referralStatus: decision };
  await db.transaction(async (tx) => {
    requireUpdated(
      await tx
        .update(clinicalScreeningInfo)
        .set(caseChanges)
        .where(
          and(
            eq(clinicalScreeningInfo.id, caseId),
            eq(clinicalScreeningInfo.referredToSupervisorId, referralRecipientId),
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
  revalidatePath("/sc/clinical");
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
    const { actor } = await requireCaseAccess(data.caseId);
    requireUpdated(
      await db
        .update(clinicalScreeningInfo)
        .set({ flagged: true, flaggedReason: data.reason })
        .where(eq(clinicalScreeningInfo.id, data.caseId))
        .returning({ id: clinicalScreeningInfo.id }),
      "Clinical case",
    );

    revalidatePath(clinicalHome(actor.role));
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Something went wrong" };
  }
}

export async function triggerCaseStatusToFollowup(data: { caseId: string }) {
  try {
    await requireCaseAccess(data.caseId);
    requireUpdated(
      await db
        .update(clinicalScreeningInfo)
        .set({ caseStatus: "FollowUp" })
        .where(eq(clinicalScreeningInfo.id, data.caseId))
        .returning({ id: clinicalScreeningInfo.id }),
      "Clinical case",
    );

    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
