"use server";

import { currentHubCoordinator } from "#/app/auth";
import type { ReportFellowComplaintSchema } from "#/components/common/expenses/complaints/schema";
import { loadPaymentComplaints, resolveComplaint } from "#/lib/actions/expenses/complaints";

export type HubReportComplaintsType = Awaited<ReturnType<typeof loadHubPaymentComplaints>>[number];

export async function loadHubPaymentComplaints() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }

  return loadPaymentComplaints({
    hubId: hubCoordinator.profile?.assignedHubId,
  });
}

export async function rejectComplaint(data: { id: string; formData: ReportFellowComplaintSchema }) {
  const hubCoordinator = await currentHubCoordinator();
  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }
  return resolveComplaint(data, "REJECTED");
}

export async function approveComplaint(data: {
  id: string;
  formData: ReportFellowComplaintSchema;
}) {
  const hubCoordinator = await currentHubCoordinator();
  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }
  return resolveComplaint(data, "APPROVED");
}
