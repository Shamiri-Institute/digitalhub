"use server";

import { and, countDistinct, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { refresh } from "next/cache";

import { currentFellow } from "#/app/auth";
import {
  CreateGroupSchema,
  FellowGroupReportSchema,
  StudentGroupEvaluationSchema,
} from "#/components/common/group/schema";
import { db, isUniqueViolation } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  fellowGroupReport,
  interventionGroup,
  interventionGroupReport,
  interventionSession,
  sessionName,
} from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import {
  requireFellowsInHub,
  requireFellowsMayLeadGroups,
  requireHubRole,
  requireSchoolInHub,
} from "#/lib/auth/require-hub-role";
import { objectId } from "#/lib/crypto";
import { requireEvaluationEditable } from "#/lib/evaluation-edit-window";
import {
  GROUP_REPORT_SESSION_NAMES,
  GROUP_REPORT_SESSIONS_REQUIRED,
} from "#/lib/fellow-group-report";
import { getSchoolInitials } from "#/lib/utils";

/** Throws when the row was already deleted or belongs to another hub's school. */
async function setArchivedAt(groupId: string, archivedAt: Date | null) {
  const { hubId: callerHubId } = await requireHubRole(
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.SUPERVISOR,
  );
  const groupToChange = await db.query.interventionGroup.findFirst({
    where: (g, { eq }) => eq(g.id, groupId),
    columns: { schoolId: true },
  });
  await requireSchoolInHub(groupToChange?.schoolId, callerHubId);

  return db.transaction(async (tx) => {
    // Writing the group first locks it, so the leader checked is the one it has when it commits.
    const [result] = await tx
      .update(interventionGroup)
      .set({ archivedAt })
      .where(eq(interventionGroup.id, groupId))
      .returning({ groupName: interventionGroup.groupName, leaderId: interventionGroup.leaderId });
    if (!result) {
      throw new Error("Record to update not found.");
    }
    if (archivedAt === null) {
      await requireFellowsMayLeadGroups(tx, [result.leaderId]);
    }
    return { groupName: result.groupName };
  });
}

export async function archiveInterventionGroup(groupId: string) {
  try {
    const result = await setArchivedAt(groupId, new Date());
    refresh();
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
    await requireAuthRole(ImplementerRole.HUB_COORDINATOR).catch(() => {
      throw new Error("Only hub coordinators can unarchive groups.");
    });
    const result = await setArchivedAt(groupId, null);
    refresh();
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
    const { hubId: callerHubId } = await requireHubRole(
      ImplementerRole.HUB_COORDINATOR,
      ImplementerRole.SUPERVISOR,
    );
    const { schoolId, fellowId } = CreateGroupSchema.parse(data);
    await requireSchoolInHub(schoolId, callerHubId);
    await requireFellowsInHub([fellowId], callerHubId);
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

    const [result] = await db.transaction(async (tx) => {
      await requireFellowsMayLeadGroups(tx, [fellowId]);
      return tx
        .insert(interventionGroup)
        .values({
          id: objectId("group"),
          leaderId: fellowId,
          schoolId,
          projectId,
          groupName: `${getSchoolInitials(school.schoolName)}_${groupCount + 1}`,
        })
        .returning({ groupName: interventionGroup.groupName });
    });
    refresh();
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
    const fellow = await currentFellow();
    if (!fellow?.profile || fellow.session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
      throw new Error("User not authorised to perform this action");
    }
    const fellowId = fellow.profile.id;

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

    const [ledGroup, session, savedReport] = await Promise.all([
      db.query.interventionGroup.findFirst({
        where: (g, { and, eq }) => and(eq(g.id, groupId), eq(g.leaderId, fellowId)),
        columns: { groupName: true, schoolId: true },
      }),
      db.query.interventionSession.findFirst({
        where: (s, { eq }) => eq(s.id, sessionId),
        columns: { schoolId: true },
      }),
      db.query.interventionGroupReport.findFirst({
        where: (r, { and, eq }) => and(eq(r.sessionId, sessionId), eq(r.groupId, groupId)),
        columns: { createdAt: true },
      }),
    ]);
    if (!ledGroup || session?.schoolId !== ledGroup.schoolId) {
      throw new Error("No InterventionGroup found");
    }
    requireEvaluationEditable(savedReport, new Date());

    await db
      .insert(interventionGroupReport)
      .values({ id: objectId("ige"), sessionId, groupId, ...scores })
      .onConflictDoUpdate({
        target: [interventionGroupReport.sessionId, interventionGroupReport.groupId],
        set: { ...scores, updatedAt: new Date() },
      });
    refresh();
    return {
      success: true,
      message: `Successfully submitted evaluation for ${ledGroup.groupName}`,
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
      columns: { id: true, groupName: true, schoolId: true },
    });
    if (!group) {
      throw new Error("No InterventionGroup found");
    }
    // Each session name once, should a school ever hold two sessions of one name.
    const [held] = await db
      .select({ heldSessionCount: countDistinct(interventionSession.sessionId) })
      .from(interventionSession)
      .where(
        and(
          eq(interventionSession.schoolId, group.schoolId),
          eq(interventionSession.occurred, true),
          inArray(
            interventionSession.sessionId,
            db
              .select({ id: sessionName.id })
              .from(sessionName)
              .where(inArray(sessionName.sessionName, GROUP_REPORT_SESSION_NAMES)),
          ),
        ),
      );
    if ((held?.heldSessionCount ?? 0) < GROUP_REPORT_SESSIONS_REQUIRED) {
      return {
        success: false,
        message: "The group report opens once the group has held its fourth session.",
      };
    }

    await db.insert(fellowGroupReport).values({
      id: objectId("fgr"),
      submittedAt: new Date(),
      fellowId,
      groupId: group.id,
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

    refresh();
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
