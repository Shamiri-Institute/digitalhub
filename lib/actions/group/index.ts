"use server";

import { eq } from "drizzle-orm";
import type { z } from "zod";

import { currentFellow, getCurrentPersonnel } from "#/app/auth";
import {
  CreateGroupSchema,
  FellowGroupReportSchema,
  StudentGroupEvaluationSchema,
} from "#/components/common/group/schema";
import { db, isUniqueViolation } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellowGroupReport, interventionGroup, interventionGroupReport } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { getSchoolInitials } from "#/lib/utils";

async function checkAuth() {
  const user = await getCurrentPersonnel();

  if (
    !user ||
    (user.session.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR &&
      user.session.user.activeMembership?.role !== ImplementerRole.SUPERVISOR)
  ) {
    throw new Error("The session has not been authenticated");
  }

  return user;
}

/** Throws when the row was already deleted. */
async function setArchivedAt(groupId: string, archivedAt: Date | null) {
  const [result] = await db
    .update(interventionGroup)
    .set({ archivedAt })
    .where(eq(interventionGroup.id, groupId))
    .returning({ groupName: interventionGroup.groupName });
  if (!result) {
    throw new Error("Record to update not found.");
  }
  return result;
}

export async function archiveInterventionGroup(groupId: string) {
  try {
    await checkAuth();
    const result = await setArchivedAt(groupId, new Date());
    return {
      success: true,
      message: `Successfully archived group ${result.groupName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not archive group.",
    };
  }
}

export async function unarchiveInterventionGroup(groupId: string) {
  try {
    const user = await getCurrentPersonnel();
    if (!user || user.session.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR) {
      throw new Error("Only hub coordinators can unarchive groups.");
    }
    const result = await setArchivedAt(groupId, null);
    return {
      success: true,
      message: `Successfully unarchived group ${result.groupName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not unarchive group.",
    };
  }
}

export async function createInterventionGroup(data: z.infer<typeof CreateGroupSchema>) {
  try {
    await checkAuth();
    const { schoolId, fellowId } = CreateGroupSchema.parse(data);
    const school = await db.query.school.findFirst({
      where: (s, { eq }) => eq(s.id, schoolId),
      with: { hub: { columns: { projectId: true } } },
    });
    if (!school) {
      throw new Error("No School found");
    }
    const groupCount = await db.$count(interventionGroup, eq(interventionGroup.schoolId, schoolId));

    const projectId = school.hub?.projectId;
    if (!projectId) {
      throw new Error("School not linked to a project. Cannot create group.");
    }

    const [result] = await db
      .insert(interventionGroup)
      .values({
        id: objectId("group"),
        leaderId: fellowId,
        schoolId,
        projectId,
        groupName: `${getSchoolInitials(school.schoolName)}_${groupCount + 1}`,
      })
      .returning({ groupName: interventionGroup.groupName });
    return {
      success: true,
      message: `Successfully created new group ${result?.groupName}`,
    };
  } catch (err) {
    if (isUniqueViolation(err)) {
      const { schoolId, fellowId } = CreateGroupSchema.parse(data);
      const result = await db.query.interventionGroup.findFirst({
        where: (g, { and, eq }) => and(eq(g.schoolId, schoolId), eq(g.leaderId, fellowId)),
        with: { leader: true },
      });
      if (result !== null && result !== undefined) {
        return {
          success: false,
          message: `Sorry, ${result.leader.fellowName} is already assigned to group ${result.groupName}`,
        };
      }
    }
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not create group.",
    };
  }
}

export async function submitGroupEvaluation(data: z.infer<typeof StudentGroupEvaluationSchema>) {
  try {
    const user = await getCurrentPersonnel();
    if (user === null) {
      throw new Error("The session has not been authenticated");
    }

    if (user.session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
      throw new Error("User not authorised to perform this action");
    }

    const {
      sessionId,
      groupId,
      contentComment,
      content,
      cooperationComment,
      cooperation2,
      cooperation3,
      cooperation1,
      engagementComment,
      engagement2,
      engagement3,
      engagement1,
    } = StudentGroupEvaluationSchema.parse(data);
    const scores = {
      content,
      contentComment,
      cooperation1,
      cooperation2,
      cooperation3,
      cooperationComment,
      engagement1,
      engagement2,
      engagement3,
      engagementComment,
    };
    await db
      .insert(interventionGroupReport)
      .values({ id: objectId("ige"), sessionId, groupId, ...scores })
      .onConflictDoUpdate({
        target: [interventionGroupReport.sessionId, interventionGroupReport.groupId],
        set: { ...scores, updatedAt: new Date() },
      });
    const group = await db.query.interventionGroup.findFirst({
      where: (g, { eq }) => eq(g.id, groupId),
      columns: { groupName: true },
    });
    if (!group) {
      throw new Error("No InterventionGroup found");
    }
    return {
      success: true,
      message: `Successfully submitted evaluation for ${group.groupName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Something went wrong.",
    };
  }
}

export async function submitFellowGroupReport(data: z.infer<typeof FellowGroupReportSchema>) {
  try {
    const fellow = await currentFellow();
    if (!fellow?.profile || fellow.session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
      throw new Error("User not authorised to perform this action");
    }

    const parsed = FellowGroupReportSchema.parse(data);
    const fellowId = fellow.profile.id;

    const group = await db.query.interventionGroup.findFirst({
      where: (g, { and, eq }) => and(eq(g.id, parsed.groupId), eq(g.leaderId, fellowId)),
      columns: { id: true, projectId: true, groupName: true },
    });
    if (!group) {
      throw new Error("No InterventionGroup found");
    }

    await db.insert(fellowGroupReport).values({
      id: objectId("fgr"),
      submittedAt: new Date(),
      fellowId,
      groupId: group.id,
      projectId: group.projectId,
      structuralFidelity: parsed.structuralFidelity,
      processFidelity: parsed.processFidelity,
      adaptationsMade: parsed.adaptationsMade,
      adaptationType: parsed.adaptationsMade ? (parsed.adaptationType ?? null) : null,
      adaptationReason: parsed.adaptationsMade ? (parsed.adaptationReason ?? null) : null,
      behavioralEngagement: parsed.behavioralEngagement,
      reflectiveEngagement: parsed.reflectiveEngagement,
      psychologicalSafety: parsed.psychologicalSafety,
      groupCohesion: parsed.groupCohesion,
      climateConcerns: parsed.climateConcerns,
      climateConcernsDetail: parsed.climateConcerns ? (parsed.climateConcernsDetail ?? null) : null,
      skillComprehension: parsed.skillComprehension,
      inSessionTransfer: parsed.inSessionTransfer,
      homePracticeApplicable: parsed.homePracticeApplicable,
      homePracticeEngagement: parsed.homePracticeApplicable
        ? (parsed.homePracticeEngagement ?? null)
        : null,
      fellowGroupRelationship: parsed.fellowGroupRelationship,
      externalDisruptions: parsed.externalDisruptions,
      externalDisruptionsDetail: parsed.externalDisruptions
        ? (parsed.externalDisruptionsDetail ?? null)
        : null,
      facilitatorConfidence: parsed.facilitatorConfidence,
      hardestAspect: parsed.hardestAspect,
      challengeImpact: parsed.challengeImpact,
      whatWentWell: parsed.whatWentWell,
      supportType: parsed.supportType,
      supportDetail: parsed.supportDetail ?? null,
    });

    return {
      success: true,
      message: `Group Report submitted for ${group.groupName}`,
    };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        success: false,
        message: "A report has already been submitted for this group.",
      };
    }
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Something went wrong.",
    };
  }
}
