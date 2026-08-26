"use server";

import { currentOpsUser } from "#/app/auth";
import type { ReportFellowComplaintSchema } from "#/components/common/expenses/complaints/schema";
import { loadPaymentComplaints, resolveComplaint } from "#/lib/actions/expenses/complaints";
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

  return loadPaymentComplaints({
    implementerId: opsUser.session.user.activeMembership?.implementerId,
    hub: {
      projectId,
    },
  });
}

export async function rejectComplaint(data: { id: string; formData: ReportFellowComplaintSchema }) {
  const opsUser = await currentOpsUser();
  if (!opsUser) {
    throw new Error("Unauthorised user");
  }
  return resolveComplaint(data, "REJECTED");
}

export async function approveComplaint(data: {
  id: string;
  formData: ReportFellowComplaintSchema;
}) {
  const opsUser = await currentOpsUser();
  if (!opsUser) {
    throw new Error("Unauthorised user");
  }
  return resolveComplaint(data, "APPROVED");
}
