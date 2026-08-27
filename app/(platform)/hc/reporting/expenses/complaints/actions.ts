"use server";

import { currentHubCoordinator } from "#/app/auth";
import { loadPaymentComplaints } from "#/lib/actions/expenses/complaints";

export type HubReportComplaintsType = Awaited<ReturnType<typeof loadHubPaymentComplaints>>[number];

export async function loadHubPaymentComplaints() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }

  const assignedHubId = hubCoordinator.profile?.assignedHubId;

  if (!assignedHubId) {
    return [];
  }

  return loadPaymentComplaints({ hubId: assignedHubId });
}
