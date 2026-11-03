"use server";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import type { fellowGroupReport } from "#/db/schema";
import { fellowsInCallerScope, requireHubRole } from "#/lib/auth/require-hub-role";

export type FellowGroupReportRow = {
  groupId: string;
  groupName: string;
  fellowName: string;
  status: "Submitted" | "Not yet submitted";
  submittedAt: Date | null;
  report: typeof fellowGroupReport.$inferSelect | null;
};

export async function loadFellowGroupReports() {
  const caller = await requireHubRole(ImplementerRole.SUPERVISOR, ImplementerRole.HUB_COORDINATOR);
  const groups = await db.query.interventionGroup.findMany({
    where: (g, { and, isNull, inArray }) =>
      and(inArray(g.leaderId, fellowsInCallerScope(caller)), isNull(g.archivedAt)),
    with: {
      leader: { columns: { fellowName: true } },
      fellowGroupReports: {
        with: { fellow: { columns: { fellowName: true } } },
        orderBy: (r, { asc }) => [asc(r.createdAt), asc(r.id)],
      },
    },
    orderBy: (g, { asc }) => asc(g.groupName),
  });

  return groups.flatMap<FellowGroupReportRow>((group) => {
    if (group.fellowGroupReports.length === 0) {
      return [
        {
          groupId: group.id,
          groupName: group.groupName,
          fellowName: group.leader.fellowName ?? "",
          status: "Not yet submitted",
          submittedAt: null,
          report: null,
        },
      ];
    }
    return group.fellowGroupReports.map(({ fellow: author, ...report }) => ({
      groupId: group.id,
      groupName: group.groupName,
      fellowName: author.fellowName ?? "",
      status: "Submitted",
      submittedAt: report.submittedAt,
      report,
    }));
  });
}
