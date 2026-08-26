"use server";

import { currentSupervisor } from "#/app/auth";
import { loadPaymentComplaints } from "#/lib/actions/expenses/complaints";

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
