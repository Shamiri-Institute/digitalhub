"use server";

import { eq } from "drizzle-orm";

import { currentSupervisor } from "#/app/auth";
import { fellow } from "#/db/schema";
import { loadPaymentComplaints } from "#/lib/actions/expenses/complaints";

export type FellowReportComplaintsType = Awaited<
  ReturnType<typeof loadFellowPaymentComplaints>
>[number];

export async function loadFellowPaymentComplaints() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    throw new Error("Unauthorised user");
  }

  const supervisorId = supervisor.profile?.id;

  if (!supervisorId) {
    return [];
  }

  return loadPaymentComplaints(eq(fellow.supervisorId, supervisorId));
}
