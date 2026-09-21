"use server";

import { and, eq, inArray } from "drizzle-orm";

import { currentOpsUser } from "#/app/auth";
import { db } from "#/db/client";
import { fellow, hub } from "#/db/schema";
import { loadPaymentComplaints } from "#/lib/actions/expenses/complaints";
import { getActiveProjectId } from "#/lib/active-project-id";

export type OpsHubsReportComplaintsType = Awaited<
  ReturnType<typeof loadOpsHubsPaymentComplaints>
>[number];

export async function loadOpsHubsPaymentComplaints() {
  const opsUser = await currentOpsUser();

  const projectId = await getActiveProjectId();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const implementerId = opsUser.session.user.activeMembership?.implementerId;

  if (!implementerId) {
    return [];
  }

  return loadPaymentComplaints(
    and(
      eq(fellow.implementerId, implementerId),
      inArray(
        fellow.hubId,
        db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId)),
      ),
    ),
  );
}
