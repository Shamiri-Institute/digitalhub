"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { interventionGroup, interventionGroupReport } from "#/db/schema";
import { fellowsInCallerScope, requireHubRole } from "#/lib/auth/require-hub-role";

export type StudentGroupEvaluationType = {
  id: string;
  fellowName: string;
  groupName: string;
  avgCooperation: number;
  avgEngagement: number;
  session: {
    sessionId: string;
    session: string;
    cooperation: number;
    engagement: number;
    engagementComment: string;
    cooperationComment: string;
    contentComment: string;
  }[];
};

type ReportCaller = Awaited<ReturnType<typeof requireHubRole>>;

/** The groups led by a fellow in the caller's scope; their reports are the ones the caller sees. */
function groupsInCallerScope(caller: ReportCaller) {
  return db
    .select({ id: interventionGroup.id })
    .from(interventionGroup)
    .where(inArray(interventionGroup.leaderId, fellowsInCallerScope(caller)));
}

/** Group reports with the group, its leader and the session. */
function fetchEvaluations(caller: ReportCaller) {
  return db.query.interventionGroupReport.findMany({
    where: (r, { inArray }) => inArray(r.groupId, groupsInCallerScope(caller)),
    with: {
      group: { with: { leader: true } },
      session: true,
    },
    orderBy: (r, { asc }) => [asc(r.createdAt), asc(r.id)],
  });
}

type InterventionGroupReportWithRelations = Awaited<ReturnType<typeof fetchEvaluations>>[number];

const transformEvaluationData = (
  data: InterventionGroupReportWithRelations[],
): StudentGroupEvaluationType[] => {
  const groupedByFellow = data.reduce<Record<string, StudentGroupEvaluationType>>((acc, item) => {
    const fellowId = item.group.leader.id;
    const groupName = item.group.groupName;

    if (!acc[fellowId]) {
      acc[fellowId] = {
        id: fellowId,
        fellowName: item.group.leader.fellowName ?? "",
        groupName: groupName,
        avgCooperation: 0,
        avgEngagement: 0,
        session: [],
      };
    }

    const sessionData = {
      sessionId: item.id,
      session: item.session?.sessionType ?? "-",
      cooperation: item.cooperation1 ?? item.cooperation2 ?? item.cooperation3 ?? 0,
      engagement: item.engagement1 ?? item.engagement2 ?? item.engagement3 ?? 0,
      engagementComment: item.engagementComment ?? "",
      cooperationComment: item.cooperationComment ?? "",
      contentComment: item.contentComment ?? "",
    };

    const fellow = acc[fellowId];
    if (fellow) {
      fellow.session.push(sessionData);
      fellow.avgCooperation = calculateAverage(fellow.session.map((s) => s.cooperation));
      fellow.avgEngagement = calculateAverage(fellow.session.map((s) => s.engagement));
    }

    return acc;
  }, {});

  return Object.values(groupedByFellow);
};

const calculateAverage = (numbers: number[]): number => {
  const validNumbers = numbers.filter((n) => n !== 0);
  if (validNumbers.length === 0) return 0;
  const sum = validNumbers.reduce((a, b) => a + b, 0);
  return Number((sum / validNumbers.length).toFixed(1));
};

export async function loadStudentGroupEvaluations() {
  const caller = await requireHubRole(ImplementerRole.SUPERVISOR, ImplementerRole.HUB_COORDINATOR);
  const evaluations = await fetchEvaluations(caller);

  return transformEvaluationData(evaluations);
}

// Only the comments are editable; the group, session and ratings stay as the fellow reported them.
const EditStudentGroupEvaluationSchema = z.object({
  engagementComment: z.string(),
  cooperationComment: z.string(),
  contentComment: z.string(),
});

export async function editStudentGroupEvaluation(
  evaluationId: string,
  data: z.infer<typeof EditStudentGroupEvaluationSchema>,
) {
  const caller = await requireHubRole(ImplementerRole.SUPERVISOR, ImplementerRole.HUB_COORDINATOR);
  try {
    const comments = EditStudentGroupEvaluationSchema.parse(data);
    // A report on a group outside the caller's scope reads as missing.
    const updated = await db
      .update(interventionGroupReport)
      .set(comments)
      .where(
        and(
          eq(interventionGroupReport.id, evaluationId),
          inArray(interventionGroupReport.groupId, groupsInCallerScope(caller)),
        ),
      )
      .returning({ id: interventionGroupReport.id });
    if (updated.length === 0) {
      throw new Error(`Evaluation ${evaluationId} not found`);
    }

    refresh();
    return { success: true, message: "Evaluation updated successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update evaluation" };
  }
}
