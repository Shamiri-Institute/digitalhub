"use server";

import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, interventionGroup, interventionGroupReport } from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";

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

export type LoadStudentGroupEvaluationsOptions =
  | { scope: "supervisor"; supervisorId: string }
  | { scope: "hub"; hubId: string }
  | { scope?: "all" };

/** Group reports with the group, its leader and the session, scoped like the Prisma `where`. */
async function fetchEvaluations(options?: LoadStudentGroupEvaluationsOptions) {
  const leadersInScope =
    options?.scope === "supervisor"
      ? db
          .select({ id: fellow.id })
          .from(fellow)
          .where(eq(fellow.supervisorId, options.supervisorId))
      : options?.scope === "hub"
        ? db.select({ id: fellow.id }).from(fellow).where(eq(fellow.hubId, options.hubId))
        : undefined;

  return db.query.interventionGroupReport.findMany({
    where: (r, { inArray }) =>
      leadersInScope
        ? inArray(
            r.groupId,
            db
              .select({ id: interventionGroup.id })
              .from(interventionGroup)
              .where(inArray(interventionGroup.leaderId, leadersInScope)),
          )
        : undefined,
    with: {
      group: { with: { leader: true } },
      session: true,
    },
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

export async function loadStudentGroupEvaluations(options?: LoadStudentGroupEvaluationsOptions) {
  await requireAuthRole();
  try {
    const evaluations = await fetchEvaluations(options);

    return transformEvaluationData(evaluations);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function editStudentGroupEvaluation(
  evaluationId: string,
  data: Partial<typeof interventionGroupReport.$inferInsert>,
) {
  await requireAuthRole();
  try {
    const updated = await db
      .update(interventionGroupReport)
      .set(data)
      .where(eq(interventionGroupReport.id, evaluationId))
      .returning({ id: interventionGroupReport.id });
    if (updated.length === 0) {
      throw new Error(`Evaluation ${evaluationId} not found`);
    }

    return { success: true, message: "Evaluation updated successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update evaluation" };
  }
}
