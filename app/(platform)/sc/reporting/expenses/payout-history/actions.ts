"use server";

import { Prisma } from "@prisma/client";
import { currentSupervisor } from "#/app/auth";
import {
  type FellowPayoutDetail,
  loadPayoutHistory,
  type PayoutHistoryEntry,
} from "#/lib/actions/expenses/payout-history";

export type { FellowPayoutDetail };
export type SupervisorPayoutHistoryType = PayoutHistoryEntry;

export async function loadSupervisorPayoutHistory(): Promise<SupervisorPayoutHistoryType[]> {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    throw new Error("Unauthorised user");
  }

  return loadPayoutHistory(Prisma.sql`f.supervisor_id = ${supervisor.profile?.id}`);
}
