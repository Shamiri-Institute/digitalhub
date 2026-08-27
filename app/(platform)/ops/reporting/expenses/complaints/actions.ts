"use server";

import { currentOpsUser } from "#/app/auth";
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

  return loadPaymentComplaints({
    implementerId,
    hub: { projectId },
  });
}
