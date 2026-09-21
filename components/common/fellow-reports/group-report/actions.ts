"use server";

import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, type fellowGroupReport } from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";

export type FellowGroupReportRow = {
  groupId: string;
  groupName: string;
  fellowName: string;
  status: "Submitted" | "Not yet submitted";
  submittedAt: Date | null;
  report: typeof fellowGroupReport.$inferSelect | null;
};

export type LoadFellowGroupReportsOptions =
  | { scope: "supervisor"; supervisorId: string }
  | { scope: "hub"; hubId: string }
  | { scope?: "all" };

export async function loadFellowGroupReports(options?: LoadFellowGroupReportsOptions) {
  await requireAuthRole();
  try {
    const leadersInScope =
      options?.scope === "supervisor"
        ? db
            .select({ id: fellow.id })
            .from(fellow)
            .where(eq(fellow.supervisorId, options.supervisorId))
        : options?.scope === "hub"
          ? db.select({ id: fellow.id }).from(fellow).where(eq(fellow.hubId, options.hubId))
          : undefined;

    const groups = await db.query.interventionGroup.findMany({
      where: (g, { and, isNull, inArray }) =>
        and(leadersInScope ? inArray(g.leaderId, leadersInScope) : undefined, isNull(g.archivedAt)),
      with: {
        leader: true,
        // The row shows the first report, so keep Prisma's insertion order.
        fellowGroupReports: { orderBy: (r, { asc }) => [asc(r.createdAt), asc(r.id)] },
      },
      orderBy: (g, { asc }) => asc(g.groupName),
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
