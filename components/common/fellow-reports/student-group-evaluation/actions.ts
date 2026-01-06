"use server";

import type { Prisma } from "@prisma/client";
import { db } from "#/lib/db";

type InterventionGroupReportWithRelations = Prisma.InterventionGroupReportGetPayload<{
  include: {
    group: {
      include: {
        leader: true;
      };
    };
    session: true;
  };
}>;

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
  try {
    const evaluations = await db.interventionGroupReport.findMany({
      include: {
        group: {
          include: {
            leader: true,
          },
        },
        session: true,
      },
    });

    return transformEvaluationData(evaluations);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function editStudentGroupEvaluation(
  evaluationId: string,
  data: Prisma.InterventionGroupReportUpdateInput,
) {
  try {
    await db.interventionGroupReport.update({
      where: { id: evaluationId },
      data,
    });

    return { success: true, message: "Evaluation updated successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update evaluation" };
  }
}
