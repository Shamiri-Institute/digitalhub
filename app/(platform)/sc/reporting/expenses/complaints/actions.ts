"use server";

import { currentSupervisor } from "#/app/auth";
import type { ReportFellowComplaintSchema } from "#/components/common/expenses/complaints/schema";
import { loadPaymentComplaints, resolveComplaint } from "#/lib/actions/expenses/complaints";

export type FellowReportComplaintsType = Awaited<
  ReturnType<typeof loadFellowPaymentComplaints>
>[number];

export async function loadFellowPaymentComplaints() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    throw new Error("Unauthorised user");
  }

  return loadPaymentComplaints({
    supervisorId: supervisor.profile?.id,
  });
}

export async function rejectComplaint(data: { id: string; formData: ReportFellowComplaintSchema }) {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    throw new Error("Unauthorised user");
  }
  return resolveComplaint(data, "REJECTED");
}

export async function approveComplaint(data: {
  id: string;
  formData: ReportFellowComplaintSchema;
}) {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    throw new Error("Unauthorised user");
  }
  return resolveComplaint(data, "APPROVED");
}
