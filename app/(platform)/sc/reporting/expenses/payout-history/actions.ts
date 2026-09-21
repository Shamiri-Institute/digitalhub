"use server";

import { sql } from "drizzle-orm";

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

  return loadPayoutHistory(sql`f.supervisor_id = ${supervisor.profile?.id}`);
}
