"use server";

import { ImplementerRole, Prisma } from "@prisma/client";
import type { z } from "zod";
import { currentFellow, getCurrentPersonnel } from "#/app/auth";
import {
  CreateGroupSchema,
  FellowGroupReportSchema,
  StudentGroupEvaluationSchema,
} from "#/components/common/group/schema";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
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

export async function archiveInterventionGroup(groupId: string) {
  try {
    await checkAuth();
    const result = await db.interventionGroup.update({
      where: {
        id: groupId,
      },
      data: {
        archivedAt: new Date(),
      },
    });
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
    const result = await db.interventionGroup.update({
      where: { id: groupId },
      data: { archivedAt: null },
    });
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
    const school = await db.school.findFirstOrThrow({
      where: {
        id: schoolId,
      },
      include: {
        hub: {
          select: {
            projectId: true,
          },
        },
      },
    });
    const groupCount = await db.interventionGroup.count({
      where: { schoolId },
    });

    const projectId = school.hub?.projectId;
    if (!projectId) {
      throw new Error("School not linked to a project. Cannot create group.");
    }

    const result = await db.interventionGroup.create({
      data: {
        id: objectId("group"),
        leaderId: fellowId,
        schoolId,
        projectId,
        groupName: `${getSchoolInitials(school.schoolName)}_${groupCount + 1}`,
      },
    });
    return {
      success: true,
      message: `Successfully created new group ${result.groupName}`,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const { schoolId, fellowId } = CreateGroupSchema.parse(data);
        const result = await db.interventionGroup.findFirst({
          where: {
            school: {
              id: schoolId,
            },
            leaderId: fellowId,
          },
          include: {
            leader: true,
          },
        });
        if (result !== null) {
          return {
            success: false,
            message: `Sorry, ${result.leader.fellowName} is already assigned to group ${result.groupName}`,
          };
        }
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
    const result = await db.interventionGroupReport.upsert({
      where: {
        sessionId_groupId: {
          sessionId,
          groupId,
        },
      },
      create: {
        id: objectId("ige"),
        sessionId,
        groupId,
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
      },
      update: {
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
      },
      include: {
        group: true,
      },
    });
    return {
      success: true,
      message: `Successfully submitted evaluation for ${result.group.groupName}`,
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

    const group = await db.interventionGroup.findFirstOrThrow({
      where: { id: parsed.groupId, leaderId: fellow.profile.id },
      select: { id: true, projectId: true, groupName: true },
    });

    await db.fellowGroupReport.create({
      data: {
        id: objectId("fgr"),
        submittedAt: new Date(),
        fellowId: fellow.profile.id,
        groupId: group.id,
        projectId: group.projectId,
        structuralFidelity: parsed.structuralFidelity,
        processFidelity: parsed.processFidelity,
        adaptationsMade: parsed.adaptationsMade,
        // Null out conditional fields when their trigger is not met (spec Section 9 constraints).
        adaptationType: parsed.adaptationsMade ? (parsed.adaptationType ?? null) : null,
        adaptationReason: parsed.adaptationsMade ? (parsed.adaptationReason ?? null) : null,
        behavioralEngagement: parsed.behavioralEngagement,
        reflectiveEngagement: parsed.reflectiveEngagement,
        psychologicalSafety: parsed.psychologicalSafety,
        groupCohesion: parsed.groupCohesion,
        climateConcerns: parsed.climateConcerns,
        climateConcernsDetail: parsed.climateConcerns
          ? (parsed.climateConcernsDetail ?? null)
          : null,
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
      },
    });

    return {
      success: true,
      message: `Group Report submitted for ${group.groupName}`,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
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
