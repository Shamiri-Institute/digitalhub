"use server";

import type { FellowGroupReport } from "@prisma/client";
import { db } from "#/lib/db";

export type FellowGroupReportRow = {
  groupId: string;
  groupName: string;
  fellowName: string;
  status: "Submitted" | "Not yet submitted";
  submittedAt: Date | null;
  report: FellowGroupReport | null;
};

export type LoadFellowGroupReportsOptions =
  | { scope: "supervisor"; supervisorId: string }
  | { scope: "hub"; hubId: string }
  | { scope?: "all" };

export async function loadFellowGroupReports(options?: LoadFellowGroupReportsOptions) {
  try {
    const where =
      options?.scope === "supervisor"
        ? { leader: { supervisorId: options.supervisorId } }
        : options?.scope === "hub"
          ? { leader: { hubId: options.hubId } }
          : undefined;

    const groups = await db.interventionGroup.findMany({
      where: { ...where, archivedAt: null },
      include: {
        leader: true,
        fellowGroupReports: true,
      },
      orderBy: { groupName: "asc" },
    });

    return groups.map<FellowGroupReportRow>((group) => {
      const report = group.fellowGroupReports[0] ?? null;
      return {
        groupId: group.id,
        groupName: group.groupName,
        fellowName: group.leader.fellowName ?? "",
        status: report ? "Submitted" : "Not yet submitted",
        submittedAt: report?.submittedAt ?? null,
        report,
      };
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}
